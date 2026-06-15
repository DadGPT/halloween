"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import { createClient } from "@/lib/supabase/client";
import { CategoryIcon } from "@/components/vote/category-icon";
import type { Category } from "@/lib/types";

const ease = [0.22, 1, 0.36, 1] as const;

type Lite = {
  id: string;
  name: string;
  photo_url: string | null;
  kind: string;
  device_id: string;
};
type Ranked = { entry: Lite; votes: number };
type Results = {
  phase: string;
  settings: { results_revealed: boolean } | null;
  categories: Category[];
  byCategory: Record<string, Ranked[]>;
  entries: Lite[];
  totals: { votes: number; entries: number };
};

export default function LivePage() {
  const [data, setData] = useState<Results | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refetch = useCallback(async () => {
    const d = await fetch("/api/results").then((r) => r.json()).catch(() => null);
    if (d) setData(d);
  }, []);

  useEffect(() => {
    refetch();
    // Live updates: any change to these tables refreshes the standings.
    const supabase = createClient();
    const bump = () => {
      if (debounce.current) clearTimeout(debounce.current);
      debounce.current = setTimeout(refetch, 400);
    };
    const channel = supabase
      .channel("live-stage")
      .on("postgres_changes", { event: "*", schema: "public", table: "votes" }, bump)
      .on("postgres_changes", { event: "*", schema: "public", table: "entries" }, bump)
      .on("postgres_changes", { event: "*", schema: "public", table: "reactions" }, bump)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "contest_settings" },
        bump,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  if (!data) return <Splash />;

  const revealed = data.phase === "closed" && data.settings?.results_revealed;

  return (
    <main className="relative z-10 min-h-dvh w-full overflow-hidden">
      <AnimatePresence mode="wait">
        {revealed ? (
          <RevealStage key="reveal" data={data} />
        ) : data.phase === "closed" ? (
          <Tallying key="tally" />
        ) : data.phase === "voting" ? (
          <Showcase key="board" data={data} />
        ) : (
          <Preshow key="pre" data={data} />
        )}
      </AnimatePresence>
    </main>
  );
}

function Stage({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="flex min-h-dvh flex-col px-[5vw] py-[6vh]"
    >
      {children}
    </motion.div>
  );
}

function LiveBadge() {
  return (
    <span className="inline-flex items-center gap-2 text-sm font-medium uppercase tracking-[0.28em] text-parchment-dim">
      <motion.span
        animate={{ opacity: [1, 0.3, 1] }}
        transition={{ duration: 1.6, repeat: Infinity }}
        className="size-2.5 rounded-full bg-ember-500"
      />
      Live
    </span>
  );
}

function Preshow({ data }: { data: Results }) {
  const recent = [...data.entries].slice(-12).reverse();
  return (
    <Stage>
      <header className="flex items-center justify-between">
        <LiveBadge />
        <p className="text-sm uppercase tracking-[0.28em] text-parchment-dim">
          Halloween 2026
        </p>
      </header>
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <p className="text-lg uppercase tracking-[0.3em] text-ember-300">
          The Costume Contest
        </p>
        <h1 className="font-display mt-4 text-[9vw] font-semibold leading-[0.9] text-parchment">
          Costumes are
          <span className="block bg-gradient-to-br from-ember-300 to-ember-600 bg-clip-text text-transparent">
            arriving
          </span>
        </h1>
        <p className="mt-8 text-2xl text-parchment-dim">
          <span className="font-semibold text-parchment">{data.totals.entries}</span>{" "}
          {data.totals.entries === 1 ? "costume" : "costumes"} in the running
        </p>
      </div>
      {recent.length > 0 && (
        <div className="flex justify-center gap-3">
          {recent.map((e) => (
            <motion.div
              key={e.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative size-20 shrink-0 overflow-hidden rounded-2xl hairline bg-night-800"
            >
              {e.photo_url && (
                <Image src={e.photo_url} alt={e.name} fill sizes="80px" className="object-cover" />
              )}
            </motion.div>
          ))}
        </div>
      )}
    </Stage>
  );
}

// Engagement copy for the voting "showcase" — deliberately NON-specific and
// fabricated. We advertise that things are happening without revealing real
// tallies (the host wants suspense, not a live scoreboard).
const HYPE_ACTIONS = [
  "A vote just came in",
  "Someone cast their vote",
  "Another vote just landed",
  "The votes are rolling in",
  "Someone dropped a reaction",
  "A new favorite is emerging",
  "The competition is heating up",
];

function randomHype(categories: Category[]) {
  if (categories.length && Math.random() < 0.5) {
    const c = categories[Math.floor(Math.random() * categories.length)];
    const t = [
      `A ${c.label} vote just happened`,
      `Someone voted for ${c.label}`,
      `${c.label} is heating up`,
    ];
    return t[Math.floor(Math.random() * t.length)];
  }
  return HYPE_ACTIONS[Math.floor(Math.random() * HYPE_ACTIONS.length)];
}

function Showcase({ data }: { data: Results }) {
  const entries = data.entries;
  const [idx, setIdx] = useState(0);
  const [hype, setHype] = useState(() => ({
    key: 0,
    text: randomHype(data.categories),
  }));

  // Cycle through costume photos.
  useEffect(() => {
    if (entries.length < 2) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % entries.length), 4500);
    return () => clearInterval(t);
  }, [entries.length]);

  // Fabricated, non-specific engagement ticker (NOT real votes).
  useEffect(() => {
    const t = setInterval(
      () =>
        setHype((h) => ({ key: h.key + 1, text: randomHype(data.categories) })),
      2800,
    );
    return () => clearInterval(t);
  }, [data.categories]);

  if (entries.length === 0) {
    return (
      <Stage>
        <header className="flex items-center justify-between">
          <LiveBadge />
          <span className="text-sm uppercase tracking-[0.28em] text-parchment-dim">
            Halloween 2026
          </span>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <h1 className="font-display text-[7vw] font-semibold text-parchment">
            Voting is live
          </h1>
          <p className="mt-4 text-2xl text-parchment-dim">
            Costumes are coming in…
          </p>
        </div>
      </Stage>
    );
  }

  const entry = entries[idx % entries.length];
  return (
    <Stage>
      <header className="flex items-center justify-between">
        <LiveBadge />
        <span className="text-xl text-parchment-dim">Voting is open</span>
      </header>

      <div className="relative flex flex-1 flex-col items-center justify-center">
        {/* Fabricated engagement pill */}
        <div className="absolute top-0 z-10 flex w-full justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={hype.key}
              initial={{ opacity: 0, y: -14, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.4, ease }}
              className="flex items-center gap-3 rounded-full bg-ember-500/15 px-6 py-3 text-xl font-medium text-ember-300 ring-1 ring-ember-400/40"
            >
              <motion.span
                animate={{ scale: [1, 1.35, 1] }}
                transition={{ duration: 0.6 }}
                className="text-2xl"
              >
                ✨
              </motion.span>
              {hype.text}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Rotating costume spotlight */}
        <div className="relative aspect-[3/4] h-[58vh] max-w-full overflow-hidden rounded-[2rem] bg-night-800 shadow-lift">
          <AnimatePresence>
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.9, ease }}
              className="absolute inset-0"
            >
              {entry.photo_url && (
                <Image
                  src={entry.photo_url}
                  alt={entry.name}
                  fill
                  sizes="58vh"
                  className="object-cover"
                  priority
                />
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-night-900 via-night-900/40 to-transparent p-6 pt-20">
                <p className="font-display text-4xl font-semibold text-parchment">
                  {entry.name}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <p className="mt-[3vh] text-xl text-parchment-dim">
          Cast your votes on your phone
        </p>
      </div>
    </Stage>
  );
}

