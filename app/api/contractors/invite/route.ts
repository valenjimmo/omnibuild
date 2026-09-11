import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { serverDB } from "@/lib/server";
const schema = z
  .object({ organization_id: z.string().uuid(), email: z.string().email() })
  .strict();
export async function POST(request: NextRequest) {
  const origin = process.env.NEXT_PUBLIC_SITE_URL
    ? new URL(process.env.NEXT_PUBLIC_SITE_URL).origin
    : `${request.nextUrl.protocol}//${request.headers.get("host")}`;
  if (request.headers.get("origin") !== origin)
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid contractor invitation" },
      { status: 400 },
    );
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  )
    return NextResponse.json(
      { error: "Connect Supabase and email delivery first" },
      { status: 503 },
    );
  const db = await serverDB();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { data: admin } = await db.rpc("is_platform_admin");
  if (!admin)
    return NextResponse.json(
      { error: "Omnibuild administrator required" },
      { status: 403 },
    );
  const { data: org } = await db
    .from("organizations")
    .select("id,contact_email")
    .eq("id", parsed.data.organization_id)
    .single();
  if (
    !org ||
    org.contact_email.toLowerCase() !== parsed.data.email.toLowerCase()
  )
    return NextResponse.json(
      { error: "The email must match the contractor account owner email" },
      { status: 400 },
    );
  const { data: inv, error } = await db
    .from("invitations")
    .insert({ ...parsed.data, role: "owner" })
    .select("id")
    .single();
  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });
  const auth = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  let { error: sendError } = await auth.auth.admin.inviteUserByEmail(
    parsed.data.email,
    { redirectTo: `${origin}/auth/callback` },
  );
  if (
    sendError?.code === "email_exists" ||
    sendError?.code === "user_already_exists"
  ) {
    const result = await auth.auth.signInWithOtp({
      email: parsed.data.email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${origin}/auth/callback`,
      },
    });
    sendError = result.error;
  }
  if (sendError) {
    await db.from("invitations").delete().eq("id", inv.id);
    return NextResponse.json({ error: sendError.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
