"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import { Images, X, Download } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import type { Memory } from "@/lib/types";

export default function PastPartiesPage() {
  const [memories, setMemories] = useState<Memory[] | null>(null);
  const [selected, setSelected] = useState<Memory | null>(null);

  useEffect(() => {
    fetch("/api/memories")
      .then((r) => r.json())
      .then((d) => setMemories(d.memories ?? []))
      .catch(() => setMemories([]));
  }, []);

  // Group by year (already sorted year desc by the API).
  const byYear = new Map<string, Memory[]>();
  for (const m of memories ?? []) {
    if (!byYear.has(m.year)) byYear.set(m.year, []);
    byYear.get(m.year)!.push(m);
  }

  return (
    <main className="relative z-10 mx-auto w-full max-w-2xl flex-1 px-5 pb-28 pt-6">
      <div className="flex items-center gap-2 text-ember-300">
        <Images className="size-5" />
        <span className="text-sm font-medium uppercase tracking-[0.22em]">
          Past Parties
        </span>
      </div>
      <h1 className="font-display mt-2 text-4xl font-semibold text-parchment">
        Memories
      </h1>
      <p className="mt-2 text-parchment-dim">
        A look back at Halloweens gone by. Tap any photo to view or save it.
      </p>

      {memories === null ? (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square animate-pulse rounded-card bg-night-800"
            />
          ))}
        </div>
      ) : memories.length === 0 ? (
        <div className="mt-16 flex flex-col items-center text-center">
          <Images className="size-10 text-ember-400" />
          <p className="mt-4 text-lg font-medium text-parchment">
            Nothing here yet
          </p>
          <p className="mt-1 max-w-xs text-parchment-dim">
            Photos from past parties will appear here soon.
          </p>
        </div>
      ) : (
        <div className="mt-8 flex flex-col gap-10">
          {[...byYear.entries()].map(([year, photos]) => (
            <section key={year}>
              <h2 className="font-display mb-3 text-2xl font-semibold text-gold-300">
                {year}
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {photos.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSelected(m)}
                    className="group overflow-hidden rounded-card hairline bg-night-800 text-left"
                  >
                    <div className="relative aspect-square">
                      {m.photo_url && (
                        <Image
                          src={m.photo_url}
                          alt={m.caption || `Halloween ${year}`}
                          fill
                          sizes="(max-width: 640px) 50vw, 33vw"
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      )}
                    </div>
                    {m.caption && (
                      <p className="px-3 py-2 text-sm text-parchment-dim">
                        {m.caption}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Lightbox */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex flex-col bg-night-900/95 backdrop-blur-sm"
            onClick={() => setSelected(null)}
          >
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm font-medium text-gold-300">
                {selected.year}
              </span>
              <button
                onClick={() => setSelected(null)}
                aria-label="Close"
                className="flex size-9 items-center justify-center rounded-full bg-night-700 text-parchment"
              >
                <X className="size-5" />
              </button>
            </div>

            <div
              className="flex flex-1 items-center justify-center overflow-hidden px-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selected.photo_url ?? ""}
                alt={selected.caption || `Halloween ${selected.year}`}
                className="max-h-full w-auto max-w-full rounded-lg object-contain"
              />
            </div>

            <div
              className="flex flex-col items-center gap-3 px-4 pb-7 pt-4"
              onClick={(e) => e.stopPropagation()}
            >
              {selected.caption && (
                <p className="text-center text-parchment-dim">{selected.caption}</p>
              )}
              <a
                href={`/api/memories/download?id=${selected.id}`}
                download
                className={buttonVariants({ variant: "primary", size: "md" })}
              >
                <Download className="size-5" /> Download
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
