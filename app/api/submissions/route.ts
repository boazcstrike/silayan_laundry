import { NextResponse } from "next/server";
import { getAnalyticsStore } from "@/lib/services/analytics";
import type { SubmissionChannel } from "@/lib/services/AnalyticsDB";
import type { ItemCounts } from "@/lib/types/laundry";

export const runtime = "nodejs";

/**
 * Request body for recording a submission
 */
interface RecordSubmissionBody {
  counts: ItemCounts;
  channel: SubmissionChannel;
  customerReference?: string;
  channelSuccess?: boolean;
}

/**
 * POST /api/submissions
 * Record a new submission to the database
 */
export async function POST(req: Request) {
  try {
    const body = await req.json() as RecordSubmissionBody;
    
    // Validate required fields
    if (!body.counts || typeof body.counts !== 'object') {
      return NextResponse.json(
        { error: "Missing or invalid 'counts' field" },
        { status: 400 }
      );
    }
    
    if (!body.channel) {
      return NextResponse.json(
        { error: "Missing 'channel' field" },
        { status: 400 }
      );
    }
    
    const validChannels: SubmissionChannel[] = ['download', 'discord', 'whatsapp', 'viber', 'messenger'];
    if (!validChannels.includes(body.channel)) {
      return NextResponse.json(
        { error: `Invalid channel. Must be one of: ${validChannels.join(', ')}` },
        { status: 400 }
      );
    }
    
    const store = getAnalyticsStore();
    const submissionId = await store.recordSubmission(body.counts, {
      channel: body.channel,
      customerReference: body.customerReference,
      channelSuccess: body.channelSuccess ?? true,
    });
    
    return NextResponse.json({ 
      ok: true, 
      submissionId 
    });
  } catch (error) {
    console.error("Failed to record submission:", error);
    return NextResponse.json(
      { error: "Failed to record submission" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/submissions
 * Get recent submissions or summary
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'recent';
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const channel = searchParams.get('channel') as SubmissionChannel | null;
    
    const store = getAnalyticsStore();

    if (type === 'summary') {
      const summary = await store.getSummary();
      return NextResponse.json(summary);
    }

    if (type === 'channel-stats') {
      const stats = await store.getChannelStats();
      return NextResponse.json(stats);
    }

    if (type === 'history') {
      const rawLimit = parseInt(searchParams.get('limit') || '20', 10);
      const rawOffset = parseInt(searchParams.get('offset') || '0', 10);
      const historyLimit = Number.isFinite(rawLimit)
        ? Math.min(100, Math.max(1, rawLimit))
        : 20;
      const historyOffset = Number.isFinite(rawOffset) ? Math.max(0, rawOffset) : 0;

      // Fetch one extra row to learn whether another page exists.
      const fetched = await store.getRecentSubmissions(historyLimit + 1, historyOffset);
      const submissions = fetched.slice(0, historyLimit);

      return NextResponse.json({
        submissions,
        limit: historyLimit,
        offset: historyOffset,
        hasMore: fetched.length > historyLimit,
      });
    }

    if (channel) {
      const submissions = await store.getSubmissionsByChannel(channel, limit);
      return NextResponse.json(submissions);
    }

    const submissions = await store.getRecentSubmissions(limit);
    return NextResponse.json(submissions);
  } catch (error) {
    console.error("Failed to fetch submissions:", error);
    return NextResponse.json(
      { error: "Failed to fetch submissions" },
      { status: 500 }
    );
  }
}