function Tallying() {
  return (
    <Stage>
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
          className="size-16 rounded-full border-4 border-night-600 border-t-ember-500"
        />
        <h1 className="font-display mt-8 text-[6vw] font-semibold text-parchment">
          Tallying the votes…
        </h1>
        <p className="mt-3 text-2xl text-parchment-dim">
          Winners crowned in a moment.
        </p>
      </div>
    </Stage>
  );
}

function RevealStage({ data }: { data: Results }) {
  // Winners in category order, skipping categories with no votes.
  const winners = data.categories
    .map((c) => ({ category: c, top: (data.byCategory[c.id] ?? [])[0] }))
    .filter(
      (w): w is { category: Category; top: Ranked } =>
        !!w.top && w.top.votes > 0,
    );

  const [index, setIndex] = useState(0);

  // Auto-advance through each winner, then land on the full board.
  useEffect(() => {
    if (index >= winners.length) return;
    const t = setTimeout(() => setIndex((i) => i + 1), 6500);
    return () => clearTimeout(t);
  }, [index, winners.length]);

  // Confetti burst on each winner.
  useEffect(() => {
    if (index >= winners.length) return;
    let cancelled = false;
    import("canvas-confetti").then(({ default: confetti }) => {
      if (cancelled) return;
      const fire = (ratio: number, opts: object) =>
        confetti({
          particleCount: Math.floor(160 * ratio),
          spread: 90,
          origin: { y: 0.45 },
          colors: ["#e54b22", "#ff8a63", "#d9a441", "#f3dca1"],
          ...opts,
        });
      fire(0.25, { spread: 26, startVelocity: 55 });
      fire(0.35, { spread: 60 });
      fire(0.35, { spread: 120, decay: 0.91, scalar: 0.9 });
    });
    return () => {
      cancelled = true;
    };
  }, [index, winners.length]);

  if (winners.length === 0) {
    return (
      <Stage>
        <div className="flex flex-1 items-center justify-center">
          <h1 className="font-display text-[6vw] font-semibold text-parchment">
            No votes were cast.
          </h1>
        </div>
      </Stage>
    );
  }

  if (index >= winners.length) return <WinnersBoard winners={winners} />;

  const { category, top } = winners[index];
  return (
    <Stage>
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <motion.p
          key={`k-${index}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 text-2xl uppercase tracking-[0.3em] text-gold-400"
        >
          <CategoryIcon name={category.icon} className="size-7" />
          {category.label}
        </motion.p>

        <motion.div
          key={`p-${index}`}
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease }}
          className="relative mt-8 aspect-[4/5] w-[34vh] overflow-hidden rounded-[2rem] bg-night-800"
          style={{ boxShadow: "0 0 0 3px var(--color-gold-500), 0 30px 80px -20px rgba(217,164,65,0.5)" }}
        >
          {top.entry.photo_url && (
            <Image
              src={top.entry.photo_url}
              alt={top.entry.name}
              fill
              sizes="34vh"
              className="object-cover"
              priority
            />
          )}
        </motion.div>

        <motion.h1
          key={`n-${index}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, ease }}
          className="font-display mt-8 text-[7vw] font-semibold leading-[0.95] text-parchment"
        >
          {top.entry.name}
        </motion.h1>
        <p className="mt-2 text-2xl text-gold-300">
          {top.votes} {top.votes === 1 ? "vote" : "votes"}
        </p>

        <div className="mt-10 flex gap-2">
          {winners.map((_, i) => (
            <span
              key={i}
              className={
                i === index
                  ? "h-2 w-8 rounded-full bg-gold-400"
                  : "size-2 rounded-full bg-night-500"
              }
            />
          ))}
        </div>
      </div>
    </Stage>
  );
}

