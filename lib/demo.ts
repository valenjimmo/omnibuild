import { demoData, Dataset, Row } from "./data";
export const DEMO_KEY = "omnibuild-demo-v1";
export function readDemo(): Dataset {
  const fresh = demoData();
  try {
    const raw = localStorage.getItem(DEMO_KEY);
    return raw ? { ...fresh, ...JSON.parse(raw) } : fresh;
  } catch {
    return fresh;
  }
}
export function saveDemo(data: Dataset) {
  localStorage.setItem(DEMO_KEY, JSON.stringify(data));
  window.dispatchEvent(new Event("omnibuild-data"));
}
export type InboxData = { inquiries: Row[]; messages: Row[] };
export function readInbox(): InboxData {
  try {
    return JSON.parse(
      localStorage.getItem("omnibuild-inbox-v1") ||
        '{"inquiries":[],"messages":[]}',
    );
  } catch {
    return { inquiries: [], messages: [] };
  }
}
export function saveInbox(data: InboxData) {
  localStorage.setItem("omnibuild-inbox-v1", JSON.stringify(data));
  window.dispatchEvent(new Event("omnibuild-data"));
}
export function addDemoInquiry(
  orgId: string,
  name: string,
  phone: string,
  body: string,
) {
  const data = readInbox();
  let lead = data.inquiries.find(
    (i) => i.organization_id === orgId && i.phone === phone,
  );
  if (!lead) {
    lead = {
      id: crypto.randomUUID(),
      organization_id: orgId,
      name,
      phone,
      stage: "New",
      source: "Website · WhatsApp demo",
      created_at: new Date().toISOString(),
    };
    data.inquiries.push(lead);
  }
  data.messages.push({
    id: crypto.randomUUID(),
    organization_id: orgId,
    inquiry_id: lead.id,
    body,
    direction: "inbound",
    created_at: new Date().toISOString(),
  });
  saveInbox(data);
  return lead.id;
}
export function whatsappLink(phone: string, name: string) {
  const digits = phone.replace(/[^0-9]/g, "");
  return /^[1-9]\d{7,14}$/.test(digits)
    ? `https://wa.me/${digits}?text=${encodeURIComponent(`Hi ${name}, I'm interested in an ADU. I found you through your website.`)}`
    : "";
}
