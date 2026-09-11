"use client";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  Globe,
  LayoutDashboard,
  MessageSquare,
  Plus,
  Search,
  ShieldCheck,
  X,
  LogOut,
  Copy,
} from "lucide-react";
import QRCode from "qrcode";
import { configured, browserDB } from "@/lib/supabase";
import { Dataset, emptyData, Row } from "@/lib/data";
import { readDemo, saveDemo, whatsappLink } from "@/lib/demo";
import Communications from "./communications";
export default function Hub() {
  const [data, setData] = useState<Dataset>(emptyData),
    [loading, setLoading] = useState(true),
    [allowed, setAllowed] = useState(false),
    [signedIn, setSignedIn] = useState(false),
    [view, setView] = useState("Contractors"),
    [search, setSearch] = useState(""),
    [modal, setModal] = useState<"create" | Row | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [qr, setQr] = useState("");
  async function load() {
    if (!configured) {
      setData(readDemo());
      setAllowed(true);
      setSignedIn(true);
      setLoading(false);
      return;
    }
    try {
      const db = browserDB();
      const {
        data: { user },
      } = await db.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      setSignedIn(true);
      await db.rpc("accept_invitations");
      const { data: admin, error } = await db.rpc("is_platform_admin");
      if (error) throw error;
      const { data: orgs, error: orgError } = await db
        .from("organizations")
        .select("*")
        .order("created_at");
      if (orgError) throw orgError;
      if (!admin) {
        if (orgs?.length) {
          const { data: membership } = await db
            .from("memberships")
            .select("organization_id")
            .eq("user_id", user.id)
            .limit(1);
          const org =
            orgs.find((o) => o.id === membership?.[0]?.organization_id) ||
            orgs[0];
          location.replace(
            `${membership?.length ? "/workspace" : "/portal"}/${org.slug}`,
          );
          return;
        }
        setLoading(false);
        return;
      }
      setAllowed(true);
      const [projects, clients] = await Promise.all([
        db.from("projects").select("*"),
        db.from("clients").select("*"),
      ]);
      if (projects.error || clients.error)
        throw projects.error || clients.error;
      setData({
        ...emptyData,
        organizations: orgs || [],
        projects: projects.data || [],
        clients: clients.data || [],
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load your hub");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (new URLSearchParams(location.search).get("view") === "communications")
      setView("Communications");
    load();
    window.addEventListener("storage", load);
    return () => window.removeEventListener("storage", load);
  }, []);
  useEffect(() => {
    if (!modal || typeof modal === "string") {
      setQr("");
      return;
    }
    const link =
      whatsappLink(modal.whatsapp_number || "", modal.name) ||
      `${location.origin}/demo/chat/${modal.slug}`;
    QRCode.toDataURL(link, {
      width: 240,
      margin: 2,
      color: { dark: "#173a2d", light: "#ffffff" },
    })
      .then(setQr)
      .catch(() => setError("Could not generate QR code"));
  }, [modal]);
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      const values = {
        name: String(f.get("name")).trim(),
        slug: String(f.get("slug")).trim(),
        contact_email: String(f.get("email")).trim(),
        website_url: String(f.get("website") || ""),
        whatsapp_number: String(f.get("whatsapp") || "").replace(/[^0-9]/g, ""),
      };
      if (!/^[a-z0-9][a-z0-9-]{2,59}$/.test(values.slug))
        throw new Error(
          "Use 3–60 lowercase letters, numbers, or hyphens for the portal slug.",
        );
      if (
        values.whatsapp_number &&
        !/^[1-9]\d{7,14}$/.test(values.whatsapp_number)
      )
        throw new Error(
          "Enter a WhatsApp number with country code, or leave it blank for the demo.",
        );
      if (!configured) {
        const latest = readDemo();
        if (
          latest.organizations.some(
            (o) =>
              o.slug === values.slug &&
              (modal === "create" || o.id !== (modal as Row).id),
          )
        )
          throw new Error("That portal slug already exists.");
        const id = modal === "create" ? crypto.randomUUID() : (modal as Row).id;
        saveDemo({
          ...latest,
          organizations:
            modal === "create"
              ? [
                  ...latest.organizations,
                  {
                    ...values,
                    id,
                    organization_id: id,
                    created_at: new Date().toISOString(),
                  },
                ]
              : latest.organizations.map((o) =>
                  o.id === id ? { ...o, ...values } : o,
                ),
        });
      } else {
        const db = browserDB();
        const result =
          modal === "create"
            ? await db.rpc("create_contractor", {
                company_name: values.name,
                company_slug: values.slug,
                owner_email: values.contact_email,
                website: values.website_url,
                whatsapp: values.whatsapp_number,
              })
            : await db
                .from("organizations")
                .update(values)
                .eq("id", (modal as Row).id);
        if (result.error) throw result.error;
      }
      await load();
      setModal(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save contractor");
    } finally {
      setBusy(false);
    }
  }
  async function invite(org: Row) {
    if (!configured) {
      setError(
        "Demo: no email sent. Connect Supabase to invite the contractor owner.",
      );
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/contractors/invite", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          organization_id: org.id,
          email: org.contact_email,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setError("Owner invitation sent.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invitation failed");
    } finally {
      setBusy(false);
    }
  }
  if (loading)
    return (
      <div className="loading">
        <Building2 size={32} />
        <h2>Opening Omnibuild…</h2>
      </div>
    );
  if (!allowed)
    return (
      <main className="onboarding">
        <a className="brand" href="/">
          omnibuild.
        </a>
        <h1>
          {signedIn
            ? "Your workspace is being prepared."
            : "Your contractors. One connected hub."}
        </h1>
        <p>
          {signedIn
            ? "Your account needs an Omnibuild administrator grant or a contractor invitation."
            : "Sign in to manage your contractor companies or open your assigned workspace."}
        </p>
        {!signedIn && (
          <a className="button primary" href="/login">
            Sign in <ArrowRight size={17} />
          </a>
        )}
        {signedIn && (
          <button
            className="button"
            onClick={async () => {
              await browserDB().auth.signOut();
              location.reload();
            }}
          >
            Sign out
          </button>
        )}
        {error && <p role="alert">{error}</p>}
      </main>
    );
  const orgs = data.organizations.filter((o) =>
    (o.name + " " + o.contact_email)
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const edit = modal && typeof modal !== "string" ? modal : null;
  return (
    <div className="hub-shell">
      <aside className="hub-sidebar">
        <a className="brand" href="/">
          <span>
            <Building2 size={23} />
          </span>
          omnibuild<span className="brand-dot">.</span>
        </a>
        <div className="hub-identity">
          <span className="platform-mark">
            <ShieldCheck size={20} />
          </span>
          <div>
            <strong>Omnibuild HQ</strong>
            <small>Platform owner workspace</small>
          </div>
        </div>
        <div className="nav-label">YOUR BUSINESS</div>
        {["Contractors", "Communications", "Demo experience"].map((item, i) => {
          const Icon = [LayoutDashboard, MessageSquare, Globe][i];
          return (
            <button
              className={"nav-item " + (view === item ? "active" : "")}
              key={item}
              onClick={() => setView(item)}
            >
              <Icon size={19} />
              {item}
            </button>
          );
        })}
        <div className="hub-side-note">
          <ShieldCheck size={24} />
          <h3>A home for every contractor.</h3>
          <p>
            You manage contractor accounts. Each contractor manages their own
            homeowners and projects.
          </p>
        </div>
        <div className="profile">
          <span className="avatar">OB</span>
          <div>
            <strong>Omnibuild administrator</strong>
            <span>{configured ? "Platform access" : "Demo environment"}</span>
          </div>
          {configured && (
            <button
              aria-label="Sign out"
              onClick={async () => {
                await browserDB().auth.signOut();
                location.reload();
              }}
            >
              <LogOut size={17} />
            </button>
          )}
        </div>
      </aside>
      <div className="hub-main">
        <header className="topbar">
          <div className="breadcrumb">
            Omnibuild HQ <ArrowRight size={13} />
            <strong>{view}</strong>
          </div>
          <span className="demo-tag">
            {configured ? "Platform administrator" : "Interactive demo"}
          </span>
        </header>
        <main className="content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">YOUR COMPANY. THEIR SUCCESS.</div>
              <h1>
                {view === "Contractors"
                  ? "Great contractors. All connected."
                  : view === "Communications"
                    ? "Every conversation has a home."
                    : "Show the whole journey."}
              </h1>
              <p>
                {view === "Contractors"
                  ? "Create and manage the contractor companies that run on Omnibuild."
                  : view === "Communications"
                    ? "Website → WhatsApp → a conversation with the right contractor."
                    : "From a contractor’s website to a connected client experience."}
              </p>
            </div>
            {view === "Contractors" && (
              <button
                className="button primary"
                onClick={() => {
                  setError("");
                  setModal("create");
                }}
              >
                <Plus size={17} />
                Add contractor
              </button>
            )}
          </div>
          {error && (
            <div className="auth-notice" role="status">
              {error}
              <button
                className="icon-button"
                aria-label="Dismiss"
                onClick={() => setError("")}
              >
                <X size={14} />
              </button>
            </div>
          )}
          {view === "Contractors" && (
            <>
              <div className="stat-grid hub-stats">
                {[
                  [
                    "Contractor clients",
                    data.organizations.length,
                    "Companies on Omnibuild",
                  ],
                  [
                    "Active projects",
                    data.projects.filter((p) => p.status !== "Completed")
                      .length,
                    "Across your contractor accounts",
                  ],
                  [
                    "Homeowners",
                    data.clients.filter((c) => !c.archived).length,
                    "Served by your contractors",
                  ],
                ].map(([label, value, detail]) => (
                  <div className="stat-card" key={label}>
                    <div className="stat-top">
                      <span>{label}</span>
                      <Building2 size={17} />
                    </div>
                    <strong>{String(value).padStart(2, "0")}</strong>
                    <p>{detail}</p>
                  </div>
                ))}
              </div>
              <div className="section-heading">
                <h2>
                  Your contractor clients{" "}
                  <span className="count">{data.organizations.length}</span>
                </h2>
                <label className="search-box">
                  <Search size={16} />
                  <input
                    aria-label="Search contractors"
                    placeholder="Find a contractor…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </label>
              </div>
              <div className="contractor-grid">
                {orgs.map((o) => (
                  <article className="contractor-card" key={o.id}>
                    <div className="contractor-cover">
                      <Building2 size={36} />
                      <span className="badge active">
                        <span />
                        Contractor account
                      </span>
                    </div>
                    <div className="contractor-body">
                      <div className="eyebrow">OMNIBUILD CLIENT</div>
                      <h2>{o.name}</h2>
                      <p>
                        {o.contact_email || "Owner invitation not configured"}
                      </p>
                      <div className="contractor-metrics">
                        <span>
                          <strong>
                            {
                              data.projects.filter(
                                (p) => p.organization_id === o.id,
                              ).length
                            }
                          </strong>{" "}
                          projects
                        </span>
                        <span>
                          <strong>
                            {
                              data.clients.filter(
                                (c) =>
                                  c.organization_id === o.id && !c.archived,
                              ).length
                            }
                          </strong>{" "}
                          homeowners
                        </span>
                      </div>
                      <div className="contractor-links">
                        <a href={`/workspace/${o.slug}`}>
                          Open workspace
                          <ArrowRight size={16} />
                        </a>
                        <button
                          onClick={() => {
                            setError("");
                            setModal(o);
                          }}
                        >
                          Manage account
                        </button>
                      </div>
                      <div className="contractor-demo-links">
                        <a
                          href={`/demo/contractor/${o.slug}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Globe size={14} />
                          Website demo
                          <ArrowUpRight size={13} />
                        </a>
                        <a
                          href={`/portal/${o.slug}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Homeowner portal
                          <ArrowUpRight size={13} />
                        </a>
                      </div>
                    </div>
                  </article>
                ))}
                <button
                  className="contractor-add"
                  onClick={() => setModal("create")}
                >
                  <span>
                    <Plus size={25} />
                  </span>
                  <h3>Your next contractor starts here.</h3>
                  <p>Give another company a connected client experience.</p>
                </button>
              </div>
            </>
          )}
          {view === "Communications" && (
            <Communications organizations={data.organizations} />
          )}
          {view === "Demo experience" && (
            <>
              <div className="journey-grid">
                {[
                  [
                    "01",
                    "Contractor website",
                    "A familiar marketing website introduces the contractor’s ADU services.",
                  ],
                  [
                    "02",
                    "Two clear paths",
                    "Existing homeowners open their portal. New visitors start a WhatsApp chat.",
                  ],
                  [
                    "03",
                    "Omnibuild connects it",
                    "Your contractor sees homeowner projects and incoming inquiries in their own workspace.",
                  ],
                ].map(([n, title, body]) => (
                  <article className="panel" key={n}>
                    <span className="journey-number">{n}</span>
                    <h2>{title}</h2>
                    <p className="description">{body}</p>
                  </article>
                ))}
              </div>
              <section className="panel demo-presentation">
                <img src="/adu.svg" alt="Illustrated backyard ADU" />
                <div>
                  <span className="eyebrow">READY TO WALK THROUGH</span>
                  <h2>Westwood ADU × Omnibuild</h2>
                  <p className="description">
                    A fictional contractor website inspired by the
                    service-and-consultation structure of 9ADU. Show a client
                    how their existing website connects to Omnibuild.
                  </p>
                  <a
                    className="button primary"
                    href="/demo/contractor/westwood-adu"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Launch website demo <ArrowUpRight size={16} />
                  </a>
                  <p className="subtle">
                    A presentation demo, not affiliated with 9ADU.
                  </p>
                </div>
              </section>
            </>
          )}
          <footer className="footer">
            <span>
              <span className="live-dot" />
              {configured
                ? "Omnibuild platform hub"
                : "Demo mode · Saved in this browser"}
            </span>
            <span>Your brand. Their workspace.</span>
          </footer>
        </main>
      </div>
      {modal && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="contractor-title"
          >
            <div className="modal-header">
              <h2 id="contractor-title">
                {edit ? "Manage contractor" : "Add a contractor client"}
              </h2>
              <button
                className="icon-button"
                aria-label="Close dialog"
                onClick={() => setModal(null)}
              >
                <X size={20} />
              </button>
            </div>
            <p className="description">
              This company is an Omnibuild client. Their homeowners live inside
              their workspace.
            </p>
            <form onSubmit={save}>
              {[
                ["Company name", "name", edit?.name, "text"],
                ["Portal slug", "slug", edit?.slug, "text"],
                ["Owner email", "email", edit?.contact_email, "email"],
                [
                  "Company website (optional)",
                  "website",
                  edit?.website_url,
                  "url",
                ],
                [
                  "WhatsApp number with country code (optional)",
                  "whatsapp",
                  edit?.whatsapp_number,
                  "tel",
                ],
              ].map(([label, name, value, type]) => (
                <label className="field" key={name}>
                  {label}
                  <input
                    name={name}
                    type={type}
                    defaultValue={value || ""}
                    required={["name", "slug", "email"].includes(name)}
                    pattern={
                      name === "slug" ? "[a-z0-9][a-z0-9-]{2,59}" : undefined
                    }
                  />
                </label>
              ))}
              {edit && (
                <div className="qr-settings">
                  {qr && (
                    <img
                      src={qr}
                      width={140}
                      height={140}
                      alt={`${edit.name} communication QR code`}
                    />
                  )}
                  <div>
                    <h3>
                      {edit.whatsapp_number
                        ? "WhatsApp QR code"
                        : "Demo journey QR code"}
                    </h3>
                    <p className="subtle">
                      {edit.whatsapp_number
                        ? "Opens this contractor’s WhatsApp chat."
                        : "No business number configured. This QR opens a labeled local chat demo."}
                    </p>
                    {qr && (
                      <a
                        className="text-button"
                        href={qr}
                        download={`${edit.slug}-qr.png`}
                      >
                        Download QR
                      </a>
                    )}
                    <button
                      className="text-button"
                      type="button"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(
                            `${location.origin}/portal/${edit.slug}`,
                          );
                          setError("Portal link copied");
                        } catch {
                          setError(
                            "Clipboard unavailable. Copy the portal URL from your address bar.",
                          );
                        }
                      }}
                    >
                      <Copy size={13} />
                      Copy portal link
                    </button>
                  </div>
                </div>
              )}
              <div className="modal-footer">
                {edit && (
                  <button
                    type="button"
                    className="button"
                    disabled={busy}
                    onClick={() => invite(edit)}
                  >
                    Invite owner
                  </button>
                )}
                <button className="button primary" disabled={busy}>
                  {busy
                    ? "Saving…"
                    : edit
                      ? "Save account"
                      : "Create contractor"}
                  <ArrowRight size={16} />
                </button>
              </div>
              {error && (
                <p role="status" className="auth-notice">
                  {error}
                </p>
              )}
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
