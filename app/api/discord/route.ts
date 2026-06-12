import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * GET /api/discord
 * Returns the Discord webhook configuration status.
 * Used by the client to warn users before attempting upload.
 */
export async function GET() {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  const configured = !!webhookUrl;
  const validUrl = configured ? isValidWebhookUrl(webhookUrl) : false;

  return NextResponse.json({ configured, validUrl });
}

function isValidWebhookUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname === "discord.com" &&
      parsed.pathname.startsWith("/api/webhooks/")
    );
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    return NextResponse.json(
      { error: "DISCORD_WEBHOOK_URL is not set" },
      { status: 500 }
    );
  }

  let incoming: FormData;
  try {
    incoming = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected multipart/form-data" },
      { status: 400 }
    );
  }

  const file = incoming.get("file");
  const message = (incoming.get("message") ?? "").toString();

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Missing 'file' upload" },
      { status: 400 }
    );
  }

  const discordForm = new FormData();
  discordForm.append(
    "payload_json",
    JSON.stringify({ content: message || "Laundry submission" })
  );
  discordForm.append("files[0]", file, file.name || "laundry.png");

  const discordRes = await fetch(webhookUrl, {
    method: "POST",
    body: discordForm,
  });

  if (!discordRes.ok) {
    const body = await discordRes.text().catch(() => "");
    return NextResponse.json(
      {
        error: "Discord webhook request failed",
        status: discordRes.status,
        body,
      },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
