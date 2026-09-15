"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Building2,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Copy,
  ExternalLink,
  FileText,
  FolderOpen,
  House,
  ImageIcon,
  LayoutDashboard,
  LogOut,
  Mail,
  MapPin,
  Menu,
  MessageSquare,
  Plus,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { browserDB, configured } from "@/lib/supabase";
import { Dataset, Row, Table, demoData, emptyData } from "@/lib/data";
import Communications from "./communications";
import { storagePath, validUpload } from "@/lib/validation";

type View =
  | "Overview"
  | "Projects"
  | "Clients"
  | "Messages"
  | "Documents"
  | "Templates"
  | "Settings";
type Modal = { kind: string; row?: Row };
const channelLabels: Record<string, string> = {
  portal: "Portal",
  email: "Email",
  sms: "SMS",
  whatsapp: "WhatsApp",
  wechat: "WeChat",
};
const icons = {
  Overview: LayoutDashboard,
  Projects: FolderOpen,
  Clients: Users,
  Messages: MessageSquare,
  Documents: FileText,
  Templates: ClipboardList,
  Settings: Settings,
};
const moneylessDate = (value: string) =>
  value
    ? new Date(value.slice(0, 10) + "T12:00:00").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : "Not scheduled";
const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .map((s) => s[0])
    .slice(0, 2)
    .join("");
const input = (
  label: string,
  name: string,
  value: any = "",
  type = "text",
  required = true,
) => (
  <label className="field">
    {label}
    <input
      name={name}
      type={type}
      defaultValue={value || ""}
      required={required}
      minLength={type === "password" ? 8 : undefined}
    />
  </label>
);
function Badge({ status }: { status: string }) {
  return (
    <span className={"badge " + status.toLowerCase().replaceAll(" ", "-")}>
      <span />
      {status}
    </span>
  );
}
function Avatar({ name, color = 0 }: { name: string; color?: number }) {
  return <span className={"avatar color-" + color}>{initials(name)}</span>;
}

