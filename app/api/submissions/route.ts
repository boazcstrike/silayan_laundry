import { NextResponse } from "next/server";
import { getAnalyticsDB, type SubmissionChannel } from "@/lib/services/AnalyticsDB";
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
    
    const db = getAnalyticsDB();
    const submissionId = db.recordSubmission(body.counts, {
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
    
    const db = getAnalyticsDB();
    
    if (type === 'summary') {
      const summary = db.getSummary();
      return NextResponse.json(summary);
    }
    
    if (type === 'channel-stats') {
      const stats = db.getChannelStats();
      return NextResponse.json(stats);
    }
    
    if (channel) {
      const submissions = db.getSubmissionsByChannel(channel, limit);
      return NextResponse.json(submissions);
    }
    
    const submissions = db.getRecentSubmissions(limit);
    return NextResponse.json(submissions);
  } catch (error) {
    console.error("Failed to fetch submissions:", error);
    return NextResponse.json(
      { error: "Failed to fetch submissions" },
      { status: 500 }
    );
  }
}
