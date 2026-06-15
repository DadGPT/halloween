"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Mic2, Plus, Loader2, Trash2, X, Music2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { getDeviceId } from "@/lib/device";
import { cn } from "@/lib/utils";
import type { KaraokeSong } from "@/lib/types";

const MAX_PER_DEVICE = 2;

export default function KaraokePage() {
  const [deviceId, setDeviceId] = useState("");
  const [songs, setSongs] = useState<KaraokeSong[]>([]);
  const [singer, setSinger] = useState("");
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState(false);
  const prevOrder = useRef<string[] | null>(null);
  const deviceRef = useRef("");

  useEffect(() => {
    const id = getDeviceId();
    setDeviceId(id);
    deviceRef.current = id;
  }, []);

  const apply = useCallback((list: KaraokeSong[]) => {
    const order = list.map((s) => s.id);
    const prev = prevOrder.current;
    // A reorder = same songs, different sequence. Notify singers to recheck.
    if (prev && prev.length === order.length && prev.length > 0) {
      const sameSet =
        prev.every((id) => order.includes(id)) &&
        order.every((id) => prev.includes(id));
      const reordered = sameSet && prev.some((id, i) => order[i] !== id);
      if (reordered && list.some((s) => s.device_id === deviceRef.current)) {
        setNotice(true);
        window.setTimeout(() => setNotice(false), 12000);
      }
    }
    prevOrder.current = order;
    setSongs(list);
  }, []);

  const load = useCallback(async () => {
    const d = await fetch("/api/karaoke").then((r) => r.json()).catch(() => null);
    if (d) apply(d.songs ?? []);
  }, [apply]);

  useEffect(() => {
    load();
    const supabase = createClient();
    const channel = supabase
      .channel("karaoke")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "karaoke_songs" },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  const mine = songs.filter((s) => s.device_id === deviceId);
  const atLimit = mine.length >= MAX_PER_DEVICE;

  async function add() {
    if (busy || atLimit || !singer.trim() || !title.trim()) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/karaoke", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ device_id: deviceId, singer, title, artist }),
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Couldn't add your song.");
      return;
    }
    setSinger("");
    setTitle("");
    setArtist("");
    load();
  }

  async function remove(id: string) {
    setSongs((s) => s.filter((x) => x.id !== id)); // optimistic
    await fetch("/api/karaoke", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ device_id: deviceId, id }),
    });
    load();
  }

  return (
    <main className="relative z-10 mx-auto w-full max-w-md flex-1 px-5 pb-28 pt-6">
      <div className="flex items-center gap-2 text-ember-300">
        <Mic2 className="size-5" />
        <span className="text-sm font-medium uppercase tracking-[0.22em]">
          Karaoke
        </span>
      </div>
      <h1 className="font-display mt-2 text-4xl font-semibold text-parchment">
        The lineup
      </h1>
      <p className="mt-2 text-parchment-dim">
        Add up to {MAX_PER_DEVICE} songs. The host sets the running order.
      </p>

      {/* Reorder notice */}
      <AnimatePresence>
        {notice && (
          <motion.div
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 flex items-start gap-3 overflow-hidden rounded-xl bg-ember-500/15 px-4 py-3 ring-1 ring-ember-400"
          >
            <Mic2 className="mt-0.5 size-5 shrink-0 text-ember-300" />
            <p className="flex-1 text-sm text-parchment">
              The lineup order changed — check the list to make sure you know
              your spot.
            </p>
            <button onClick={() => setNotice(false)} aria-label="Dismiss">
              <X className="size-4 text-parchment-dim" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add form */}
      <div className="mt-5 rounded-card hairline bg-night-700/60 p-4">
        {atLimit ? (
          <p className="text-center text-sm text-parchment-dim">
            You&apos;ve added your {MAX_PER_DEVICE} songs. Remove one to swap it
            out.
          </p>
        ) : (
          <div className="flex flex-col gap-2.5">
            <input
              value={singer}
              onChange={(e) => setSinger(e.target.value)}
              placeholder="Who's singing?"
              className="w-full rounded-xl bg-night-800 hairline px-4 py-3 text-parchment placeholder:text-muted focus:border-ember-400"
            />
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Song title"
              className="w-full rounded-xl bg-night-800 hairline px-4 py-3 text-parchment placeholder:text-muted focus:border-ember-400"
            />
            <input
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              placeholder="Artist (optional)"
              className="w-full rounded-xl bg-night-800 hairline px-4 py-3 text-parchment placeholder:text-muted focus:border-ember-400"
            />
            {error && <p className="text-sm text-ember-300">{error}</p>}
            <Button
              onClick={add}
              disabled={busy || !singer.trim() || !title.trim()}
              size="md"
              className="w-full"
            >
              {busy ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <>
                  <Plus className="size-5" /> Add to the list
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Queue */}
      <div className="mt-6 flex flex-col gap-2">
        {songs.length === 0 ? (
          <div className="mt-10 flex flex-col items-center text-center">
            <Music2 className="size-10 text-ember-400" />
            <p className="mt-4 text-lg font-medium text-parchment">
              No songs yet
            </p>
            <p className="mt-1 text-parchment-dim">
              Be the first to grab the mic.
            </p>
          </div>
        ) : (
          songs.map((s, i) => {
            const isMine = s.device_id === deviceId;
            return (
              <div
                key={s.id}
                className={cn(
                  "flex items-center gap-3 rounded-xl p-3",
                  isMine ? "bg-ember-500/10 ring-1 ring-ember-400/40" : "bg-night-700 hairline",
                )}
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-night-800 font-display text-lg font-semibold text-ember-300">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-parchment">
                    {s.title}
                    {s.artist && (
                      <span className="text-parchment-dim"> · {s.artist}</span>
                    )}
                  </p>
                  <p className="truncate text-sm text-parchment-dim">
                    {s.singer}
                    {isMine && <span className="text-ember-300"> · You</span>}
                  </p>
                </div>
                {isMine && (
                  <button
                    onClick={() => remove(s.id)}
                    aria-label="Remove song"
                    className="flex size-9 items-center justify-center rounded-lg text-parchment-dim hover:bg-danger/20 hover:text-danger"
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </main>
  );
}
