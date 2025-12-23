/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Integration Test: Discord Submission with Randomized Item Counts
 * 
 * This script supports three test scenarios:
 * 1. ALL - All items have values (1-30)
 * 2. SPARSE - Less than 10 items have values
 * 3. RANDOM - Random number of items have values
 * 
 * Run with:
 *   npx tsx scripts/test-discord-submission.ts all
 *   npx tsx scripts/test-discord-submission.ts sparse
 *   npx tsx scripts/test-discord-submission.ts random
 *   npx tsx scripts/test-discord-submission.ts        # runs all three scenarios
 *   npx tsx scripts/test-discord-submission.ts stats  # show analytics summary
 * 
 * Make sure DISCORD_WEBHOOK_URL is set in your .env file or environment
 */

import * as path from 'path';
import * as dotenv from 'dotenv';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import categories from '../app/assets/data/list';
import type { ItemCounts, LaundryCategory } from '../lib/types/laundry';
import { getAnalyticsDB, closeAnalyticsDB } from '../lib/services/AnalyticsDB';

// Load environment variables from .env file
dotenv.config();

// Configuration
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const MAX_RANDOM_COUNT = 30;

// Test scenario types
type TestScenario = 'all' | 'sparse' | 'random';

interface ScenarioConfig {
  name: string;
  description: string;
  minItemsWithValue: number;
  maxItemsWithValue: number;
}

const SCENARIOS: Record<TestScenario, ScenarioConfig> = {
  all: {
    name: 'ALL ITEMS',
    description: 'All items have values (1-30)',
    minItemsWithValue: 36, // All 36 items
    maxItemsWithValue: 36,
  },
  sparse: {
    name: 'SPARSE',
    description: 'Less than 10 items have values',
    minItemsWithValue: 1,
    maxItemsWithValue: 9,
  },
  random: {
    name: 'RANDOM',
    description: 'Random number of items have values',
    minItemsWithValue: 1,
    maxItemsWithValue: 36,
  },
};

/**
 * Get all item names from categories
 */
function getAllItemNames(cats: LaundryCategory): string[] {
  const items: string[] = [];
  Object.values(cats).forEach(categoryItems => {
    categoryItems.forEach(item => items.push(item.name));
  });
  return items;
}

/**
 * Shuffle an array in place (Fisher-Yates)
 */
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Generate counts based on scenario
 */
function generateCountsForScenario(
  cats: LaundryCategory,
  scenario: TestScenario
): ItemCounts {
  const counts: ItemCounts = {};
  const allItems = getAllItemNames(cats);
  const config = SCENARIOS[scenario];
  
  // Initialize all items to 0
  allItems.forEach(name => {
    counts[name] = 0;
  });
  
  // Determine how many items should have values
  const targetItemCount = Math.floor(
    Math.random() * (config.maxItemsWithValue - config.minItemsWithValue + 1)
  ) + config.minItemsWithValue;
  
  // Shuffle items and pick the target number
  const shuffledItems = shuffleArray(allItems);
  const itemsWithValues = shuffledItems.slice(0, targetItemCount);
  
  // Assign random values (1 to MAX) to selected items
  itemsWithValues.forEach(name => {
    counts[name] = Math.floor(Math.random() * MAX_RANDOM_COUNT) + 1;
  });
  
  return counts;
}

/**
 * Format counts for console output
 */
function formatCountsReport(
  counts: ItemCounts,
  cats: LaundryCategory,
  scenario: TestScenario
): string {
  const config = SCENARIOS[scenario];
  const nonZeroCount = Object.values(counts).filter(c => c > 0).length;
  
  const lines: string[] = [];
  lines.push('='.repeat(60));
  lines.push(`SCENARIO: ${config.name}`);
  lines.push(`${config.description}`);
  lines.push(`Items with values: ${nonZeroCount}/36`);
  lines.push('='.repeat(60));
  
  Object.entries(cats).forEach(([categoryName, items]) => {
    lines.push(`\n📁 ${categoryName}:`);
    lines.push('-'.repeat(40));
    items.forEach(item => {
      const count = counts[item.name] || 0;
      const marker = count === 0 ? ' (empty)' : '';
      lines.push(`  ${item.name.padEnd(30)} : ${count}${marker}`);
    });
  });
  
  lines.push('\n' + '='.repeat(60));
  return lines.join('\n');
}

/**
 * Generate PNG image with counts overlaid on template
 */
