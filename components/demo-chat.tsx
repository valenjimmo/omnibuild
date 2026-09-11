"use client";
import { useEffect, useState } from "react";
import { ArrowLeft, CheckCheck, MessageCircle, Send } from "lucide-react";
import { addDemoInquiry, readDemo } from "@/lib/demo";
import { Row } from "@/lib/data";
import { configured } from "@/lib/supabase";
export default function DemoChat({ slug }: { slug: string }) {
  const [org, setOrg] = useState<Row | null>(null),
    [sent, setSent] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    setOrg(readDemo().organizations.find((o) => o.slug === slug) || null);
  }, [slug]);
  return (
    <main className="chat-demo-page">
      <a className="back-link" href={`/demo/contractor/${slug}`}>
        <ArrowLeft size={16} />
        Back to contractor website
      </a>
      <section className="chat-demo-card">
        <header>
          <MessageCircle size={28} />
          <div>
            <h2>{org?.name || "Contractor"}</h2>
            <span>WhatsApp journey · simulated conversation</span>
          </div>
        </header>
        <div className="chat-demo-intro">
          <p>Hi there! Tell us a little about the ADU you have in mind.</p>
          <small>This is an Omnibuild demo. Nothing is sent to WhatsApp.</small>
        </div>
        {configured ? (
          <p className="auth-notice">
            Simulated messages are disabled on a connected workspace. Configure
            the contractor’s real WhatsApp number to use their WhatsApp chat.
          </p>
        ) : sent ? (
          <div className="chat-success">
            <CheckCheck size={38} />
            <h2>Your demo inquiry is in Omnibuild.</h2>
            <p>
              Open Communications to see this visitor’s message assigned to{" "}
              {org?.name}.
            </p>
            <a className="button primary" href="/?view=communications">
              View the Omnibuild inbox
            </a>
            <a
              className="text-button"
              href={`/workspace/${slug}?view=inquiries`}
            >
              View the contractor’s inbox
            </a>
            <small>Demo data stays on this device and browser.</small>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!org) return;
              try {
                const f = new FormData(e.currentTarget);
                const phone = String(f.get("phone")).replace(/\D/g, "");
                if (!/^[1-9]\d{7,14}$/.test(phone))
                  throw new Error(
                    "Enter a demo phone number including country code.",
                  );
                addDemoInquiry(
                  org.id,
                  String(f.get("name")),
                  phone,
                  String(f.get("message")),
                );
                setSent(true);
              } catch (e) {
                setError(
                  e instanceof Error
                    ? e.message
                    : "Could not save demo message",
                );
              }
            }}
          >
            <label className="field">
              Your name
              <input
                name="name"
                required
                maxLength={100}
                placeholder="Alex Rivera"
              />
            </label>
            <label className="field">
              Demo phone number
              <input
                name="phone"
                type="tel"
                required
                placeholder="+1 415 555 0100"
              />
            </label>
            <label className="field">
              Your message
              <textarea
                name="message"
                required
                maxLength={5000}
                defaultValue="Hi! I’m interested in building an ADU in my backyard. Could we schedule a consultation?"
              />
            </label>
            <button className="button primary" disabled={!org}>
              Send demo inquiry
              <Send size={16} />
            </button>
            {error && (
              <p role="alert" className="auth-notice">
                {error}
              </p>
            )}
          </form>
        )}
      </section>
    </main>
  );
}