export default function Workspace({
  portalSlug,
  organizationSlug,
}: {
  portalSlug?: string;
  organizationSlug?: string;
}) {
  const targetSlug = portalSlug || organizationSlug;
  const [platformAdmin, setPlatformAdmin] = useState(false);
  const [messageChannel, setMessageChannel] = useState("projects");
  const [data, setData] = useState<Dataset>(emptyData),
    [orgId, setOrgId] = useState(""),
    [userId, setUserId] = useState("demo-owner"),
    [loading, setLoading] = useState(true),
    [authenticated, setAuthenticated] = useState(false);
  const [view, setView] = useState<View>("Overview"),
    [selected, setSelected] = useState<string | null>(null),
    [tab, setTab] = useState("Overview"),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("All projects"),
    [modal, setModal] = useState<Modal | null>(null),
    [toast, setToast] = useState(""),
    [busy, setBusy] = useState(false),
    [mobile, setMobile] = useState(false),
    [authMode, setAuthMode] = useState("login"),
    [message, setMessage] = useState(""),
    [deliveryChannel, setDeliveryChannel] = useState("portal"),
    [responses, setResponses] = useState<string[]>([]),
    [conversation, setConversation] = useState(""),
    [notices, setNotices] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadProject, setUploadProject] = useState("");
  const demo = !configured;
  const org =
    data.organizations.find((o) => o.id === orgId) || data.organizations[0];
  const member = data.memberships.find(
    (m) => m.organization_id === org?.id && m.user_id === userId,
  );
  const clientMode =
    !!portalSlug || (!member && authenticated && !platformAdmin && !demo);
  const owner = demo ? !clientMode : platformAdmin || member?.role === "owner";
  const scope = <T extends Row>(rows: T[]) =>
    rows.filter((r) => r.organization_id === org?.id);
  const clients = scope(data.clients),
    allProjects = scope(data.projects),
    projects =
      clientMode && demo
        ? allProjects.filter((p) => p.client_id === "c1")
        : allProjects;
  const visibleProjectIds = new Set(projects.map((p) => p.id));
  const updates = scope(data.updates).filter(
    (u) =>
      visibleProjectIds.has(u.project_id) && (!clientMode || u.client_visible),
  );
  const docs = scope(data.documents).filter(
    (d) =>
      visibleProjectIds.has(d.project_id) && (!clientMode || d.client_visible),
  );
  const milestones = scope(data.milestones).filter((m) =>
    visibleProjectIds.has(m.project_id),
  );
  const messages = scope(data.messages).filter((m) =>
    visibleProjectIds.has(m.project_id),
  );
  const templates = scope(data.templates);
  const project = projects.find((p) => p.id === selected);
  const enabledChannels: string[] = org?.enabled_message_channels || ["portal"];
  const active = projects.filter((p) => p.status !== "Completed");
  const clientName = (id: string) =>
    clients.find((c) => c.id === id)?.name || "Client";
  const progress = (id: string) => {
    const ms = milestones.filter((m) => m.project_id === id);
    return ms.length
      ? Math.round((ms.filter((m) => m.completed).length / ms.length) * 100)
      : 0;
  };
  const notify = (text: string) => {
    setToast(text);
  };
  useEffect(() => {
    if (!modal) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLElement>("[role=dialog]");
    const focusable = () =>
      Array.from(
        dialog?.querySelectorAll<HTMLElement>(
          "button:not([disabled]), input, select, textarea, a[href]",
        ) || [],
      );
    focusable()
      .find((el) => el.tagName === "INPUT")
      ?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) setModal(null);
      if (e.key === "Tab") {
        const elements = focusable();
        const first = elements[0],
          last = elements[elements.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      previous?.focus();
    };
  }, [modal, busy]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(timer);
  }, [toast]);
  async function reload() {
    const db = browserDB();
    const {
      data: { user },
    } = await db.auth.getUser();
    if (!user) {
      setAuthenticated(false);
      setData(emptyData);
      setLoading(false);
      return;
    }
    setUserId(user.id);
    const { data: admin } = await db.rpc("is_platform_admin");
    setPlatformAdmin(!!admin);
    if (!targetSlug) {
      location.replace("/");
      return;
    }
    const { error: claimError } = await db.rpc("accept_invitations");
    if (claimError) notify(claimError.message);
    const tables = Object.keys(emptyData) as Table[];
    const results = await Promise.all(
      tables.map((t) => db.from(t).select("*")),
    );
    const err = results.find((r) => r.error)?.error;
    if (err) throw new Error(err.message);
    const loaded = Object.fromEntries(
      tables.map((t, i) => [t, results[i].data || []]),
    ) as Dataset;
    setData(loaded);
    setAuthenticated(true);
    setOrgId(
      (previous) =>
        loaded.organizations.find((o) =>
          targetSlug ? o.slug === targetSlug : o.id === previous,
        )?.id ||
        (!targetSlug ? loaded.organizations[0]?.id : "") ||
        "",
    );
    setLoading(false);
  }
  useEffect(() => {
    if (new URLSearchParams(location.search).get("view") === "inquiries") {
      setView("Messages");
      setMessageChannel("inquiries");
    }
    if (new URLSearchParams(location.search).get("auth") === "error")
      notify(
        "That sign-in link is invalid or expired. Request a new invitation or sign in with your password.",
      );
    if (demo) {
      let d = demoData();
      try {
        const saved = localStorage.getItem("omnibuild-demo-v1");
        if (saved) d = JSON.parse(saved);
      } catch {}
      d = {
        ...d,
        organizations: d.organizations.map((o) => ({
          enabled_message_channels: ["portal", "email", "sms", "whatsapp"],
          ...o,
        })),
        projects: d.projects.map((p) => ({
          preferred_message_channel: "portal",
          ...p,
        })),
        messages: d.messages.map((m) => ({ channel: "portal", ...m })),
        templates: d.templates.map((t) => ({ channel: "portal", ...t })),
      };
      setData(d);
      setOrgId(
        d.organizations.find((o) => o.slug === targetSlug)?.id ||
          d.organizations[0].id,
      );
      setUserId(portalSlug ? "demo-client" : "demo-owner");
      setAuthenticated(true);
      setLoading(false);
    } else
      reload().catch((e) => {
        notify(e.message);
        setLoading(false);
      });
  }, []); // Initial session is revalidated by Supabase on each request.
  async function mutate(
    table: Table,
    values: Record<string, any>,
    id?: string,
  ) {
    const clean = { ...values, organization_id: org.id };
    if (demo) {
      const next = {
        ...data,
        [table]: id
          ? data[table].map((r) => (r.id === id ? { ...r, ...clean } : r))
          : [
              ...data[table],
              {
                ...clean,
                id: crypto.randomUUID(),
                created_at: new Date().toISOString(),
              },
            ],
      };
      localStorage.setItem("omnibuild-demo-v1", JSON.stringify(next));
      setData(next);
    } else {
      const db = browserDB();
      const result = id
        ? await db
            .from(table)
            .update(clean)
            .eq("id", id)
            .eq(table === "organizations" ? "id" : "organization_id", org.id)
        : await db.from(table).insert(clean);
      if (result.error) throw new Error(result.error.message);
      await reload();
    }
  }
  async function action(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      notify(
        e instanceof Error
          ? e.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function auth(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    await action(async () => {
      const db = browserDB();
      const email = String(f.get("email")),
        password = String(f.get("password"));
      const result =
        authMode === "signup"
          ? await db.auth.signUp({
              email,
              password,
              options: { emailRedirectTo: `${location.origin}/auth/callback` },
            })
          : await db.auth.signInWithPassword({ email, password });
      if (result.error) throw result.error;
      if (authMode === "signup" && !result.data.session)
        notify("Check your email to confirm your account, then sign in.");
      else await reload();
    });
  }
  async function saveForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    const val = (key: string) => String(f.get(key) || "");
    await action(async () => {
      const kind = modal!.kind,
        row = modal?.row;
      if (kind === "client")
        await mutate(
          "clients",
          {
            name: val("name"),
            email: val("email"),
            phone: val("phone"),
            archived: false,
          },
          row?.id,
        );
      if (kind === "project")
        await mutate(
          "projects",
          {
            name: val("name"),
            client_id: val("client_id"),
            address: val("address"),
            description: val("description"),
            status: val("status"),
            due_date: val("due_date") || null,
            preferred_message_channel:
              val("preferred_message_channel") || "portal",
          },
          row?.id,
        );
      if (kind === "milestone")
        await mutate("milestones", {
          project_id: project!.id,
          title: val("title"),
          due_date: val("due_date") || null,
          completed: false,
        });
      if (kind === "update")
        await mutate("updates", {
          project_id: val("project_id"),
          title: val("title"),
          body: val("body"),
          client_visible: val("visibility") === "client",
        });
      if (kind === "template")
        await mutate(
          "templates",
          {
            title: val("title"),
            body: val("body"),
            responses: val("responses")
              .split("\n")
              .map((r) => r.trim())
              .filter(Boolean),
            channel: val("channel") || "portal",
          },
          row?.id,
        );
      if (kind === "invite") {
        if (demo) {
          notify(
            "Demo preview: invitation emails are available after connecting Supabase.",
          );
          setModal(null);
          return;
        }
        const result = await fetch("/api/invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            organization_id: org.id,
            email: row?.email || val("email"),
            role: row ? "client" : "staff",
            ...(row ? { client_id: row.id } : {}),
          }),
        });
        const payload = await result.json();
        if (!result.ok) throw new Error(payload.error);
      }
      setModal(null);
      notify(kind === "invite" ? "Invitation sent" : "Saved successfully");
    });
  }
  async function sendMessage(body = message) {
    if (!body.trim()) return;
    await action(async () => {
      await mutate("messages", {
        project_id: conversation || projects[0]?.id,
        sender_id: userId,
        body: body.trim(),
        responses,
        channel: clientMode ? "portal" : deliveryChannel,
      });
      setMessage("");
      setResponses([]);
      notify(
        deliveryChannel === "portal" || clientMode
          ? "Message shared in the project portal"
          : `${channelLabels[deliveryChannel]} selected; message saved to the project. External delivery requires a connected provider.`,
      );
    });
  }
  async function upload(file: File) {
    if (!validUpload(file)) {
      notify("Choose a PDF, JPG, PNG, WebP, or text file up to 10 MB.");
      return;
    }
    const pid = selected || uploadProject || projects[0]?.id;
    if (!pid) {
      notify("Create a project before uploading files.");
      return;
    }
    await action(async () => {
      let path = "";
      if (demo) {
        if (file.size > 2 * 1024 * 1024)
          throw new Error(
            "Demo files are limited to 2 MB. Connected storage supports 10 MB.",
          );
        path = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      } else {
        path = storagePath(org.id, pid, file.name);
        const { error } = await browserDB()
          .storage.from("project-files")
          .upload(path, file);
        if (error) throw error;
      }
      try {
        await mutate("documents", {
          project_id: pid,
          name: file.name,
          path,
          kind: file.type.startsWith("image/") ? "photo" : "document",
          size: file.size,
          client_visible: false,
        });
      } catch (e) {
        if (!demo)
          await browserDB().storage.from("project-files").remove([path]);
        throw e;
      }
      notify("Uploaded privately. Use “Share with client” when ready.");
    });
  }
  async function download(doc: Row) {
    await action(async () => {
      let url = doc.path;
      if (!demo) {
        const { data, error } = await browserDB()
          .storage.from("project-files")
          .createSignedUrl(doc.path, 60, { download: doc.name });
        if (error) throw error;
        url = data.signedUrl;
      }
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.name;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.click();
    });
  }
  const navigate = (next: View) => {
    setView(next);
    if (next === "Messages") {
      const target =
        projects.find((p) => p.id === currentConversation) || projects[0];
      setDeliveryChannel(target?.preferred_message_channel || "portal");
    }
    setSelected(null);
    setQuery("");
    setMobile(false);
  };
  const openProject = (id: string) => {
    setSelected(id);
    setView("Projects");
    setTab("Overview");
  };
  const projectOptions = projects.map((p) => (
    <option key={p.id} value={p.id}>
      {p.name}
    </option>
  ));
  const empty = (title: string, body: string) => (
    <div className="empty">
      <FolderOpen size={30} />
      <h3>{title}</h3>
      <p>{body}</p>
    </div>
  );
  if (loading)
    return (
      <div className="loading">
        <Building2 size={36} />
        <h2>Opening your workspace…</h2>
      </div>
    );
  if (!authenticated)
    return (
      <main className="auth-page">
        <div className="auth-art">
          <Brand />
          <div>
            <span className="eyebrow">BUILT ON CONNECTION</span>
            <h1>
              Great projects.
              <br />
              Even better relationships.
            </h1>
            <p>One shared home for every step of your ADU journey.</p>
            <img src="/adu.svg" alt="Modern backyard accessory dwelling unit" />
          </div>
          <small>Your projects, connected.</small>
        </div>
        <div className="auth-form">
          <span className="eyebrow">WELCOME TO OMNIBUILD</span>
          <h1>
            {authMode === "signup"
              ? "Build something great."
              : "Good to see you again."}
          </h1>
          <p>
            {portalSlug
              ? "Sign in to your homeowner portal."
              : "Your team, your clients, and your projects. All together."}
          </p>
          <form onSubmit={auth}>
            {input("Email address", "email", "", "email")}
            {input("Password", "password", "", "password")}
            <button className="button primary" disabled={busy}>
              {busy
                ? "Please wait…"
                : authMode === "signup"
                  ? "Create account"
                  : "Sign in"}
              <ArrowRight size={16} />
            </button>
          </form>
          <button
            className="text-button"
            onClick={() =>
              setAuthMode(authMode === "login" ? "signup" : "login")
            }
          >
            {authMode === "login"
              ? "New here? Create an account"
              : "Already have an account? Sign in"}
          </button>
          {toast && (
            <p role="status" className="auth-notice">
              {toast}
            </p>
          )}
        </div>
      </main>
    );
  if (!demo && !org)
    return (
      <main className="onboarding">
        <Brand />
        <h1>Your workspace is not available.</h1>
        <p>
          Use the account invited by Omnibuild or your contractor. Contractor
          accounts are created from the Omnibuild hub.
        </p>
        <a className="button" href="/">
          Return to Omnibuild
        </a>
        <button
          className="text-button"
          onClick={() =>
            action(async () => {
              await browserDB().auth.signOut();
              setAuthenticated(false);
            })
          }
        >
          Sign out
        </button>
        {toast && <p role="status">{toast}</p>}
      </main>
    );
  if (targetSlug && org?.slug !== targetSlug)
    return (
      <main className="onboarding">
        <Brand />
        <h1>Portal not found</h1>
        <p>Check the portal address provided by your contractor.</p>
        <a href="/">Back to workspace</a>
      </main>
    );
  const upcoming = milestones
    .filter((m) => !m.completed)
    .sort((a, b) => (a.due_date || "9999").localeCompare(b.due_date || "9999"))
    .slice(0, 4);
  const shownProjects = projects.filter(
    (p) =>
      (filter === "All projects" || p.status === filter) &&
      (p.name + " " + p.address + " " + clientName(p.client_id))
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const currentConversation = conversation || projects[0]?.id;
  return (
    <div className="app-shell">
      {mobile && <div className="scrim" onClick={() => setMobile(false)} />}
      <aside className={"sidebar " + (mobile ? "open" : "")}>
        <Brand />
        <div className="company">
          <span className="company-icon">
            {org.logo_url ? (
              <img
                src={org.logo_url}
                alt="Company logo"
                style={{ width: 30, height: 30, objectFit: "contain" }}
              />
            ) : (
              <House size={20} />
            )}
          </span>
          <div>
            <strong>{org.name}</strong>
            <span>
              {clientMode ? "Homeowner portal" : "Contractor workspace"}
            </span>
          </div>
          {data.organizations.length > 1 ? (
            <select
              aria-label="Switch organization"
              value={orgId}
              onChange={(e) => {
                const next = data.organizations.find(
                  (o) => o.id === e.target.value,
                );
                if (next)
                  location.assign(
                    `${clientMode ? "/portal" : "/workspace"}/${next.slug}`,
                  );
              }}
            >
              {data.organizations.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          ) : (
            <ChevronDown size={15} />
          )}
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav>
          {(
            [
              "Overview",
              "Projects",
              ...(!clientMode ? ["Clients"] : []),
              "Messages",
              "Documents",
            ] as View[]
          ).map((item) => {
            const Icon = icons[item];
            return (
              <button
                key={item === "Clients" ? "Homeowners" : item}
                aria-label={item === "Clients" ? "Homeowners" : item}
                className={view === item ? "nav-item active" : "nav-item"}
                onClick={() => navigate(item)}
              >
                <Icon size={19} />
                {item === "Clients" ? "Homeowners" : item}
                {item === "Messages" && messages.length > 0 && (
                  <span className="nav-count">{messages.length}</span>
                )}
              </button>
            );
          })}
        </nav>
        {!clientMode && (
          <>
            <div className="nav-label tools-label">TOOLS & SETTINGS</div>
            <nav>
              {(["Templates", "Settings"] as View[]).map((item) => {
                const Icon = icons[item];
                return (
                  <button
                    key={item === "Clients" ? "Homeowners" : item}
                    aria-label={item === "Clients" ? "Homeowners" : item}
                    className={view === item ? "nav-item active" : "nav-item"}
                    onClick={() => navigate(item)}
                  >
                    <Icon size={19} />
                    {item === "Templates" ? "Message templates" : item}
                  </button>
                );
              })}
            </nav>
          </>
        )}
        <div className="sidebar-bottom">
          <div className="portal-card">
            <span className="portal-symbol">
              <House size={20} />
              <ExternalLink size={13} />
            </span>
            <strong>
              {clientMode
                ? "A little closer to home."
                : "Your client portal, ready."}
            </strong>
            <p>
              {clientMode
                ? "Stay connected to every step of your project."
                : "A simple link. A better experience for your clients."}
            </p>
            <a
              href={clientMode ? "/" : `/portal/${org.slug}`}
              target={clientMode ? "_self" : "_blank"}
              rel="noreferrer"
            >
              {clientMode ? "Contractor workspace" : "View client portal"}
              <ArrowUpRight size={15} />
            </a>
          </div>
          <div className="profile">
            <Avatar name={clientMode ? "Sarah Miller" : org.name} />
            <div>
              <strong>
                {clientMode
                  ? "Homeowner"
                  : owner
                    ? "Workspace owner"
                    : "Team member"}
              </strong>
              <span>{demo ? "Demo workspace" : "Connected to Supabase"}</span>
            </div>
            <button
              title="Sign out"
              aria-label="Sign out"
              onClick={() =>
                demo
                  ? notify(
                      "You are exploring the demo. Connect Supabase to use account login.",
                    )
                  : action(async () => {
                      await browserDB().auth.signOut();
                      setAuthenticated(false);
                    })
              }
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      <div className="main-wrap">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="mobile-menu"
              aria-label="Open navigation"
              onClick={() => setMobile(true)}
            >
              <Menu size={21} />
            </button>
            <span>{clientMode ? "Client portal" : "Workspace"}</span>
            <ChevronRight size={14} />
            <strong>{view}</strong>
            {project && (
              <>
                <ChevronRight size={14} />
                <strong className="crumb-project">{project.name}</strong>
              </>
            )}
          </div>
          <div className="top-actions">
            {demo && <span className="demo-tag">Demo mode</span>}
            <span className="today">
              <CalendarDays size={15} />
              {new Date().toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            <div className="notification-wrap">
              <button
                className="notification"
                aria-label="Show recent activity"
                onClick={() => setNotices(!notices)}
              >
                <Bell size={19} />
                {updates.length > 0 && <i />}
              </button>
              {notices && (
                <div className="notification-pop">
                  <h3>Recent activity</h3>
                  {updates.slice(0, 3).map((u) => (
                    <button
                      key={u.id}
                      onClick={() => {
                        openProject(u.project_id);
                        setTab("Updates");
                        setNotices(false);
                      }}
                    >
                      {u.title}
                      <small>{moneylessDate(u.created_at)}</small>
                    </button>
                  ))}
                  {!updates.length && <p>You’re all caught up.</p>}
                </div>
              )}
            </div>
            <Avatar name={clientMode ? "Sarah Miller" : org.name} />
          </div>
        </header>
        <main className="content">
          {!project && (
            <div className="page-heading">
              <div>
                <div className="eyebrow">
                  {view === "Overview"
                    ? "A CLEAR VIEW. A CONFIDENT NEXT STEP."
                    : clientMode
                      ? "YOUR HOME, COMING TOGETHER"
                      : "LESS ADMIN. MORE BUILDING."}
                </div>
                <h1>
                  {view === "Overview"
                    ? clientMode
                      ? "Your next chapter starts here."
                      : "Good things are taking shape."
                    : view === "Templates"
                      ? "Message templates"
                      : view === "Settings"
                        ? "Workspace settings"
                        : view === "Clients"
                          ? "Homeowners"
                          : view}
                </h1>
                <p>
                  {
                    {
                      Overview: clientMode
                        ? "Follow your project, see what’s new, and stay in touch."
                        : "Here’s what’s happening across your projects today.",
                      Projects:
                        "Every build, from the first sketch to the final walkthrough.",
                      Clients:
                        "Your homeowners and their project relationships.",
                      Messages:
                        "Keep the conversation moving, all in one place.",
                      Documents:
                        "Plans, paperwork, and progress. Right where you need them.",
                      Templates:
                        "Thoughtful communication, without starting from scratch.",
                      Settings: "Make your workspace feel like your company.",
                    }[view]
                  }
                </p>
              </div>
              {!clientMode &&
                ["Overview", "Projects", "Clients", "Templates"].includes(
                  view,
                ) &&
                (view !== "Templates" || owner) && (
                  <button
                    className="button primary"
                    onClick={() =>
                      setModal({
                        kind:
                          view === "Clients"
                            ? "client"
                            : view === "Templates"
                              ? "template"
                              : "project",
                      })
                    }
                  >
                    <Plus size={17} />
                    {view === "Clients"
                      ? "Add client"
                      : view === "Templates"
                        ? "New template"
                        : "New project"}
                  </button>
                )}
            </div>
          )}
          {view === "Overview" && (
            <>
              <div className="stat-grid">
                {[
                  {
                    label: "Active projects",
                    value: active.length,
                    icon: FolderOpen,
                    detail: `${projects.filter((p) => p.status === "In progress").length} currently under construction`,
                    color: "green",
                  },
                  {
                    label: clientMode ? "Project milestones" : "Homeowners",
                    value: clientMode
                      ? milestones.filter((m) => m.completed).length
                      : clients.filter((c) => !c.archived).length,
                    icon: clientMode ? CheckCheck : Users,
                    detail: clientMode
                      ? "Steps closer to your new home"
                      : "Building relationships that last",
                    color: "orange",
                  },
                  {
                    label: "Upcoming milestones",
                    value: milestones.filter((m) => !m.completed).length,
                    icon: CalendarDays,
                    detail: "The next steps on your timeline",
                    color: "blue",
                  },
                  {
                    label: "Conversations",
                    value: new Set(messages.map((m) => m.project_id)).size,
                    icon: MessageSquare,
                    detail: clientMode
                      ? "A direct line to your project team"
                      : "Stay connected with your clients",
                    color: "purple",
                  },
                ].map((s) => (
                  <div className="stat-card" key={s.label}>
                    <div className="stat-top">
                      <span>{s.label}</span>
                      <span className={"stat-icon " + s.color}>
                        <s.icon size={18} />
                      </span>
                    </div>
                    <strong>{s.value.toString().padStart(2, "0")}</strong>
                    <p>{s.detail}</p>
                  </div>
                ))}
              </div>
              <div className="overview-columns">
                <section>
                  <div className="section-heading">
                    <h2>
                      {clientMode ? "Your projects" : "Projects in motion"}
                      <span className="count">{active.length}</span>
                    </h2>
                    <button
                      className="text-button"
                      onClick={() => navigate("Projects")}
                    >
                      View all projects <ArrowRight size={15} />
                    </button>
                  </div>
                  <div className="project-grid">
                    {active.slice(0, 2).map((p, i) => (
                      <ProjectCard
                        key={p.id}
                        p={p}
                        client={clientName(p.client_id)}
                        progress={progress(p.id)}
                        index={i}
                        open={() => openProject(p.id)}
                      />
                    ))}
                    {!active.length &&
                      empty(
                        "Room for something great",
                        "Create your first project to start building together.",
                      )}
                  </div>
                  <section className="panel activity-panel">
                    <div className="section-heading">
                      <h2>Latest updates</h2>
                      <span className="subtle">Across your projects</span>
                    </div>
                    {updates
                      .slice()
                      .sort((a, b) => b.created_at.localeCompare(a.created_at))
                      .slice(0, 3)
                      .map((u, i) => (
                        <button
                          className="activity-row"
                          key={u.id}
                          onClick={() => {
                            openProject(u.project_id);
                            setTab("Updates");
                          }}
                        >
                          <span className={"activity-icon color-" + i}>
                            {i === 0 ? (
                              <House size={18} />
                            ) : (
                              <ClipboardList size={18} />
                            )}
                          </span>
                          <div>
                            <strong>{u.title}</strong>
                            <p>
                              {
                                projects.find((p) => p.id === u.project_id)
                                  ?.name
                              }
                              {!u.client_visible && (
                                <span className="private-label">Internal</span>
                              )}
                            </p>
                          </div>
                          <span className="activity-date">
                            {moneylessDate(u.created_at)}
                            <ChevronRight size={16} />
                          </span>
                        </button>
                      ))}
                    {!updates.length &&
                      empty(
                        "A fresh start",
                        "Project updates will appear here.",
                      )}
                  </section>
                </section>
                <aside className="right-column">
                  <section className="panel upcoming">
                    <div className="section-heading">
                      <h2>Coming up next</h2>
                      <CalendarDays size={18} />
                    </div>
                    {upcoming.map((m) => (
                      <button
                        className="milestone-preview"
                        key={m.id}
                        onClick={() => openProject(m.project_id)}
                      >
                        <span className="date-box">
                          <small>
                            {m.due_date
                              ? new Date(
                                  m.due_date + "T12:00:00",
                                ).toLocaleDateString("en-US", {
                                  month: "short",
                                })
                              : "TBD"}
                          </small>
                          <strong>
                            {m.due_date ? m.due_date.slice(8, 10) : "—"}
                          </strong>
                        </span>
                        <span>
                          <strong>{m.title}</strong>
                          <small>
                            {projects.find((p) => p.id === m.project_id)?.name}
                          </small>
                        </span>
                        <ChevronRight size={14} />
                      </button>
                    ))}
                    {!upcoming.length && (
                      <p className="subtle">
                        No upcoming milestones. You’re all caught up.
                      </p>
                    )}
                    <div className="panel-foot">
                      <span className="live-dot" />
                      One milestone closer to home.
                    </div>
                  </section>
                  <section className="connection-card">
                    <span className="connection-icon">
                      <MessageSquare size={21} />
                      <Sparkles size={14} />
                    </span>
                    <h3>A quick update goes a long way.</h3>
                    <p>
                      Keep your clients in the loop. A little communication
                      builds a lot of confidence.
                    </p>
                    <button
                      className="button"
                      onClick={() =>
                        clientMode
                          ? navigate("Messages")
                          : projects.length
                            ? setModal({ kind: "update" })
                            : notify("Create a project to share an update.")
                      }
                    >
                      {clientMode ? "Send a message" : "Share an update"}
                      <ArrowRight size={15} />
                    </button>
                  </section>
                </aside>
              </div>
            </>
          )}
          {view === "Projects" && !project && (
            <>
              <div className="toolbar">
                <div className="filter-tabs">
                  {[
                    "All projects",
                    "In progress",
                    "Planning",
                    "Permitting",
                    "Completed",
                  ].map((f) => (
                    <button
                      className={filter === f ? "selected" : ""}
                      key={f}
                      onClick={() => setFilter(f)}
                    >
                      {f}
                      {f === "All projects" && <span>{projects.length}</span>}
                    </button>
                  ))}
                </div>
                <SearchBox
                  query={query}
                  setQuery={setQuery}
                  placeholder="Search projects…"
                />
              </div>
              <div className="all-projects">
                {shownProjects.map((p, i) => (
                  <ProjectCard
                    key={p.id}
                    p={p}
                    client={clientName(p.client_id)}
                    progress={progress(p.id)}
                    index={i}
                    open={() => openProject(p.id)}
                  />
                ))}
              </div>
              {!shownProjects.length &&
                empty(
                  "No projects found",
                  "Try a different search or create a new project.",
                )}
            </>
          )}
          {project && (
            <>
              <button className="back-link" onClick={() => setSelected(null)}>
                <ArrowLeft size={15} /> All projects
              </button>
              <div className="project-heading">
                <div>
                  <Badge status={project.status} />
                  <h1>{project.name}</h1>
                  <p>
                    <MapPin size={15} />
                    {project.address}
                  </p>
                </div>
                {!clientMode && (
                  <button
                    className="button"
                    onClick={() => setModal({ kind: "project", row: project })}
                  >
                    Edit project
                  </button>
                )}
              </div>
              <div className="detail-tabs">
                {["Overview", "Updates", "Documents", "Photos", "Messages"].map(
                  (t) => (
                    <button
                      key={t}
                      className={tab === t ? "selected" : ""}
                      onClick={() => {
                        setTab(t);
                        if (t === "Messages") {
                          setConversation(project.id);
                          setDeliveryChannel(
                            project.preferred_message_channel || "portal",
                          );
                        }
                      }}
                    >
                      {t}
                    </button>
                  ),
                )}
              </div>
              {tab === "Overview" && (
                <div className="detail-grid">
                  <div>
                    <div className="detail-image">
                      <img src="/adu.svg" alt="Illustration of an ADU home" />
                      <span>PROJECT VISION · ILLUSTRATION</span>
                    </div>
                    <section className="panel">
                      <h2>About this project</h2>
                      <p className="description">
                        {project.description ||
                          "Add a project overview to keep everyone on the same page."}
                      </p>
                      <div className="project-facts">
                        <div>
                          <span>HOMEOWNER</span>
                          <strong>{clientName(project.client_id)}</strong>
                        </div>
                        <div>
                          <span>TARGET COMPLETION</span>
                          <strong>
                            {moneylessDate(project.due_date)}
                            {project.due_date
                              ? ", " + project.due_date.slice(0, 4)
                              : ""}
                          </strong>
                        </div>
                      </div>
                    </section>
                  </div>
                  <section className="panel">
                    <div className="section-heading">
                      <h2>Project milestones</h2>
                      {!clientMode && (
                        <button
                          className="icon-button"
                          aria-label="Add milestone"
                          onClick={() => setModal({ kind: "milestone" })}
                        >
                          <Plus size={18} />
                        </button>
                      )}
                    </div>
                    <div className="progress-label">
                      <strong>{progress(project.id)}% complete</strong>
                      <span>
                        {
                          milestones.filter(
                            (m) => m.project_id === project.id && m.completed,
                          ).length
                        }{" "}
                        milestones completed
                      </span>
                    </div>
                    <div className="progress-track">
                      <i style={{ width: progress(project.id) + "%" }} />
                    </div>
                    <div className="timeline">
                      {milestones
                        .filter((m) => m.project_id === project.id)
                        .sort((a, b) =>
                          (a.due_date || "9999").localeCompare(
                            b.due_date || "9999",
                          ),
                        )
                        .map((m) => (
                          <div
                            className={
                              "timeline-item " + (m.completed ? "done" : "")
                            }
                            key={m.id}
                          >
                            <button
                              disabled={clientMode || busy}
                              aria-label={`${m.completed ? "Reopen" : "Complete"} ${m.title}`}
                              onClick={() =>
                                action(async () => {
                                  await mutate(
                                    "milestones",
                                    { completed: !m.completed },
                                    m.id,
                                  );
                                })
                              }
                            >
                              {m.completed ? <Check size={14} /> : <span />}
                            </button>
                            <div>
                              <strong>{m.title}</strong>
                              <small>{moneylessDate(m.due_date)}</small>
                            </div>
                            {m.completed && (
                              <span className="subtle">Done</span>
                            )}
                          </div>
                        ))}
                    </div>
                    {!milestones.some((m) => m.project_id === project.id) &&
                      empty(
                        "The journey starts here",
                        "Add the key steps for this project.",
                      )}
                  </section>
                </div>
              )}
              {tab === "Updates" && (
                <section className="panel">
                  <div className="section-heading">
                    <h2>Project updates</h2>
                    {!clientMode && (
                      <button
                        className="button primary"
                        onClick={() => setModal({ kind: "update" })}
                      >
                        <Plus size={16} />
                        New update
                      </button>
                    )}
                  </div>
                  {updates
                    .filter((u) => u.project_id === project.id)
                    .map((u) => (
                      <article className="update-card" key={u.id}>
                        <div className="update-meta">
                          <Avatar name={org.name} />
                          <div>
                            <strong>{org.name}</strong>
                            <small>{moneylessDate(u.created_at)}</small>
                          </div>
                          <span
                            className={
                              "visibility " +
                              (!u.client_visible ? "internal" : "")
                            }
                          >
                            {u.client_visible
                              ? "Shared with client"
                              : "Internal only"}
                          </span>
                        </div>
                        <h3>{u.title}</h3>
                        <p>{u.body}</p>
                      </article>
                    ))}
                  {!updates.some((u) => u.project_id === project.id) &&
                    empty(
                      "Updates start here",
                      "Share progress and keep everyone in the loop.",
                    )}
                </section>
              )}
              {(tab === "Documents" || tab === "Photos") &&
                renderDocuments(
                  docs.filter(
                    (d) =>
                      d.project_id === project.id &&
                      d.kind === (tab === "Photos" ? "photo" : "document"),
                  ),
                )}
              {tab === "Messages" && renderMessages()}
            </>
          )}
          {view === "Clients" && (
            <>
              <div className="toolbar">
                <span className="subtle">
                  {clients.filter((c) => !c.archived).length} active clients
                </span>
                <SearchBox
                  query={query}
                  setQuery={setQuery}
                  placeholder="Find a client…"
                />
              </div>
              <div className="panel table-panel">
                <table>
                  <thead>
                    <tr>
                      <th>Client</th>
                      <th>Contact</th>
                      <th>Projects</th>
                      <th>Status</th>
                      <th>
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {clients
                      .filter((c) =>
                        (c.name + " " + c.email)
                          .toLowerCase()
                          .includes(query.toLowerCase()),
                      )
                      .map((c, i) => (
                        <tr key={c.id}>
                          <td>
                            <div className="person">
                              <Avatar name={c.name} color={i % 4} />
                              <strong>{c.name}</strong>
                            </div>
                          </td>
                          <td>
                            <span>{c.email}</span>
                            <small>{c.phone}</small>
                          </td>
                          <td>
                            {
                              projects.filter((p) => p.client_id === c.id)
                                .length
                            }{" "}
                            projects
                          </td>
                          <td>
                            <Badge
                              status={c.archived ? "Archived" : "Active"}
                            />
                          </td>
                          <td>
                            <div className="row-actions">
                              <button
                                className="text-button"
                                onClick={() =>
                                  setModal({ kind: "client", row: c })
                                }
                              >
                                Edit
                              </button>
                              {owner && !c.archived && (
                                <button
                                  className="icon-button"
                                  aria-label={`Invite ${c.name}`}
                                  title="Invite to portal"
                                  onClick={() =>
                                    setModal({ kind: "invite", row: c })
                                  }
                                >
                                  <Mail size={17} />
                                </button>
                              )}
                              <button
                                className="text-button"
                                onClick={() =>
                                  action(async () => {
                                    await mutate(
                                      "clients",
                                      { archived: !c.archived },
                                      c.id,
                                    );
                                    notify(
                                      c.archived
                                        ? "Client restored"
                                        : "Client archived; portal access removed",
                                    );
                                  })
                                }
                              >
                                {c.archived ? "Restore" : "Archive"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                {!clients.length &&
                  empty(
                    "Meet your future clients",
                    "Add your first client to get started.",
                  )}
              </div>
            </>
          )}
          {view === "Messages" && (
            <>
              {!clientMode && (
                <div className="detail-tabs">
                  <button
                    className={messageChannel === "projects" ? "selected" : ""}
                    onClick={() => setMessageChannel("projects")}
                  >
                    Homeowner messages
                  </button>
                  <button
                    className={messageChannel === "inquiries" ? "selected" : ""}
                    onClick={() => setMessageChannel("inquiries")}
                  >
                    WhatsApp inquiries
                  </button>
                </div>
              )}
              {messageChannel === "inquiries" && !clientMode ? (
                <Communications organizations={[org]} organizationId={org.id} />
              ) : (
                renderMessages()
              )}
            </>
          )}
          {view === "Documents" &&
            renderDocuments(
              docs.filter((d) =>
                d.name.toLowerCase().includes(query.toLowerCase()),
              ),
            )}
          {view === "Templates" && (
            <div className="template-grid">
              {templates.map((t) => (
                <article className="panel template-card" key={t.id}>
                  <span className="template-icon">
                    <MessageSquare size={22} />
                  </span>
                  <h3>{t.title}</h3>
                  <p>{t.body}</p>
                  <div className="response-preview">
                    {t.responses.map((r: string) => (
                      <span key={r}>{r}</span>
                    ))}
                  </div>
                  <div className="template-footer">
                    {owner && (
                      <button
                        className="text-button"
                        onClick={() => setModal({ kind: "template", row: t })}
                      >
                        Edit template
                      </button>
                    )}
                    <button
                      className="text-button"
                      onClick={() => {
                        setMessage(t.body);
                        setResponses(t.responses);
                        navigate("Messages");
                      }}
                    >
                      Use template
                      <ArrowUpRight size={15} />
                    </button>
                  </div>
                </article>
              ))}
              {!templates.length &&
                empty(
                  "Your words, ready to go",
                  "Create a template for your most common project messages.",
                )}
            </div>
          )}
          {view === "Settings" && (
            <div className="settings-grid">
              <section className="panel">
                <h2>Company profile</h2>
                <p className="subtle">
                  The details your clients will see in their portal.
                </p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    const channels = f.getAll("message_channels").map(String);
                    if (!channels.length) {
                      notify("Choose at least one communication channel.");
                      return;
                    }
                    action(async () => {
                      const values = {
                        name: String(f.get("name")),
                        logo_url: String(f.get("logo_url")) || null,
                        enabled_message_channels: channels,
                      };
                      if (demo) {
                        const next = {
                          ...data,
                          organizations: data.organizations.map((o) =>
                            o.id === org.id ? { ...o, ...values } : o,
                          ),
                        };
                        localStorage.setItem(
                          "omnibuild-demo-v1",
                          JSON.stringify(next),
                        );
                        setData(next);
                      } else {
                        const { error } = await browserDB()
                          .from("organizations")
                          .update(values)
                          .eq("id", org.id);
                        if (error) throw error;
                        await reload();
                      }
                      notify("Company profile saved");
                    });
                  }}
                >
                  {input("Company name", "name", org.name)}
                  {input(
                    "Logo URL (https)",
                    "logo_url",
                    org.logo_url,
                    "url",
                    false,
                  )}
                  {org.logo_url && (
                    <img
                      className="logo-preview"
                      src={org.logo_url}
                      alt="Company logo"
                    />
                  )}
                  <fieldset
                    className="channel-settings"
                    disabled={!owner || busy}
                  >
                    <legend>Available communication channels</legend>
                    <p className="subtle">
                      Portal messages work now. External channels require a
                      provider connection before delivery.
                    </p>
                    {Object.entries(channelLabels).map(([value, label]) => (
                      <label key={value}>
                        <input
                          type="checkbox"
                          name="message_channels"
                          value={value}
                          defaultChecked={enabledChannels.includes(value)}
                        />
                        {label}
                      </label>
                    ))}
                  </fieldset>
                  <button className="button primary" disabled={!owner || busy}>
                    Save changes
                  </button>
                  {!owner && (
                    <p className="subtle">
                      Only the owner can update the company profile.
                    </p>
                  )}
                </form>
              </section>
              <div>
                <section className="panel">
                  <span className="template-icon">
                    <ExternalLink size={20} />
                  </span>
                  <h2>Your client portal</h2>
                  <p className="subtle">
                    Add this link to your existing website so clients can access
                    their projects.
                  </p>
                  <div className="copy-field">
                    <code>/portal/{org.slug}</code>
                    <button
                      aria-label="Copy portal URL"
                      onClick={() =>
                        action(async () => {
                          await navigator.clipboard.writeText(
                            `${location.origin}/portal/${org.slug}`,
                          );
                          notify("Portal link copied");
                        })
                      }
                    >
                      <Copy size={17} />
                    </button>
                  </div>
                  <a
                    className="text-button"
                    href={`/portal/${org.slug}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open portal
                    <ArrowUpRight size={15} />
                  </a>
                </section>
                <section className="panel team-panel">
                  <div className="section-heading">
                    <h2>Your team</h2>
                    {owner && (
                      <button
                        className="text-button"
                        onClick={() => setModal({ kind: "invite" })}
                      >
                        <Plus size={15} />
                        Invite staff
                      </button>
                    )}
                  </div>
                  {scope(data.memberships).map((m) => (
                    <div className="team-member" key={m.user_id}>
                      <ShieldCheck size={20} />
                      <div>
                        <strong>
                          {m.user_id === userId
                            ? "You"
                            : `Team member · ${m.user_id.slice(0, 8)}`}
                        </strong>
                        <small>{m.role}</small>
                      </div>
                    </div>
                  ))}
                </section>
              </div>
            </div>
          )}
          <footer className="footer">
            <span>
              <span className="live-dot" />
              {demo
                ? "Demo workspace · Changes saved in this browser"
                : "Your workspace is connected"}
            </span>
            <span>
              Built for the way you build.
              <span className="footer-brand">omnibuild</span>
            </span>
          </footer>
        </main>
      </div>
      <input
        ref={fileRef}
        type="file"
        className="sr-only"
        accept=".pdf,.jpg,.jpeg,.png,.webp,.txt"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
          e.target.value = "";
        }}
      />
      {toast && (
        <div className="toast" role="status">
          <CheckCheck size={18} />
          {toast}
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {modal && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget && !busy) setModal(null);
          }}
        >
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <div className="modal-header">
              <div>
                <span className="eyebrow">LET’S KEEP THINGS MOVING</span>
                <h2 id="modal-title">
                  {modal.kind === "invite"
                    ? "Invite " + (modal.row ? "client" : "team member")
                    : modal.row
                      ? "Edit " + modal.kind
                      : "New " + modal.kind}
                </h2>
              </div>
              <button
                className="icon-button"
                aria-label="Close dialog"
                onClick={() => setModal(null)}
                disabled={busy}
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={saveForm}>
              {modal.kind === "client" && (
                <>
                  {input("Full name", "name", modal.row?.name)}
                  {input("Email address", "email", modal.row?.email, "email")}
                  {input(
                    "Phone number",
                    "phone",
                    modal.row?.phone,
                    "tel",
                    false,
                  )}
                </>
              )}
              {modal.kind === "project" && (
                <>
                  {input("Project name", "name", modal.row?.name)}
                  <label className="field">
                    Client
                    <select
                      aria-label="Client"
                      name="client_id"
                      required
                      defaultValue={modal.row?.client_id || ""}
                    >
                      <option value="" disabled>
                        Select a client
                      </option>
                      {clients
                        .filter((c) => !c.archived)
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                    </select>
                  </label>
                  {!clients.some((c) => !c.archived) && (
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => setModal({ kind: "client" })}
                    >
                      Add a client first <ArrowRight size={14} />
                    </button>
                  )}
                  {input("Project address", "address", modal.row?.address)}
                  <label className="field">
                    Overview
                    <textarea
                      name="description"
                      defaultValue={modal.row?.description}
                    />
                  </label>
                  <div className="form-grid">
                    <label className="field">
                      Status
                      <select
                        aria-label="Status"
                        name="status"
                        defaultValue={modal.row?.status || "Planning"}
                      >
                        {[
                          "Planning",
                          "Permitting",
                          "In progress",
                          "On hold",
                          "Completed",
                        ].map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </label>
                    {input(
                      "Target completion",
                      "due_date",
                      modal.row?.due_date,
                      "date",
                      false,
                    )}
                  </div>
                  <label className="field">
                    Default communication channel
                    <select
                      name="preferred_message_channel"
                      defaultValue={
                        modal.row?.preferred_message_channel || "portal"
                      }
                    >
                      {enabledChannels.map((channel) => (
                        <option key={channel} value={channel}>
                          {channelLabels[channel]}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              )}
              {modal.kind === "milestone" && (
                <>
                  {input("Milestone name", "title")}
                  {input("Target date", "due_date", "", "date", false)}
                </>
              )}
              {modal.kind === "update" && (
                <>
                  <label className="field">
                    Project
                    <select
                      aria-label="Project"
                      name="project_id"
                      defaultValue={project?.id}
                      required
                    >
                      {projectOptions}
                    </select>
                  </label>
                  {input("Update title", "title")}
                  <label className="field">
                    What’s new?
                    <textarea name="body" required rows={4} />
                  </label>
                  <label className="field">
                    Who can see this?
                    <select aria-label="Who can see this?" name="visibility">
                      <option value="client">Client and your team</option>
                      <option value="internal">
                        Your team only (internal)
                      </option>
                    </select>
                  </label>
                </>
              )}
              {modal.kind === "template" && (
                <>
                  {input("Template name", "title", modal.row?.title)}
                  <label className="field">
                    Default channel
                    <select
                      name="channel"
                      defaultValue={modal.row?.channel || "portal"}
                    >
                      {enabledChannels.map((channel) => (
                        <option key={channel} value={channel}>
                          {channelLabels[channel]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    Message
                    <textarea
                      name="body"
                      defaultValue={modal.row?.body}
                      required
                      rows={4}
                      maxLength={5000}
                    />
                  </label>
                  <label className="field">
                    Quick responses (one per line)
                    <textarea
                      name="responses"
                      defaultValue={modal.row?.responses.join("\n")}
                      placeholder={
                        "Yes, that works!\nCould we find another time?"
                      }
                      rows={3}
                    />
                  </label>
                  <p className="subtle">
                    Clients can always write their own response.
                  </p>
                </>
              )}
              {modal.kind === "invite" && (
                <>
                  <p className="description">
                    {modal.row
                      ? `${modal.row.name} will receive an email to access their projects in your portal.`
                      : "Invite a staff member to manage clients, projects, and communication. Only owners can invite new members."}
                  </p>
                  {input("Email address", "email", modal.row?.email, "email")}{" "}
                  {demo && (
                    <p className="auth-notice">
                      Demo preview. Email delivery requires a connected Supabase
                      project.
                    </p>
                  )}
                </>
              )}
              <div className="modal-footer">
                <button
                  type="button"
                  className="button"
                  onClick={() => setModal(null)}
                  disabled={busy}
                >
                  Cancel
                </button>
                <button className="button primary" disabled={busy}>
                  {busy
                    ? "Saving…"
                    : modal.kind === "invite"
                      ? "Send invitation"
                      : "Save " + modal.kind}
                  <ArrowRight size={16} />
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
  function renderDocuments(items: Row[]) {
    return (
      <section className="panel">
        <div className="section-heading">
          <h2>
            {tab === "Photos" && project ? "Project photos" : "Project files"}{" "}
            <span className="count">{items.length}</span>
          </h2>
          {!clientMode && (
            <div className="upload-actions">
              {!project && (
                <select
                  aria-label="Upload to project"
                  value={uploadProject || projects[0]?.id || ""}
                  onChange={(e) => setUploadProject(e.target.value)}
                >
                  {projectOptions}
                </select>
              )}
              <button
                className="button primary"
                disabled={busy || !projects.length}
                onClick={() => fileRef.current?.click()}
              >
                <Plus size={16} />
                Upload file
              </button>
            </div>
          )}
        </div>
        {view === "Documents" && (
          <SearchBox
            query={query}
            setQuery={setQuery}
            placeholder="Search files…"
          />
        )}
        {items.length ? (
          <div className="files-list">
            {items.map((d) => (
              <div className="file-row" key={d.id}>
                <span className="file-icon">
                  {d.kind === "photo" ? (
                    <ImageIcon size={23} />
                  ) : (
                    <FileText size={23} />
                  )}
                </span>
                <div>
                  <strong>{d.name}</strong>
                  <small>
                    {projects.find((p) => p.id === d.project_id)?.name} ·{" "}
                    {Math.max(1, Math.round(d.size / 1024))} KB
                  </small>
                </div>
                <span className="visibility">
                  {d.client_visible ? "Client visible" : "Internal"}
                </span>
                {!clientMode && (
                  <button
                    className="text-button"
                    disabled={busy}
                    onClick={() =>
                      action(async () => {
                        await mutate(
                          "documents",
                          { client_visible: !d.client_visible },
                          d.id,
                        );
                      })
                    }
                  >
                    {d.client_visible ? "Make private" : "Share with client"}
                  </button>
                )}
                <button
                  className="icon-button"
                  aria-label={`Download ${d.name}`}
                  onClick={() => download(d)}
                >
                  <ArrowDownToLine size={18} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="upload-empty">
            <div className="empty-file-icons">
              <FileText />
              <ImageIcon />
              <FolderOpen />
            </div>
            <h3>A place for every project detail.</h3>
            <p>
              {clientMode
                ? "Your contractor will share plans, documents, and progress photos here."
                : "Upload plans, documents, and progress photos. Choose what to share with your clients."}
            </p>
            <small>
              PDF, JPG, PNG, WebP, TXT · Up to {demo ? "2" : "10"} MB per file
            </small>
          </div>
        )}
      </section>
    );
  }
  function renderMessages() {
    const thread = messages
      .filter((m) => m.project_id === currentConversation)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
    return (
      <section className="messaging panel">
        <aside className="conversation-list">
          <h3>
            Conversations <span className="count">{projects.length}</span>
          </h3>
          {projects.map((p, i) => (
            <button
              key={p.id}
              className={
                "conversation " +
                (currentConversation === p.id ? "selected" : "")
              }
              onClick={() => {
                setConversation(p.id);
                setDeliveryChannel(p.preferred_message_channel || "portal");
                setResponses([]);
                setMessage("");
              }}
            >
              <Avatar name={clientName(p.client_id)} color={i % 4} />
              <span>
                <strong>{clientName(p.client_id)}</strong>
                <small>{p.name}</small>
              </span>
              <ChevronRight size={14} />
            </button>
          ))}
        </aside>
        <div className="conversation-main">
          {projects.length ? (
            <>
              <div className="conversation-header">
                <Avatar
                  name={clientName(
                    projects.find((p) => p.id === currentConversation)
                      ?.client_id,
                  )}
                />
                <div>
                  <strong>
                    {clientName(
                      projects.find((p) => p.id === currentConversation)
                        ?.client_id,
                    )}
                  </strong>
                  <small>
                    {projects.find((p) => p.id === currentConversation)?.name}
                  </small>
                </div>
                <ShieldCheck size={18} />
              </div>
              <div className="message-scroll">
                {thread.map((m) => (
                  <div
                    className={
                      "message " + (m.sender_id === userId ? "mine" : "")
                    }
                    key={m.id}
                  >
                    <span>
                      {m.sender_id === userId
                        ? "You"
                        : clientMode
                          ? org.name
                          : clientName(
                              projects.find((p) => p.id === currentConversation)
                                ?.client_id,
                            )}
                    </span>
                    <p>{m.body}</p>
                    <small>
                      {moneylessDate(m.created_at)} ·{" "}
                      {new Date(m.created_at).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}{" "}
                      · {channelLabels[m.channel || "portal"]}
                    </small>
                    {m.sender_id !== userId && m.responses?.length > 0 && (
                      <div className="quick-responses">
                        {m.responses.map((r: string) => (
                          <button
                            key={r}
                            disabled={busy}
                            onClick={() => sendMessage(r)}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {!thread.length &&
                  empty(
                    "Start a conversation",
                    "A quick hello is a great place to begin.",
                  )}
              </div>
              <form
                className="composer"
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage();
                }}
              >
                {!clientMode && (
                  <div className="composer-options">
                    <select
                      aria-label="Use a message template"
                      value=""
                      onChange={(e) => {
                        const t = templates.find(
                          (t) => t.id === e.target.value,
                        );
                        if (t) {
                          setMessage(t.body);
                          setResponses(t.responses);
                          setDeliveryChannel(t.channel || "portal");
                        }
                      }}
                    >
                      <option value="">✧ Use a message template</option>
                      {templates.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.title}
                        </option>
                      ))}
                    </select>
                    <select
                      aria-label="Communication channel"
                      value={deliveryChannel}
                      onChange={(e) => setDeliveryChannel(e.target.value)}
                    >
                      {enabledChannels.map((channel) => (
                        <option key={channel} value={channel}>
                          {channelLabels[channel]}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {responses.length > 0 && (
                  <div className="response-preview">
                    {responses.map((r) => (
                      <span key={r}>{r}</span>
                    ))}
                    <button
                      type="button"
                      aria-label="Remove quick responses"
                      onClick={() => setResponses([])}
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
                <div className="compose-input">
                  <textarea
                    aria-label="Message"
                    placeholder="Write a thoughtful message…"
                    maxLength={5000}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                  />
                  <button
                    className="button primary"
                    disabled={busy || !message.trim()}
                    aria-label="Send message"
                  >
                    <Send size={17} />
                  </button>
                </div>
                <small>
                  {clientMode || deliveryChannel === "portal"
                    ? "Shared with your project team and homeowner."
                    : `${channelLabels[deliveryChannel]} is the delivery preference. Connect its provider before external delivery.`}
                </small>
              </form>
            </>
          ) : (
            empty(
              "No projects yet",
              "Create a project to start a conversation.",
            )
          )}
        </div>
      </section>
    );
  }
}
function Brand() {
  return (
    <a className="brand" href="/">
      <span>
        <Building2 size={23} />
      </span>
      omnibuild<span className="brand-dot">.</span>
    </a>
  );
}
function SearchBox({
  query,
  setQuery,
  placeholder,
}: {
  query: string;
  setQuery: (v: string) => void;
  placeholder: string;
}) {
  return (
    <label className="search-box">
      <Search size={16} />
      <input
        aria-label={placeholder}
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {query && (
        <button aria-label="Clear search" onClick={() => setQuery("")}>
          <X size={14} />
        </button>
      )}
    </label>
  );
}
function ProjectCard({
  p,
  client,
  progress,
  index,
  open,
}: {
  p: Row;
  client: string;
  progress: number;
  index: number;
  open: () => void;
}) {
  return (
    <button className="project-card" onClick={open}>
      <div className={"project-art art-" + ((p.style ?? index) % 4)}>
        <img src="/adu.svg" alt="Illustration of a modern backyard ADU" />
        <Badge status={p.status} />
        <span className="project-arrow">
          <ArrowUpRight size={19} />
        </span>
      </div>
      <div className="project-card-body">
        <span className="project-type">
          {p.status === "Completed"
            ? "A NEW CHAPTER BEGINS"
            : "ACCESSORY DWELLING UNIT"}
        </span>
        <h3>{p.name}</h3>
        <p className="address">
          <MapPin size={13} />
          {p.address}
        </p>
        <div className="project-client">
          <Avatar name={client} color={index % 4} />
          <span>{client}</span>
        </div>
        <div className="progress-label">
          <span>Project progress</span>
          <strong>{progress}%</strong>
        </div>
        <div className="progress-track">
          <i style={{ width: progress + "%" }} />
        </div>
        <div className="project-card-bottom">
          <span>
            <CalendarDays size={14} />
            {moneylessDate(p.due_date)}
          </span>
          <span>
            View project <ArrowRight size={14} />
          </span>
        </div>
      </div>
    </button>
  );
}