async function generatePNGImage(counts: ItemCounts): Promise<Buffer> {
  const templatePath = path.join(process.cwd(), 'public', 'template.jpg');
  const template = await loadImage(templatePath);
  
  const canvas = createCanvas(template.width, template.height);
  const ctx = canvas.getContext('2d');
  
  ctx.drawImage(template, 0, 0);
  
  ctx.fillStyle = 'black';
  ctx.font = '32px Arial';
  
  const today = new Date().toLocaleDateString('en-US');
  ctx.fillText(today, 250, 250);
  
  Object.entries(categories).forEach(([, categoryItems]) => {
    categoryItems.forEach(item => {
      const count = counts[item.name] || 0;
      if (count > 0) {
        ctx.fillText(String(count), item.x, item.y);
      }
    });
  });
  
  try {
    const signaturePath = path.join(process.cwd(), 'public', 'signature_bo.png');
    const signature = await loadImage(signaturePath);
    ctx.drawImage(
      signature,
      735,
      1098,
      signature.width * 0.55,
      signature.height * 0.55
    );
    ctx.fillText(today, 850, 1214);
  } catch {
    console.warn('⚠️  Signature image not found, continuing without it');
  }
  
  return canvas.toBuffer('image/png');
}

/**
 * Upload image to Discord
 */
async function uploadToDiscord(
  imageBuffer: Buffer,
  message: string
): Promise<{ success: boolean; error?: string }> {
  if (!DISCORD_WEBHOOK_URL) {
    return {
      success: false,
      error: 'DISCORD_WEBHOOK_URL environment variable is not set',
    };
  }
  
  const timestamp = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15);
  const filename = `laundry-test-${timestamp}.png`;
  
  const formData = new FormData();
  const uint8Array = new Uint8Array(imageBuffer);
  const blob = new Blob([uint8Array], { type: 'image/png' });
  const file = new File([blob], filename, { type: 'image/png' });
  
  formData.append('payload_json', JSON.stringify({ content: message }));
  formData.append('files[0]', file, filename);
  
  const response = await fetch(DISCORD_WEBHOOK_URL, {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    return {
      success: false,
      error: `Discord API error (${response.status}): ${errorText}`,
    };
  }
  
  return { success: true };
}

/**
 * Assert and report results for a scenario
 */
function assertResults(
  counts: ItemCounts,
  uploadResult: { success: boolean; error?: string },
  scenario: TestScenario
): boolean {
  const config = SCENARIOS[scenario];
  const nonZeroCount = Object.values(counts).filter(c => c > 0).length;
  
  console.log('\n' + '-'.repeat(40));
  console.log(`ASSERTIONS for ${config.name}:`);
  
  // Check items count
  const itemCount = Object.keys(counts).length;
  if (itemCount !== 36) {
    console.error(`❌ Expected 36 items, got ${itemCount}`);
    return false;
  }
  console.log(`✅ Total items: ${itemCount}/36`);
  
  // Check non-zero count is within scenario bounds
  if (nonZeroCount < config.minItemsWithValue || nonZeroCount > config.maxItemsWithValue) {
    console.error(
      `❌ Expected ${config.minItemsWithValue}-${config.maxItemsWithValue} items with values, got ${nonZeroCount}`
    );
    return false;
  }
  console.log(`✅ Items with values: ${nonZeroCount} (expected: ${config.minItemsWithValue}-${config.maxItemsWithValue})`);
  
  // Check all counts are within valid range
  const outOfRange = Object.entries(counts).filter(
    ([, count]) => count < 0 || count > MAX_RANDOM_COUNT
  );
  if (outOfRange.length > 0) {
    console.error(`❌ Some counts out of range [0-${MAX_RANDOM_COUNT}]`);
    return false;
  }
  console.log(`✅ All counts within range [0-${MAX_RANDOM_COUNT}]`);
  
  // Check Discord upload
  if (!uploadResult.success) {
    console.error(`❌ Discord upload failed: ${uploadResult.error}`);
    return false;
  }
  console.log('✅ Discord upload successful');
  
  return true;
}

/**
 * Run a single test scenario
 */
async function runScenario(scenario: TestScenario): Promise<boolean> {
  const config = SCENARIOS[scenario];
  const analytics = getAnalyticsDB();
  
  console.log('\n' + '🧪'.repeat(30));
  console.log(`\n🧪 RUNNING SCENARIO: ${config.name}\n`);
  
  // Generate counts
  console.log('📊 Generating counts...');
  const counts = generateCountsForScenario(categories, scenario);
  console.log(formatCountsReport(counts, categories, scenario));
  
  // Generate image
  console.log('\n🖼️  Generating PNG image...');
  let imageBuffer: Buffer;
  try {
    imageBuffer = await generatePNGImage(counts);
    console.log('✅ PNG image generated');
  } catch (error) {
    console.error('❌ Image generation failed:', error);
    return false;
  }
  
  // Upload to Discord
  console.log('\n📤 Uploading to Discord...');
  const timestamp = new Date().toLocaleString('en-US');
  const nonZeroCount = Object.values(counts).filter(c => c > 0).length;
  const message = `🧪 **Test: ${config.name}** (${timestamp})\n\n${config.description}\nItems with values: ${nonZeroCount}/36`;
  
  const uploadResult = await uploadToDiscord(imageBuffer, message);
  
  // Record submission to analytics
  console.log('\n📊 Recording analytics...');
  const submissionId = analytics.recordSubmission(counts, {
    channel: 'discord',
    scenario,
    channelSuccess: uploadResult.success,
  });
  console.log(`✅ Recorded submission #${submissionId}`);
  
  // Assert results
  const passed = assertResults(counts, uploadResult, scenario);
  
  if (passed) {
    console.log(`\n✅ SCENARIO ${config.name} PASSED`);
  } else {
    console.log(`\n❌ SCENARIO ${config.name} FAILED`);
  }
  
  return passed;
}

