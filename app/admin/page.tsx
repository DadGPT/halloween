"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Lock,
  Loader2,
  Monitor,
  Vote,
  Trash2,
  RotateCcw,
  LogOut,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { KaraokeManager } from "@/components/admin/karaoke-manager";
import { MemoriesManager } from "@/components/admin/memories-manager";
import { cn } from "@/lib/utils";
import type { Phase } from "@/lib/types";

const SESSION_KEY = "hw26_admin";

type Lite = { id: string; name: string; photo_url: string | null; device_id: string };
type Results = {
  phase: Phase;
  settings: { results_revealed: boolean } | null;
  entries: Lite[];
  totals: { votes: number; entries: number };
};

export default function AdminPage() {
  const [passcode, setPasscode] = useState("");
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);

  // Try a stored passcode on load.
  useEffect(() => {
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (!saved) return setChecking(false);
    verify(saved).then((ok) => {
      if (ok) {
        setPasscode(saved);
        setAuthed(true);
      } else {
        sessionStorage.removeItem(SESSION_KEY);
      }
      setChecking(false);
    });
  }, []);

  if (checking)
    return (
      <main className="relative z-10 flex flex-1 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-parchment-dim" />
      </main>
    );

  if (!authed)
    return (
      <Gate
        onSuccess={(code) => {
          sessionStorage.setItem(SESSION_KEY, code);
          setPasscode(code);
          setAuthed(true);
        }}
      />
    );

  return (
    <Dashboard
      passcode={passcode}
      onLogout={() => {
        sessionStorage.removeItem(SESSION_KEY);
        setAuthed(false);
        setPasscode("");
      }}
    />
  );
}

async function verify(code: string): Promise<boolean> {
  const res = await fetch("/api/admin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ passcode: code, action: "auth" }),
  });
  return res.ok;
}

function Gate({ onSuccess }: { onSuccess: (code: string) => void }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!code.trim() || busy) return;
    setBusy(true);
    setError(null);
    const ok = await verify(code.trim());
    setBusy(false);
    if (ok) onSuccess(code.trim());
    else setError("That passcode didn't work.");
  }

  return (
    <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6">
      <div className="flex size-14 items-center justify-center rounded-full bg-ember-500/15 text-ember-400">
        <Lock className="size-6" />
      </div>
      <h1 className="font-display mt-5 text-3xl font-semibold text-parchment">
        Control Room
      </h1>
      <p className="mt-1 text-parchment-dim">Host access only.</p>
      <div className="mt-6 flex w-full max-w-xs flex-col gap-3">
        <input
          type="password"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Passcode"
          autoFocus
          className="w-full rounded-xl bg-night-800 hairline px-4 py-3.5 text-center text-parchment placeholder:text-muted focus:border-ember-400"
        />
        {error && <p className="text-center text-sm text-ember-300">{error}</p>}
        <Button onClick={submit} disabled={busy || !code.trim()} className="w-full">
          {busy ? <Loader2 className="size-5 animate-spin" /> : "Enter"}
        </Button>
      </div>
    </main>
  );
}

