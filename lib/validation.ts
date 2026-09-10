import { z } from "zod";
export const inviteSchema = z
  .object({
    organization_id: z.string().uuid(),
    email: z.string().email().max(254),
    role: z.enum(["staff", "client"]),
    client_id: z.string().uuid().optional(),
  })
  .strict()
  .refine(
    (v) => (v.role === "client" ? !!v.client_id : !v.client_id),
    "Client invitations require a client; staff invitations cannot specify one",
  );
export function safeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120) || "file";
}
export function storagePath(org: string, project: string, name: string) {
  return `${org}/${project}/${crypto.randomUUID()}-${safeFilename(name)}`;
}
export function validUpload(file: { size: number; type: string }) {
  return (
    file.size <= 10 * 1024 * 1024 &&
    [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
      "text/plain",
    ].includes(file.type)
  );
}
