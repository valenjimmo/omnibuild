import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

test("PostgreSQL tenant isolation, homeowner authorization, storage paths, and payload attacks", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
 create role authenticated;
 create schema auth; create schema storage; create schema extensions;
 create table auth.users(id uuid primary key,email text);
 create function auth.uid() returns uuid language sql stable as $$ select (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid $$;
 create function auth.jwt() returns jsonb language sql stable as $$ select nullif(current_setting('request.jwt.claims',true),'')::jsonb $$;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
 alter table storage.objects enable row level security;
 grant usage on schema public,auth,storage,extensions to authenticated;
 grant all on storage.objects to authenticated;
 -- Minimal pgTAP-compatible assertions. Queries and RLS run in real embedded PostgreSQL.
 create function public.no_plan() returns text language sql as $$select 'TAP version 13'::text$$;
 create function public.is(actual integer,expected integer,label text) returns text language plpgsql as $$begin if actual is distinct from expected then raise exception 'FAIL: % (got %, expected %)',label,actual,expected; end if; return 'ok - '||label; end$$;
 create function public.throws_ok(statement text,expected text,unused text,label text) returns text language plpgsql as $$declare caught text; begin begin execute statement; exception when others then get stacked diagnostics caught=returned_sqlstate; end; if caught is distinct from expected then raise exception 'FAIL: % (got SQLSTATE %, expected %)',label,caught,expected; end if; return 'ok - '||label; end$$;
 create function public.lives_ok(statement text,label text) returns text language plpgsql as $$begin execute statement; return 'ok - '||label; end$$;
 create function public.finish() returns setof text language sql as $$select 'Tests complete'::text$$;
 `);
    for (const file of readdirSync("supabase/migrations").sort())
      await db.exec(
        readFileSync("supabase/migrations/" + file, "utf8").replace(
          "create extension if not exists pgcrypto;",
          "",
        ),
      );
    const suite = readFileSync(
      "supabase/tests/security.test.sql",
      "utf8",
    ).replace(
      "create extension if not exists pgtap with schema extensions;",
      "",
    );
    const results = await db.exec(suite);
    const assertions = results
      .flatMap((r) => r.rows)
      .flatMap((r) => Object.values(r))
      .filter((v) => typeof v === "string" && v.startsWith("ok -"));
    assert.ok(
      assertions.length >= 40,
      `Expected at least 40 database assertions, got ${assertions.length}`,
    );
    console.log(
      `Verified ${assertions.length} PostgreSQL security assertions.`,
    );
  } finally {
    await db.close();
  }
});
