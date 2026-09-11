import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
export function verifyMetaSignature(
  raw: string,
  signature: string | null,
  secret: string,
) {
  if (!secret || !signature || !/^sha256=[a-f0-9]{64}$/i.test(signature))
    return false;
  const expected = createHmac("sha256", secret).update(raw).digest();
  const supplied = Buffer.from(signature.slice(7), "hex");
  return (
    supplied.length === expected.length && timingSafeEqual(expected, supplied)
  );
}
const messageSchema = z.object({
  id: z.string().min(1).max(500),
  from: z.string().regex(/^[1-9]\d{7,14}$/),
  timestamp: z.string().regex(/^\d{1,12}$/),
  type: z.string().max(50),
  text: z.object({ body: z.string().max(10000) }).optional(),
});
const payloadSchema = z.object({
  object: z.literal("whatsapp_business_account"),
  entry: z
    .array(
      z.object({
        changes: z
          .array(
            z.object({
              field: z.string(),
              value: z.object({
                metadata: z
                  .object({ phone_number_id: z.string().regex(/^\d+$/) })
                  .optional(),
                contacts: z
                  .array(
                    z.object({
                      wa_id: z.string(),
                      profile: z.object({ name: z.string().max(200) }),
                    }),
                  )
                  .optional(),
                messages: z.array(messageSchema).max(100).optional(),
              }),
            }),
          )
          .max(100),
      }),
    )
    .max(100),
});
export function parseWhatsApp(raw: unknown) {
  const payload = payloadSchema.parse(raw);
  return payload.entry.flatMap((entry) =>
    entry.changes.flatMap(({ field, value }) =>
      field === "messages"
        ? (value.messages || []).map((message) => {
            if (!value.metadata)
              throw new Error("Missing receiving phone number");
            return {
              phone_number_id: value.metadata.phone_number_id,
              provider_id: message.id,
              phone: message.from,
              name:
                value.contacts?.find((c) => c.wa_id === message.from)?.profile
                  .name || message.from,
              body:
                message.type === "text"
                  ? message.text?.body || "[Empty text message]"
                  : `[${message.type} message — open WhatsApp to view]`,
              sent_at: new Date(Number(message.timestamp) * 1000).toISOString(),
            };
          })
        : [],
    ),
  );
}