function WinnersBoard({
  winners,
}: {
  winners: { category: Category; top: Ranked }[];
}) {
  return (
    <Stage>
      <div className="text-center">
        <p className="text-xl uppercase tracking-[0.3em] text-gold-400">
          Halloween 2026
        </p>
        <h1 className="font-display mt-3 text-[6vw] font-semibold text-parchment">
          The Winners
        </h1>
      </div>
      <div className="mt-[4vh] grid flex-1 grid-cols-2 content-center gap-[2vw] lg:grid-cols-3">
        {winners.map(({ category, top }) => (
          <div
            key={category.id}
            className="flex flex-col items-center rounded-card hairline bg-night-700/60 p-[1.6vw] text-center"
          >
            <div
              className="relative size-28 overflow-hidden rounded-3xl bg-night-800"
              style={{ boxShadow: "0 0 0 2px var(--color-gold-500)" }}
            >
              {top.entry.photo_url && (
                <Image
                  src={top.entry.photo_url}
                  alt={top.entry.name}
                  fill
                  sizes="112px"
                  className="object-cover"
                />
              )}
            </div>
            <p className="mt-4 flex items-center gap-2 text-sm uppercase tracking-[0.2em] text-gold-400">
              <CategoryIcon name={category.icon} className="size-4" />
              {category.label}
            </p>
            <p className="font-display mt-1 text-2xl font-semibold text-parchment">
              {top.entry.name}
            </p>
          </div>
        ))}
      </div>
    </Stage>
  );
}

function Splash() {
  return (
    <main className="relative z-10 flex min-h-dvh items-center justify-center">
      <motion.div
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 1.8, repeat: Infinity }}
        className="font-display text-3xl text-parchment-dim"
      >
        Loading the stage…
      </motion.div>
    </main>
  );
}
