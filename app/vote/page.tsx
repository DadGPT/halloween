"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  X,
  ChevronLeft,
  ChevronRight,
  Check,
  Lock,
  PartyPopper,
} from "lucide-react";
import { getDeviceId } from "@/lib/device";
import { REACTION_EMOJIS } from "@/lib/constants";
import { CategoryIcon } from "@/components/vote/category-icon";
import { cn } from "@/lib/utils";
import type { Category } from "@/lib/types";

type GEntry = {
  id: string;
  name: string;
  description: string;
  kind: "individual" | "group";
  photo_url: string | null;
  device_id: string;
  reactions: Record<string, number>;
};

const ease = [0.22, 1, 0.36, 1] as const;

export default function VotePage() {
  const [deviceId, setDeviceId] = useState("");
  const [phase, setPhase] = useState("preshow");
  const [categories, setCategories] = useState<Category[]>([]);
  const [entries, setEntries] = useState<GEntry[]>([]);
  const [myVotes, setMyVotes] = useState<Record<string, string>>({});
  const [myReactions, setMyReactions] = useState<Set<string>>(new Set());
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => setDeviceId(getDeviceId()), []);

  const load = useCallback(async () => {
    const [state, ent, mine] = await Promise.all([
      fetch("/api/state").then((r) => r.json()),
      fetch("/api/entries").then((r) => r.json()),
      fetch(`/api/my?device_id=${deviceId}`).then((r) => r.json()),
    ]).catch(() => [null, null, null]);
    if (state) {
      setPhase(state.phase);
      setCategories(state.categories ?? []);
    }
    if (ent) setEntries(ent.entries ?? []);
    if (mine) {
      setMyVotes(mine.votes ?? {});
      setMyReactions(new Set(mine.reactions ?? []));
    }
    setLoading(false);
  }, [deviceId]);

  useEffect(() => {
    if (deviceId) load();
  }, [deviceId, load]);

  const canVote = phase === "voting";
  const votedCount = useMemo(
    () => categories.filter((c) => myVotes[c.id]).length,
    [categories, myVotes],
  );

  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2400);
  };

  const castVote = useCallback(
    async (categoryId: string, entryId: string) => {
      const prev = myVotes[categoryId];
      setMyVotes((v) => ({ ...v, [categoryId]: entryId }));
      const res = await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          device_id: deviceId,
          category_id: categoryId,
          entry_id: entryId,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setMyVotes((v) => {
          const n = { ...v };
          if (prev) n[categoryId] = prev;
          else delete n[categoryId];
          return n;
        });
        flash(d.error ?? "Couldn't save your vote.");
      }
    },
    [deviceId, myVotes],
  );

  const clearVote = useCallback(
    async (categoryId: string) => {
      const prev = myVotes[categoryId];
      setMyVotes((v) => {
        const n = { ...v };
        delete n[categoryId];
        return n;
      });
      const res = await fetch("/api/vote", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device_id: deviceId, category_id: categoryId }),
      });
      if (!res.ok) {
        setMyVotes((v) => ({ ...v, [categoryId]: prev }));
        flash("Couldn't update your vote.");
      }
    },
    [deviceId, myVotes],
  );

  const toggleReaction = useCallback(
    async (entryId: string, emoji: string) => {
      const key = `${entryId}:${emoji}`;
      const had = myReactions.has(key);
      setMyReactions((s) => {
        const n = new Set(s);
        had ? n.delete(key) : n.add(key);
        return n;
      });
      setEntries((es) =>
        es.map((e) =>
          e.id === entryId
            ? {
                ...e,
                reactions: {
                  ...e.reactions,
                  [emoji]: Math.max(0, (e.reactions[emoji] ?? 0) + (had ? -1 : 1)),
                },
              }
            : e,
        ),
      );
      const res = await fetch("/api/react", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device_id: deviceId, entry_id: entryId, emoji }),
      });
      if (res.ok) {
        const d = await res.json();
        setEntries((es) =>
          es.map((e) =>
            e.id === entryId
              ? { ...e, reactions: { ...e.reactions, [emoji]: d.count } }
              : e,
          ),
        );
      } else {
        setMyReactions((s) => {
          const n = new Set(s);
          had ? n.add(key) : n.delete(key);
          return n;
        });
      }
    },
    [deviceId, myReactions],
  );

  return (
    <main className="relative z-10 mx-auto w-full max-w-2xl flex-1 px-5 pb-28 pt-6">
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-parchment-dim transition-colors hover:text-parchment"
        >
          <ArrowLeft className="size-4" /> Back
        </Link>
        {canVote && categories.length > 0 && (
          <span className="rounded-full bg-night-700 hairline px-3 py-1.5 text-sm text-parchment-dim">
            <span className="font-semibold text-ember-300">{votedCount}</span> /{" "}
            {categories.length} voted
          </span>
        )}
      </div>

      <h1 className="font-display mt-4 text-4xl font-semibold text-parchment">
        {phase === "closed" ? "Voting has closed" : "Vote"}
      </h1>
      <PhaseBanner phase={phase} />

      {loading ? (
        <GallerySkeleton />
      ) : entries.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {entries.map((e, i) => (
            <CostumeCard
              key={e.id}
              entry={e}
              voted={Object.values(myVotes).includes(e.id)}
              mine={e.device_id === deviceId}
              onClick={() => setOpenIndex(i)}
            />
          ))}
        </div>
      )}

      <AnimatePresence>
        {openIndex !== null && entries[openIndex] && (
          <CostumeDetail
            entry={entries[openIndex]}
            index={openIndex}
            total={entries.length}
            categories={categories}
            myVotes={myVotes}
            myReactions={myReactions}
            canVote={canVote}
            mine={entries[openIndex].device_id === deviceId}
            onClose={() => setOpenIndex(null)}
            onPrev={() =>
              setOpenIndex((i) =>
                i === null ? i : (i - 1 + entries.length) % entries.length,
              )
            }
            onNext={() =>
              setOpenIndex((i) => (i === null ? i : (i + 1) % entries.length))
            }
            onVote={castVote}
            onClearVote={clearVote}
            onReact={toggleReaction}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed inset-x-0 bottom-6 z-50 mx-auto w-fit max-w-[90%] rounded-full bg-night-700 hairline px-5 py-3 text-sm text-parchment shadow-lift"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

function PhaseBanner({ phase }: { phase: string }) {
  if (phase === "voting")
    return (
      <p className="mt-2 text-parchment-dim">
        Tap a costume to react and cast your votes.
      </p>
    );
  if (phase === "closed")
    return (
      <p className="mt-2 text-parchment-dim">
        Thanks for voting!{" "}
        <Link href="/live" className="text-ember-300 hover:underline">
          Watch the reveal →
        </Link>
      </p>
    );
  return (
    <p className="mt-2 text-parchment-dim">
      Voting opens once the party gets going. For now, meet the contenders and
      drop some reactions.
    </p>
  );
}

function CostumeCard({
  entry,
  voted,
  mine,
  onClick,
}: {
  entry: GEntry;
  voted: boolean;
  mine: boolean;
  onClick: () => void;
}) {
  const totalReactions = Object.values(entry.reactions).reduce((a, b) => a + b, 0);
  return (
    <button
      onClick={onClick}
      className="group relative aspect-[4/5] overflow-hidden rounded-card hairline bg-night-800 text-left"
    >
      {entry.photo_url ? (
        <Image
          src={entry.photo_url}
          alt={entry.name}
          fill
          sizes="(max-width: 640px) 50vw, 33vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <div className="flex size-full items-center justify-center text-muted">
          No photo
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-night-900/90 to-transparent p-3 pt-8">
        <p className="truncate font-medium text-parchment">{entry.name}</p>
      </div>
      {voted && (
        <span className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-ember-500 text-night-900 shadow-ember">
          <Check className="size-4" strokeWidth={3} />
        </span>
      )}
      {mine && (
        <span className="absolute left-2 top-2 rounded-full bg-night-900/80 px-2 py-0.5 text-xs text-parchment-dim backdrop-blur">
          You
        </span>
      )}
      {totalReactions > 0 && (
        <span className="absolute bottom-2 right-2 rounded-full bg-night-900/70 px-2 py-0.5 text-xs text-parchment backdrop-blur">
          {totalReactions}
        </span>
      )}
    </button>
  );
}

function CostumeDetail({
  entry,
  index,
  total,
  categories,
  myVotes,
  myReactions,
  canVote,
  mine,
  onClose,
  onPrev,
  onNext,
  onVote,
  onClearVote,
  onReact,
}: {
  entry: GEntry;
  index: number;
  total: number;
  categories: Category[];
  myVotes: Record<string, string>;
  myReactions: Set<string>;
  canVote: boolean;
  mine: boolean;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onVote: (categoryId: string, entryId: string) => void;
  onClearVote: (categoryId: string) => void;
  onReact: (entryId: string, emoji: string) => void;
}) {
  const applicable = categories.filter(
    (c) => !(c.couples_only && entry.kind === "individual"),
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 flex items-end justify-center bg-night-900/80 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <motion.div
        key={entry.id}
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ duration: 0.3, ease }}
        onClick={(e) => e.stopPropagation()}
        className="relative max-h-[92vh] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-3xl bg-night-800 hairline sm:rounded-3xl"
      >
        <div className="relative aspect-[4/5] max-h-[50vh] w-full overflow-hidden rounded-t-3xl bg-night-900">
          {entry.photo_url && (
            <Image
              src={entry.photo_url}
              alt={entry.name}
              fill
              sizes="(max-width: 640px) 100vw, 28rem"
              className="object-cover"
              priority
            />
          )}
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-full bg-night-900/70 text-parchment backdrop-blur"
          >
            <X className="size-5" />
          </button>
          {total > 1 && (
            <>
              <NavArrow side="left" onClick={onPrev} />
              <NavArrow side="right" onClick={onNext} />
              <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-night-900/70 px-2.5 py-0.5 text-xs text-parchment-dim backdrop-blur">
                {index + 1} / {total}
              </span>
            </>
          )}
        </div>

        <div className="p-5">
          <h2 className="font-display text-3xl font-semibold text-parchment">
            {entry.name}
          </h2>
          {entry.description && (
            <p className="mt-1 text-parchment-dim">{entry.description}</p>
          )}

          {/* Reactions */}
          <div className="mt-4 flex flex-wrap gap-2">
            {REACTION_EMOJIS.map((emoji) => {
              const active = myReactions.has(`${entry.id}:${emoji}`);
              const count = entry.reactions[emoji] ?? 0;
              return (
                <button
                  key={emoji}
                  onClick={() => onReact(entry.id, emoji)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-base transition-colors active:scale-95",
                    active
                      ? "bg-ember-500/15 ring-1 ring-ember-400"
                      : "bg-night-700 hairline",
                  )}
                >
                  <span>{emoji}</span>
                  {count > 0 && (
                    <span className="text-sm text-parchment-dim">{count}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Voting */}
          <div className="mt-6">
            <h3 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted">
              Cast your votes
            </h3>

            {mine ? (
              <div className="rounded-xl bg-night-700 hairline px-4 py-3 text-sm text-parchment-dim">
                This is your costume — you can&apos;t vote for yourself. 🎭
              </div>
            ) : !canVote ? (
              <div className="flex items-center gap-2 rounded-xl bg-night-700 hairline px-4 py-3 text-sm text-parchment-dim">
                <Lock className="size-4" /> Voting isn&apos;t open yet.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {applicable.map((c) => {
                  const pick = myVotes[c.id];
                  const votedHere = pick === entry.id;
                  const votedElsewhere = !!pick && !votedHere;
                  return (
                    <div
                      key={c.id}
                      className="flex items-center justify-between gap-3 rounded-xl bg-night-700 hairline px-4 py-3"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <CategoryIcon
                          name={c.icon}
                          className="size-5 shrink-0 text-ember-300"
                        />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-parchment">
                            {c.label}
                          </p>
                          {votedElsewhere && (
                            <p className="truncate text-xs text-muted">
                              You picked someone else
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          votedHere ? onClearVote(c.id) : onVote(c.id, entry.id)
                        }
                        className={cn(
                          "shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors active:scale-95",
                          votedHere
                            ? "bg-ember-500 text-night-900 shadow-ember"
                            : "bg-night-600 text-parchment hover:bg-night-500",
                        )}
                      >
                        {votedHere ? (
                          <span className="inline-flex items-center gap-1">
                            <Check className="size-4" strokeWidth={3} /> Voted
                          </span>
                        ) : votedElsewhere ? (
                          "Switch"
                        ) : (
                          "Vote"
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function NavArrow({
  side,
  onClick,
}: {
  side: "left" | "right";
  onClick: () => void;
}) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      onClick={onClick}
      aria-label={side === "left" ? "Previous" : "Next"}
      className={cn(
        "absolute top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-night-900/60 text-parchment backdrop-blur transition-colors hover:bg-night-900/80",
        side === "left" ? "left-2" : "right-2",
      )}
    >
      <Icon className="size-6" />
    </button>
  );
}

function GallerySkeleton() {
  return (
    <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="aspect-[4/5] animate-pulse rounded-card bg-night-800"
        />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mt-16 flex flex-col items-center text-center">
      <PartyPopper className="size-10 text-ember-400" />
      <p className="mt-4 text-lg font-medium text-parchment">No costumes yet</p>
      <p className="mt-1 max-w-xs text-parchment-dim">
        Be the first — add yours and the gallery fills up fast.
      </p>
      <Link
        href="/enter"
        className="mt-6 text-ember-300 underline-offset-4 hover:underline"
      >
        Enter your costume →
      </Link>
    </div>
  );
}
