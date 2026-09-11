"use client";
import { useEffect, useState } from "react";
import { MessageSquare, ArrowUpRight, RefreshCw, Send } from "lucide-react";
import { configured, browserDB } from "@/lib/supabase";
import { Row } from "@/lib/data";
import { InboxData, readInbox, saveInbox, whatsappLink } from "@/lib/demo";
export default function Communications({
  organizations,
  organizationId,
}: {
  organizations: Row[];
  organizationId?: string;
}) {
  const [data, setData] = useState<InboxData>({ inquiries: [], messages: [] }),
    [selected, setSelected] = useState(""),
    [filter, setFilter] = useState(organizationId || ""),
    [body, setBody] = useState(""),
    [error, setError] = useState("");
  async function load() {
    try {
      if (!configured) setData(readInbox());
      else {
        const db = browserDB();
        const [a, b] = await Promise.all([
          db
            .from("inquiries")
            .select("*")
            .order("created_at", { ascending: false }),
          db.from("inquiry_messages").select("*").order("created_at"),
        ]);
        if (a.error || b.error) throw a.error || b.error;
        setData({ inquiries: a.data || [], messages: b.data || [] });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the inbox");
    }
  }
  useEffect(() => {
    load();
    const update = () => load();
    window.addEventListener("storage", update);
    window.addEventListener("omnibuild-data", update);
    return () => {
      window.removeEventListener("storage", update);
      window.removeEventListener("omnibuild-data", update);
    };
  }, []);
  const leads = data.inquiries.filter(
    (i) =>
      (!filter || i.organization_id === filter) &&
      organizations.some((o) => o.id === i.organization_id),
  );
  const lead = leads.find((i) => i.id === selected) || leads[0];
  const messages = data.messages.filter((m) => m.inquiry_id === lead?.id);
  const company = organizations.find((o) => o.id === lead?.organization_id);
  async function stage(value: string) {
    try {
      if (!configured) {
        saveInbox({
          ...data,
          inquiries: data.inquiries.map((i) =>
            i.id === lead.id ? { ...i, stage: value } : i,
          ),
        });
      } else {
        const { error } = await browserDB()
          .from("inquiries")
          .update({ stage: value })
          .eq("id", lead.id)
          .eq("organization_id", lead.organization_id);
        if (error) throw error;
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update stage");
    }
  }
  return (
    <section className="inbox-area">
      <div className="section-heading">
        <div>
          <h2>WhatsApp inquiries</h2>
          <p className="subtle">
            Website visitors start here. Homeowner project messages stay in each
            contractor workspace.
          </p>
        </div>
        <div className="hub-actions">
          {!organizationId && (
            <select
              aria-label="Filter inquiries by contractor"
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
                setSelected("");
              }}
            >
              <option value="">All contractors</option>
              {organizations.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          )}
          <button
            className="icon-button"
            aria-label="Refresh inquiries"
            onClick={load}
          >
            <RefreshCw size={17} />
          </button>
        </div>
      </div>
      {error && (
        <p role="alert" className="auth-notice">
          {error}
        </p>
      )}
      <div className="messaging panel">
        <aside className="conversation-list">
          <h3>
            Incoming inquiries <span className="count">{leads.length}</span>
          </h3>
          {leads.map((i) => (
            <button
              className={
                "conversation " + (lead?.id === i.id ? "selected" : "")
              }
              key={i.id}
              onClick={() => setSelected(i.id)}
            >
              <span className="avatar">{i.name.slice(0, 2).toUpperCase()}</span>
              <span>
                <strong>{i.name}</strong>
                <small>
                  {organizations.find((o) => o.id === i.organization_id)?.name}
                </small>
                <small>{i.stage} · WhatsApp</small>
              </span>
            </button>
          ))}
        </aside>
        <div className="conversation-main">
          {lead ? (
            <>
              <div className="conversation-header">
                <MessageSquare size={23} />
                <div>
                  <strong>{lead.name}</strong>
                  <small>
                    {company?.name} · +{lead.phone}
                  </small>
                </div>
                <select
                  aria-label="Inquiry stage"
                  value={lead.stage}
                  onChange={(e) => stage(e.target.value)}
                >
                  {["New", "Contacted", "Consultation", "Closed"].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="message-scroll">
                {messages.map((m) => (
                  <div
                    className={
                      "message " + (m.direction === "outbound" ? "mine" : "")
                    }
                    key={m.id}
                  >
                    <span>
                      {m.direction === "inbound" ? lead.name : company?.name}
                    </span>
                    <p>{m.body}</p>
                    <small>{new Date(m.created_at).toLocaleString()}</small>
                  </div>
                ))}
              </div>
              {!configured ? (
                <form
                  className="composer"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!body.trim()) return;
                    saveInbox({
                      ...data,
                      messages: [
                        ...data.messages,
                        {
                          id: crypto.randomUUID(),
                          organization_id: lead.organization_id,
                          inquiry_id: lead.id,
                          body: body.trim(),
                          direction: "outbound",
                          created_at: new Date().toISOString(),
                        },
                      ],
                    });
                    setBody("");
                    load();
                  }}
                >
                  <p className="subtle">
                    Demo conversation — replies stay in this browser.
                  </p>
                  <div className="compose-input">
                    <textarea
                      aria-label="Demo WhatsApp reply"
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      placeholder="Show your client how a reply works…"
                      required
                      maxLength={5000}
                    />
                    <button
                      className="button primary"
                      aria-label="Save demo reply"
                    >
                      <Send size={17} />
                    </button>
                  </div>
                </form>
              ) : (
                <div className="composer">
                  <p className="subtle">
                    Reply in WhatsApp Business. This inbox receives verified
                    inbound messages; sending and sent-message sync are not
                    enabled.
                  </p>
                  <a
                    className="button"
                    href={whatsappLink(lead.phone, lead.name).split("?")[0]}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open WhatsApp <ArrowUpRight size={15} />
                  </a>
                </div>
              )}
            </>
          ) : (
            <div className="empty">
              <MessageSquare size={32} />
              <h3>Your next conversation starts on a contractor’s website.</h3>
              <p>
                Try the website’s WhatsApp demo to see an inquiry appear here.
              </p>
              <a
                className="button"
                href={`/demo/contractor/${organizations.find((o) => !filter || o.id === filter)?.slug || "westwood-adu"}`}
              >
                Open contractor demo
                <ArrowUpRight size={15} />
              </a>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
