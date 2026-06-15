"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import imageCompression from "browser-image-compression";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Memory } from "@/lib/types";

// Upload and manage past-party photos.
export function MemoriesManager({ passcode }: { passcode: string }) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [year, setYear] = useState("");
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const d = await fetch("/api/memories").then((r) => r.json()).catch(() => null);
    if (d) setMemories(d.memories ?? []);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      setFile(
        await imageCompression(f, {
          maxSizeMB: 1.2,
          maxWidthOrHeight: 1600,
          useWebWorker: true,
        }),
      );
    } catch {
      setFile(f);
    }
  }

  async function upload() {
    if (busy || !year.trim() || !file) return;
    setBusy(true);
    setError(null);
    const body = new FormData();
    body.set("passcode", passcode);
    body.set("year", year.trim());
    body.set("caption", caption.trim());
    body.set("photo", file);
    const res = await fetch("/api/memories", { method: "POST", body });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Upload failed.");
      return;
    }
    setCaption("");
    setFile(null);
    if (input.current) input.current.value = "";
    load();
  }

  async function del(id: string) {
    if (!confirm("Remove this photo?")) return;
    setMemories((m) => m.filter((x) => x.id !== id));
    await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passcode, action: "delete_memory", payload: { id } }),
    });
    load();
  }

  return (
    <div>
      <div className="rounded-card hairline bg-night-700/60 p-4">
        <div className="grid grid-cols-2 gap-2.5">
          <input
            value={year}
            onChange={(e) => setYear(e.target.value)}
            placeholder="Year (e.g. 2025)"
            inputMode="numeric"
            className="rounded-xl bg-night-800 hairline px-4 py-3 text-parchment placeholder:text-muted focus:border-ember-400"
          />
          <input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Caption (optional)"
            className="rounded-xl bg-night-800 hairline px-4 py-3 text-parchment placeholder:text-muted focus:border-ember-400"
          />
        </div>
        <input
          ref={input}
          type="file"
          accept="image/*"
          onChange={onPick}
          className="mt-2.5 block w-full text-sm text-parchment-dim file:mr-3 file:rounded-lg file:border-0 file:bg-night-600 file:px-3 file:py-2 file:text-parchment"
        />
        {error && <p className="mt-2 text-sm text-ember-300">{error}</p>}
        <Button
          onClick={upload}
          disabled={busy || !year.trim() || !file}
          size="md"
          className="mt-3 w-full"
        >
          {busy ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <>
              <ImagePlus className="size-5" /> Upload photo
            </>
          )}
        </Button>
      </div>

      {memories.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {memories.map((m) => (
            <div
              key={m.id}
              className="relative aspect-square overflow-hidden rounded-lg bg-night-800"
            >
              {m.photo_url && (
                <Image
                  src={m.photo_url}
                  alt={m.caption || m.year}
                  fill
                  sizes="33vw"
                  className="object-cover"
                />
              )}
              <span className="absolute left-1 top-1 rounded bg-night-900/80 px-1.5 py-0.5 text-xs text-parchment backdrop-blur">
                {m.year}
              </span>
              <button
                onClick={() => del(m.id)}
                aria-label="Delete photo"
                className="absolute right-1 top-1 flex size-7 items-center justify-center rounded-full bg-night-900/80 text-parchment-dim backdrop-blur hover:text-danger"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