function Dashboard({
  passcode,
  onLogout,
}: {
  passcode: string;
  onLogout: () => void;
}) {
  const [data, setData] = useState<Results | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const d = await fetch("/api/results").then((r) => r.json()).catch(() => null);
    if (d) setData(d);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const act = useCallback(
    async (action: string, payload?: unknown, key = action) => {
      setBusy(key);
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode, action, payload }),
      });
      setBusy(null);
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        alert(d.error ?? "Action failed.");
        return false;
      }
      await load();
      return true;
    },
    [passcode, load],
  );

  const phase = data?.phase ?? "preshow";
  const revealed = data?.settings?.results_revealed ?? false;

  return (
    <main className="relative z-10 mx-auto w-full max-w-2xl flex-1 px-5 pb-20 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-semibold text-parchment">
          Control Room
        </h1>
        <button
          onClick={onLogout}
          className="inline-flex items-center gap-1.5 text-sm text-parchment-dim hover:text-parchment"
        >
          <LogOut className="size-4" /> Sign out
        </button>
      </div>

      {/* Stats */}
      <div className="mt-5 grid grid-cols-2 gap-3">
        <Stat label="Costumes" value={data?.totals.entries ?? "—"} />
        <Stat label="Votes cast" value={data?.totals.votes ?? "—"} />
      </div>

      {/* Phase control */}
      <Section title="Contest phase">
        <div className="grid grid-cols-3 gap-2">
          {(["preshow", "voting", "closed"] as Phase[]).map((p) => (
            <button
              key={p}
              onClick={() => act("set_phase", { phase: p }, `phase-${p}`)}
              disabled={!!busy}
              className={cn(
                "rounded-xl px-3 py-3 text-sm font-semibold capitalize transition-colors",
                phase === p
                  ? "bg-ember-500 text-night-900 shadow-ember"
                  : "bg-night-700 hairline text-parchment-dim hover:text-parchment",
              )}
            >
              {busy === `phase-${p}` ? "…" : p}
            </button>
          ))}
        </div>
        <p className="mt-2 text-sm text-muted">
          Preshow: entries only · Voting: voting open · Closed: locked.
        </p>
      </Section>

      {/* Reveal */}
      <Section title="Winner reveal">
        <button
          onClick={() => act("set_revealed", { revealed: !revealed }, "reveal")}
          disabled={!!busy}
          className={cn(
            "flex w-full items-center justify-between rounded-xl px-4 py-3.5 transition-colors",
            revealed
              ? "bg-gold-500/15 ring-1 ring-gold-400"
              : "bg-night-700 hairline",
          )}
        >
          <span className="flex items-center gap-2 font-medium text-parchment">
            <Trophy className={cn("size-5", revealed ? "text-gold-400" : "text-parchment-dim")} />
            {revealed ? "Winners are showing" : "Reveal winners"}
          </span>
          <span
            className={cn(
              "relative h-6 w-11 rounded-full transition-colors",
              revealed ? "bg-gold-500" : "bg-night-500",
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 size-5 rounded-full bg-night-900 transition-all",
                revealed ? "left-[1.45rem]" : "left-0.5",
              )}
            />
          </span>
        </button>
        <p className="mt-2 text-sm text-muted">
          Plays the reveal on the big screen (when phase is Closed).
        </p>
      </Section>

      {/* Big screen + vote links */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <LinkCard href="/live" icon={<Monitor className="size-5" />} label="Open big screen" />
        <LinkCard href="/vote" icon={<Vote className="size-5" />} label="Open voting" />
      </div>

      {/* Moderation */}
      <Section title={`Entries (${data?.entries.length ?? 0})`}>
        {data && data.entries.length > 0 ? (
          <div className="flex flex-col gap-2">
            {data.entries.map((e) => (
              <div
                key={e.id}
                className="flex items-center gap-3 rounded-xl bg-night-700 hairline p-2"
              >
                <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-night-800">
                  {e.photo_url && (
                    <Image src={e.photo_url} alt={e.name} fill sizes="48px" className="object-cover" />
                  )}
                </div>
                <span className="min-w-0 flex-1 truncate font-medium text-parchment">
                  {e.name}
                </span>
                <button
                  onClick={() => {
                    if (confirm(`Remove "${e.name}"? This deletes its votes too.`))
                      act("delete_entry", { id: e.id }, `del-${e.id}`);
                  }}
                  disabled={!!busy}
                  className="flex size-9 items-center justify-center rounded-lg text-parchment-dim hover:bg-danger/20 hover:text-danger"
                  aria-label="Delete entry"
                >
                  {busy === `del-${e.id}` ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-parchment-dim">No entries yet.</p>
        )}
      </Section>

      {/* Karaoke */}
      <Section title="Karaoke lineup">
        <KaraokeManager passcode={passcode} />
      </Section>

      {/* Past parties */}
      <Section title="Past parties">
        <MemoriesManager passcode={passcode} />
      </Section>

      {/* Danger */}
      <Section title="Danger zone">
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => {
              if (confirm("Reset ALL votes? This cannot be undone."))
                act("reset_votes", undefined, "reset");
            }}
            disabled={!!busy}
            className="inline-flex items-center gap-2 rounded-xl border border-danger/40 px-4 py-3 text-sm font-medium text-danger hover:bg-danger/10"
          >
            {busy === "reset" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RotateCcw className="size-4" />
            )}
            Reset all votes
          </button>
          <button
            onClick={() => {
              if (
                confirm(
                  "Delete ALL costume entries (and their votes)? This cannot be undone.",
                )
              )
                act("clear_entries", undefined, "clear");
            }}
            disabled={!!busy}
            className="inline-flex items-center gap-2 rounded-xl border border-danger/40 px-4 py-3 text-sm font-medium text-danger hover:bg-danger/10"
          >
            {busy === "clear" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
            Clear all entries
          </button>
        </div>
      </Section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-card hairline bg-night-700/60 p-4">
      <p className="text-3xl font-semibold text-parchment">{value}</p>
      <p className="text-sm text-parchment-dim">{label}</p>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6">
      <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted">
        {title}
      </h2>
      {children}
    </section>
  );
}

function LinkCard({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      target="_blank"
      className="flex items-center gap-2 rounded-card hairline bg-night-700/60 px-4 py-3.5 font-medium text-parchment transition-colors hover:border-ember-400"
    >
      <span className="text-ember-300">{icon}</span>
      {label}
    </Link>
  );
}
