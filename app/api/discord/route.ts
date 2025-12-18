import { NextResponse } from "next/server";

export const runtime = "nodejs";

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
