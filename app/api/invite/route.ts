import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { serverDB } from "@/lib/server";
import { inviteSchema } from "@/lib/validation";
export async function POST(request: NextRequest) {
  // Next.js may normalize nextUrl's hostname. Compare against the configured
  // public origin, or the actual Host header for local development.
  const expectedOrigin = process.env.NEXT_PUBLIC_SITE_URL
    ? new URL(process.env.NEXT_PUBLIC_SITE_URL).origin
    : `${request.nextUrl.protocol}//${request.headers.get("host")}`;
  if (request.headers.get("origin") !== expectedOrigin)
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const input = inviteSchema.safeParse(await request.json().catch(() => null));
  if (!input.success)
    return NextResponse.json({ error: "Invalid invitation" }, { status: 400 });
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
    return NextResponse.json(
      { error: "Connect Supabase to send invitations" },
      { status: 503 },
    );
  const db = await serverDB();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { data: isOwner } = await db.rpc("is_owner", {
    org: input.data.organization_id,
  });
  if (!isOwner)
    return NextResponse.json(
      {
        error:
          "Only organization owners or Omnibuild administrators can invite users",
      },
      { status: 403 },
    );
  if (input.data.client_id) {
    const { data: client } = await db
      .from("clients")
      .select("email,archived")
      .eq("id", input.data.client_id)
      .eq("organization_id", input.data.organization_id)
      .single();
    if (
      !client ||
      client.archived ||
      client.email.toLowerCase() !== input.data.email.toLowerCase()
    )
      return NextResponse.json(
        { error: "Client does not match invitation" },
        { status: 400 },
      );
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY)
    return NextResponse.json(
      { error: "Email invitations require the server invitation key" },
      { status: 503 },
    );
  const { data: inv, error } = await db
    .from("invitations")
    .insert(input.data)
    .select("id")
    .single();
  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  let { error: sendError } = await admin.auth.admin.inviteUserByEmail(
    input.data.email,
    {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin}/auth/callback`,
    },
  );
  if (
    sendError?.code === "email_exists" ||
    sendError?.code === "user_already_exists"
  ) {
    const result = await admin.auth.signInWithOtp({
      email: input.data.email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin}/auth/callback`,
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
