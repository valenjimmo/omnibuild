"use client";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  House,
  MessageCircle,
  ShieldCheck,
} from "lucide-react";
import QRCode from "qrcode";
import { readDemo, whatsappLink } from "@/lib/demo";
import { browserDB, configured } from "@/lib/supabase";
import { Row } from "@/lib/data";
export default function ContractorSite({ slug }: { slug: string }) {
  const [org, setOrg] = useState<Row | null>(null),
    [loaded, setLoaded] = useState(false),
    [qr, setQr] = useState(""),
    [chat, setChat] = useState("");
  const appOrigin = (process.env.NEXT_PUBLIC_OMNIBUILD_URL || "").replace(
    /\/$/,
    "",
  );
  useEffect(() => {
    async function load() {
      let profile: Row | null = null;
      if (!configured)
        profile = readDemo().organizations.find((o) => o.slug === slug) || null;
      else {
        const { data } = await browserDB().rpc("contractor_public_profile", {
          company_slug: slug,
        });
        profile = data?.[0] || null;
      }
      setOrg(profile);
      setLoaded(true);
      if (profile) {
        const target =
          whatsappLink(profile.whatsapp_number || "", profile.name) ||
          `${appOrigin || location.origin}/demo/chat/${slug}`;
        setChat(target);
        setQr(
          await QRCode.toDataURL(target, {
            width: 260,
            margin: 2,
            color: { dark: "#24392e", light: "#ffffff" },
          }),
        );
      }
    }
    load().catch(() => setLoaded(true));
  }, [slug]);
  if (!loaded)
    return <div className="loading">Preparing the website demo…</div>;
  if (!org)
    return (
      <main className="onboarding">
        <h1>Contractor website not found</h1>
        <a href="/">Back to Omnibuild</a>
      </main>
    );
  return (
    <main className="contractor-site">
      <div className="site-demo-banner">
        <span>OMNIBUILD SHOWCASE</span> Fictional contractor website · Not
        affiliated with 9ADU{" "}
        <a href={`${appOrigin}/`}>
          Back to Omnibuild <ArrowUpRight size={13} />
        </a>
      </div>
      <header className="site-header">
        <a className="site-brand" href="#">
          <House size={28} />
          <span>
            {org.name}
            <small>THOUGHTFULLY BUILT. BEAUTIFULLY LIVED.</small>
          </span>
        </a>
        <nav>
          <a href="#about">Our story</a>
          <a href="#services">What we build</a>
          <a href="#process">The process</a>
          <a className="site-portal" href={`${appOrigin}/portal/${slug}`}>
            Client portal <ArrowUpRight size={14} />
          </a>
        </nav>
      </header>
      <section className="site-hero">
        <div className="site-hero-copy">
          <span className="site-eyebrow">BAY AREA ADU DESIGN & BUILD</span>
          <h1>
            A little more space.
            <br />
            <em>A lot more possibility.</em>
          </h1>
          <p>
            A place for family. Room to create. A home that grows with you. We
            bring thoughtful backyard living to life, from the first
            conversation to the final key.
          </p>
          <a className="site-button" href="#contact">
            Let’s talk about your ADU <ArrowRight size={18} />
          </a>
          <div className="site-trust">
            <span>
              <Check size={15} />
              Design to delivery
            </span>
            <span>
              <Check size={15} />
              Local expertise
            </span>
          </div>
        </div>
        <div className="site-hero-art">
          <img
            src="/adu.svg"
            alt="Concept illustration of a modern backyard home"
          />
          <div className="site-image-caption">
            SMALL FOOTPRINT. EXTRAORDINARY POTENTIAL.
            <span>Concept illustration</span>
          </div>
        </div>
      </section>
      <section className="site-about" id="about">
        <span className="site-eyebrow">ROOM FOR WHAT MATTERS</span>
        <h2>
          Your backyard.
          <br />
          Your next chapter.
        </h2>
        <div>
          <p>
            More than an addition, an ADU is a new way to use the space you
            already love. A home for your parents, a private retreat for guests,
            or a fresh start close to family.
          </p>
          <p>
            {org.name} brings design, planning, and construction together so you
            have one team and a clear next step.
          </p>
        </div>
      </section>
      <section className="site-services" id="services">
        <div className="site-section-heading">
          <div>
            <span className="site-eyebrow">THREE WAYS TO MAKE ROOM</span>
            <h2>A home that fits your life.</h2>
          </div>
          <p>
            Purposeful spaces.
            <br />
            Built around your property.
          </p>
        </div>
        <div className="site-services-grid">
          {[
            [
              "01",
              "Detached backyard homes",
              "A private home with its own front door, designed to feel like it has always belonged.",
            ],
            [
              "02",
              "Garage transformations",
              "Turn underused space into a welcoming studio, guest suite, or independent home.",
            ],
            [
              "03",
              "Connected living spaces",
              "Extend your home with a flexible addition that keeps everyone close, comfortably.",
            ],
          ].map(([n, title, body]) => (
            <article key={n}>
              <span>{n}</span>
              <House size={37} />
              <h3>{title}</h3>
              <p>{body}</p>
              <a href="#contact">
                Explore the possibilities
                <ArrowUpRight size={16} />
              </a>
            </article>
          ))}
        </div>
      </section>
      <section className="site-process" id="process">
        <div>
          <span className="site-eyebrow">ONE TEAM. EVERY STEP.</span>
          <h2>
            Big ideas.
            <br />A clear path forward.
          </h2>
          <p>
            You should always know what’s happening next. We keep your project
            and your conversations connected through Omnibuild.
          </p>
          <a href={`${appOrigin}/portal/${slug}`}>
            See the homeowner portal
            <ArrowUpRight size={17} />
          </a>
        </div>
        <div>
          {[
            [
              "01",
              "Let’s get to know your space",
              "Talk through your goals, property, and possibilities.",
            ],
            [
              "02",
              "Design it around your life",
              "Shape the layout, details, and plan for your new space.",
            ],
            [
              "03",
              "Watch it come together",
              "Follow milestones, photos, documents, and updates in your private portal.",
            ],
          ].map(([n, title, body]) => (
            <article key={n}>
              <span>{n}</span>
              <div>
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="site-contact" id="contact">
        <div>
          <span className="site-eyebrow">
            YOUR NEXT CHAPTER STARTS WITH HELLO
          </span>
          <h2>
            What could your
            <br />
            backyard become?
          </h2>
          <p>
            Tell us what you’re imagining. Start a conversation on WhatsApp, and
            let’s explore what’s possible.
          </p>
          <a
            className="site-button whatsapp"
            href={chat}
            target={org.whatsapp_number ? "_blank" : "_self"}
            rel="noreferrer"
          >
            <MessageCircle size={20} />
            {org.whatsapp_number ? "Chat on WhatsApp" : "Try the WhatsApp demo"}
            <ArrowUpRight size={17} />
          </a>
          {!org.whatsapp_number && (
            <p className="demo-explainer">
              Demo only: no business number is connected. Your test message
              appears in Omnibuild’s demo communications inbox in this browser.
            </p>
          )}
        </div>
        <div className="site-qr-card">
          {qr && (
            <img
              src={qr}
              alt={
                org.whatsapp_number
                  ? "Scan to chat with the contractor on WhatsApp"
                  : "Scan to open the simulated WhatsApp journey"
              }
              width={210}
              height={210}
            />
          )}
          <h3>
            {org.whatsapp_number
              ? "Scan. Say hello."
              : "Scan the demo journey."}
          </h3>
          <p>
            {org.whatsapp_number
              ? "Open your camera to start a chat."
              : "Or click the demo button on this device."}
          </p>
          <span>
            <ShieldCheck size={14} />
            Powered by Omnibuild
          </span>
        </div>
      </section>
      <section className="site-existing">
        <div>
          <House size={26} />
          <span>
            <strong>Already building with us?</strong>
            <small>
              Your project updates, documents, and team are one click away.
            </small>
          </span>
        </div>
        <a className="site-button outline" href={`${appOrigin}/portal/${slug}`}>
          Open your client portal
          <ArrowUpRight size={16} />
        </a>
      </section>
      <footer className="site-footer">
        <strong>{org.name}</strong>
        <span>A fictional contractor demo by Omnibuild.</span>
        <a href={`${appOrigin}/`}>
          Explore Omnibuild
          <ArrowUpRight size={14} />
        </a>
      </footer>
    </main>
  );
}
