import { NextRequest, NextResponse } from "next/server";
import { serverDB } from "@/lib/server";
export async function GET(request: NextRequest) {
  const hash = request.nextUrl.searchParams.get("token_hash"),
    type = request.nextUrl.searchParams.get("type");
  if (
    hash &&
    (type === "invite" ||
      type === "signup" ||
      type === "recovery" ||
      type === "email")
  ) {
    const db = await serverDB();
    const { error } = await db.auth.verifyOtp({ token_hash: hash, type });
    if (!error)
      return NextResponse.redirect(
        new URL(
          type === "invite" || type === "recovery" ? "/auth/password" : "/",
          request.url,
        ),
      );
  }
  return NextResponse.redirect(new URL("/?auth=error", request.url));
}
