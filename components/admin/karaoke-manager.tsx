"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronUp, ChevronDown, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { KaraokeSong } from "@/lib/types";

// Reorder the karaoke queue (singers get a live "your spot moved" notice via
// Realtime on the /karaoke page) and remove songs.
export function KaraokeManager({ passcode }: { passcode: string }) {
  const [songs, setSongs] = useState<KaraokeSong[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const d = await fetch("/api/karaoke").then((r) => r.json()).catch(() => null);
    if (d) setSongs(d.songs ?? []);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function postAdmin(action: string, payload?: unknown) {
    setBusy(true);
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passcode, action, payload }),
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      alert(d.error ?? "Failed.");
      return false;
    }
    return true;
  }

  async function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= songs.length) return;
    const next = [...songs];
    [next[i], next[j]] = [next[j], next[i]];
    setSongs(next); // optimistic
    if (!(await postAdmin("reorder_karaoke", { ids: next.map((s) => s.id) }))) load();
  }

  async function del(id: string) {
    if (!confirm("Remove this song from the list?")) return;
    setSongs((s) => s.filter((x) => x.id !== id));
    if (!(await postAdmin("delete_karaoke", { id }))) load();
  }

  if (songs.length === 0)
    return <p className="text-parchment-dim">No karaoke songs yet.</p>;

  return (
    <div className="flex flex-col gap-2">
      {songs.map((s, i) => (
        <div
          key={s.id}
          className="flex items-center gap-2 rounded-xl bg-night-700 hairline p-2"
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-night-800 font-display font-semibold text-ember-300">
            {i + 1}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-parchment">
              {s.title}
              {s.artist && <span className="text-parchment-dim"> · {s.artist}</span>}
            </p>
            <p className="truncate text-sm text-parchment-dim">{s.singer}</p>
          </div>
          <div className="flex items-center gap-0.5">
            <IconBtn
              onClick={() => move(i, -1)}
              disabled={i === 0 || busy}
              label="Move up"
            >
              <ChevronUp className="size-5" />
            </IconBtn>
            <IconBtn
              onClick={() => move(i, 1)}
              disabled={i === songs.length - 1 || busy}
              label="Move down"
            >
              <ChevronDown className="size-5" />
            </IconBtn>
            <IconBtn onClick={() => del(s.id)} disabled={busy} label="Remove" danger>
              <Trash2 className="size-4" />
            </IconBtn>
          </div>
        </div>
      ))}
    </div>
  );
}

function IconBtn({
  onClick,
  disabled,
  label,
  danger,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(
        "flex size-9 items-center justify-center rounded-lg text-parchment-dim transition-colors disabled:opacity-30",
        danger ? "hover:bg-danger/20 hover:text-danger" : "hover:bg-night-600 hover:text-parchment",
      )}
    >
      {children}
    </button>
  );
}