/**
 * Display analytics summary
 */
function showStats(): void {
  console.log('\n' + '='.repeat(60));
  console.log('📊 ANALYTICS SUMMARY');
  console.log('='.repeat(60));
  
  const analytics = getAnalyticsDB();
  const summary = analytics.getSummary();
  
  console.log(`\n📈 Overview:`);
  console.log(`  Total submissions:     ${summary.totalSubmissions}`);
  console.log(`  Successful uploads:    ${summary.successfulSubmissions}`);
  console.log(`  Failed uploads:        ${summary.failedSubmissions}`);
  console.log(`  Avg items/submission:  ${summary.averageItemsPerSubmission}`);
  
  if (summary.mostFrequentItems.length > 0) {
    console.log(`\n🏆 Most Frequent Items:`);
    summary.mostFrequentItems.forEach((item, i) => {
      console.log(`  ${i + 1}. ${item.name.padEnd(25)} - ${item.totalCount} total (${item.frequency} submissions)`);
    });
  }
  
  if (summary.recentSubmissions.length > 0) {
    console.log(`\n📅 Recent Submissions:`);
    summary.recentSubmissions.forEach(sub => {
      const status = sub.channel_success ? '✅' : '❌';
      const scenario = sub.scenario ? ` [${sub.scenario}]` : '';
      const channel = sub.channel ? ` via ${sub.channel}` : '';
      console.log(`  ${status} ${sub.timestamp}${scenario}${channel} - ${sub.items_with_values} items`);
    });
  } else {
    console.log('\n📭 No submissions recorded yet.');
  }
  
  console.log('\n' + '='.repeat(60));
  closeAnalyticsDB();
}

/**
 * Main test function
 */
async function runTest(): Promise<void> {
  const args = process.argv.slice(2);
  const validScenarios: TestScenario[] = ['all', 'sparse', 'random'];
  
  // Handle stats command
  if (args[0]?.toLowerCase() === 'stats') {
    showStats();
    return;
  }
  
  // Determine which scenarios to run
  let scenariosToRun: TestScenario[];
  
  if (args.length === 0) {
    // Run all scenarios
    scenariosToRun = validScenarios;
    console.log('\n🧪 Running ALL test scenarios...\n');
  } else {
    const requestedScenario = args[0].toLowerCase() as TestScenario;
    if (!validScenarios.includes(requestedScenario)) {
      console.error(`❌ Invalid scenario: ${args[0]}`);
      console.error(`Valid options: ${validScenarios.join(', ')}, stats`);
      process.exit(1);
    }
    scenariosToRun = [requestedScenario];
  }
  
  // Run scenarios
  const results: { scenario: TestScenario; passed: boolean }[] = [];
  
  for (const scenario of scenariosToRun) {
    const passed = await runScenario(scenario);
    results.push({ scenario, passed });
    
    // Add delay between scenarios to avoid Discord rate limiting
    if (scenariosToRun.length > 1 && scenario !== scenariosToRun[scenariosToRun.length - 1]) {
      console.log('\n⏳ Waiting 2 seconds before next scenario...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  // Close analytics DB
  closeAnalyticsDB();
  
  // Final summary
  console.log('\n' + '='.repeat(60));
  console.log('FINAL SUMMARY');
  console.log('='.repeat(60));
  
  results.forEach(({ scenario, passed }) => {
    const status = passed ? '✅ PASSED' : '❌ FAILED';
    console.log(`  ${SCENARIOS[scenario].name.padEnd(15)} : ${status}`);
  });
  
  const allPassed = results.every(r => r.passed);
  console.log('\n' + '='.repeat(60));
  
  if (allPassed) {
    console.log('🎉 ALL SCENARIOS PASSED');
    console.log('📱 Please check Discord to verify all images match the counts above.\n');
  } else {
    console.log('❌ SOME SCENARIOS FAILED');
    process.exit(1);
  }
}

// Run the test
runTest().catch(error => {
  console.error('❌ Test failed with error:', error);
  process.exit(1);
});
