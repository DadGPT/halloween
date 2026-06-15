"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Images } from "lucide-react";
import type { Memory } from "@/lib/types";

export default function PastPartiesPage() {
  const [memories, setMemories] = useState<Memory[] | null>(null);

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
        A look back at Halloweens gone by.
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
                  <figure
                    key={m.id}
                    className="overflow-hidden rounded-card hairline bg-night-800"
                  >
                    <div className="relative aspect-square">
                      {m.photo_url && (
                        <Image
                          src={m.photo_url}
                          alt={m.caption || `Halloween ${year}`}
                          fill
                          sizes="(max-width: 640px) 50vw, 33vw"
                          className="object-cover"
                        />
                      )}
                    </div>
                    {m.caption && (
                      <figcaption className="px-3 py-2 text-sm text-parchment-dim">
                        {m.caption}
                      </figcaption>
                    )}
                  </figure>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
