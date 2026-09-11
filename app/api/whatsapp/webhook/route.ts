import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { parseWhatsApp, verifyMetaSignature } from "@/lib/whatsapp";
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  if (!process.env.WHATSAPP_VERIFY_TOKEN)
    return new NextResponse("WhatsApp not configured", { status: 503 });
  if (
    q.get("hub.mode") === "subscribe" &&
    q.get("hub.verify_token") === process.env.WHATSAPP_VERIFY_TOKEN
  )
    return new NextResponse(q.get("hub.challenge") || "");
  return new NextResponse("Verification failed", { status: 403 });
}
export async function POST(request: NextRequest) {
  if (
    !process.env.WHATSAPP_APP_SECRET ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY ||
    !process.env.NEXT_PUBLIC_SUPABASE_URL
  )
    return NextResponse.json(
      { error: "WhatsApp not configured" },
      { status: 503 },
    );
  if (Number(request.headers.get("content-length") || 0) > 1048576)
    return new NextResponse(null, { status: 413 });
  const reader = request.body?.getReader();
  if (!reader) return new NextResponse(null, { status: 400 });
  const parts: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 1048576) {
      await reader.cancel();
      return new NextResponse(null, { status: 413 });
    }
    parts.push(value);
  }
  const raw = Buffer.concat(parts).toString("utf8");
  if (
    !verifyMetaSignature(
      raw,
      request.headers.get("x-hub-signature-256"),
      process.env.WHATSAPP_APP_SECRET,
    )
  )
    return new NextResponse("Invalid signature", { status: 401 });
  let messages;
  try {
    messages = parseWhatsApp(JSON.parse(raw));
  } catch {
    return new NextResponse("Invalid payload", { status: 400 });
  }
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  );
  for (const m of messages) {
    const { error } = await db.rpc("ingest_whatsapp", {
      receiving_phone_id: m.phone_number_id,
      message_id: m.provider_id,
      sender_phone: m.phone,
      sender_name: m.name,
      message_body: m.body,
      sent_at: m.sent_at,
    });
    if (error)
      return NextResponse.json(
        { error: "Unable to persist event; retry required" },
        { status: 500 },
      );
  }
  return NextResponse.json({ received: true });
}
