import { test } from "node:test";
import assert from "node:assert/strict";
import {
  inviteSchema,
  safeFilename,
  storagePath,
  validUpload,
} from "../lib/validation";
const org = "11111111-1111-4111-8111-111111111111",
  project = "22222222-2222-4222-8222-222222222222";
test("invitation payloads reject elevated roles and unknown fields", () => {
  assert.equal(
    inviteSchema.safeParse({
      organization_id: org,
      email: "owner@example.com",
      role: "owner",
    }).success,
    false,
  );
  assert.equal(
    inviteSchema.safeParse({
      organization_id: org,
      email: "staff@example.com",
      role: "staff",
      user_id: "attacker",
    }).success,
    false,
  );
});
test("client invitations require valid tenant and client UUIDs", () => {
  assert.equal(
    inviteSchema.safeParse({
      organization_id: "other-org",
      email: "a@example.com",
      role: "client",
      client_id: project,
    }).success,
    false,
  );
  assert.equal(
    inviteSchema.safeParse({
      organization_id: org,
      email: "a@example.com",
      role: "client",
    }).success,
    false,
  );
  assert.equal(
    inviteSchema.safeParse({
      organization_id: org,
      email: "a@example.com",
      role: "client",
      client_id: project,
    }).success,
    true,
  );
});
test("staff invitations cannot smuggle a client binding", () =>
  assert.equal(
    inviteSchema.safeParse({
      organization_id: org,
      email: "a@example.com",
      role: "staff",
      client_id: project,
    }).success,
    false,
  ));
test("storage filenames cannot escape tenant and project folders", () => {
  const path = storagePath(org, project, "../../other-tenant/private file.pdf");
  assert.equal(path.split("/").length, 3);
  assert.ok(path.startsWith(`${org}/${project}/`));
  assert.ok(!safeFilename("a/b\\c").includes("/"));
});
test("upload limits reject executable content and oversized files", () => {
  assert.equal(validUpload({ type: "text/html", size: 30 }), false);
  assert.equal(validUpload({ type: "image/svg+xml", size: 30 }), false);
  assert.equal(validUpload({ type: "application/pdf", size: 10485761 }), false);
  assert.equal(validUpload({ type: "image/png", size: 10485760 }), true);
});
