"use client";
import { useState } from "react";
import { browserDB, configured } from "@/lib/supabase";
export default function Password() {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <main className="onboarding">
      <h1>Welcome to your portal.</h1>
      <p>Choose a password to sign in next time.</p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            if (!configured)
              throw new Error("Connect Supabase to set a password.");
            const f = new FormData(e.currentTarget);
            const password = String(f.get("password"));
            if (password !== f.get("confirm"))
              throw new Error("Passwords do not match.");
            const db = browserDB();
            const { error } = await db.auth.updateUser({ password });
            if (error) throw error;
            const { error: claim } = await db.rpc("accept_invitations");
            if (claim) throw claim;
            location.assign("/");
          } catch (e) {
            setError(e instanceof Error ? e.message : "Unable to set password");
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="field">
          Password
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </label>
        <label className="field">
          Confirm password
          <input
            name="confirm"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </label>
        <button className="button primary" disabled={busy}>
          {busy ? "Saving…" : "Save password & continue"}
        </button>
      </form>
      {error && (
        <p role="alert" className="auth-notice">
          {error}
        </p>
      )}
    </main>
  );
}
