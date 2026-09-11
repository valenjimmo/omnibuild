import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { parseWhatsApp, verifyMetaSignature } from "../lib/whatsapp";
import { whatsappLink } from "../lib/demo";
const payload = {
  object: "whatsapp_business_account",
  entry: [
    {
      changes: [
        {
          field: "messages",
          value: {
            metadata: { phone_number_id: "123456" },
            contacts: [{ wa_id: "14155550100", profile: { name: "Alex" } }],
            messages: [
              {
                id: "wamid.test",
                from: "14155550100",
                timestamp: "1789070400",
                type: "text",
                text: { body: "I would like an ADU" },
              },
            ],
          },
        },
      ],
    },
  ],
};
test("Meta signature requires the exact raw body and application secret", () => {
  const body = JSON.stringify(payload);
  const signature =
    "sha256=" + createHmac("sha256", "secret").update(body).digest("hex");
  assert.equal(verifyMetaSignature(body, signature, "secret"), true);
  assert.equal(verifyMetaSignature(body + " ", signature, "secret"), false);
  assert.equal(verifyMetaSignature(body, signature, "wrong"), false);
  assert.equal(verifyMetaSignature(body, null, "secret"), false);
  assert.equal(verifyMetaSignature(body, "sha256=bad", "secret"), false);
});
test("Inbound messages resolve tenant routing from the receiving Meta phone ID", () => {
  const [m] = parseWhatsApp(payload);
  assert.equal(m.phone_number_id, "123456");
  assert.equal(m.phone, "14155550100");
  assert.equal(m.name, "Alex");
  assert.equal(m.body, "I would like an ADU");
  assert.equal(m.provider_id, "wamid.test");
  assert.equal("organization_id" in m, false);
});
test("Malformed webhook objects and unsupported sender IDs are rejected", () => {
  assert.throws(() => parseWhatsApp({ object: "other", entry: [] }));
  const clone = structuredClone(payload);
  clone.entry[0].changes[0].value.messages[0].from = "../other-tenant";
  assert.throws(() => parseWhatsApp(clone));
});
test("QR links use international numbers and URL-encoded prefilled text", () => {
  assert.equal(whatsappLink("", "Westwood"), "");
  assert.equal(whatsappLink("123", "Westwood"), "");
  assert.ok(
    whatsappLink("+1 (415) 555-0100", "Westwood & Sons").startsWith(
      "https://wa.me/14155550100?text=",
    ),
  );
  assert.ok(
    whatsappLink("+1 (415) 555-0100", "Westwood & Sons").includes(
      "Westwood%20%26%20Sons",
    ),
  );
});
