"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Sparkles, ShieldCheck } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

const ease = [0.22, 1, 0.36, 1] as const;

export default function Home() {
  return (
    <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      {/* soft ember halo behind the hero */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.4, ease }}
        className="pointer-events-none absolute top-[18%] h-72 w-72 rounded-full bg-ember-500/20 blur-[90px]"
      />

      <div className="relative flex max-w-md flex-col items-center">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease }}
          className="mb-6 text-xs font-medium uppercase tracking-[0.28em] text-parchment-dim"
        >
          Bushkar&nbsp;Hathaway · 31 October 2026
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.08, ease }}
          className="font-display text-[clamp(3.25rem,16vw,5rem)] font-semibold leading-[0.92] text-parchment"
        >
          The Costume
          <span className="block bg-gradient-to-br from-ember-300 via-ember-400 to-ember-600 bg-clip-text text-transparent">
            Contest
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.16, ease }}
          className="mt-6 text-lg leading-relaxed text-parchment-dim"
        >
          Show off your costume, vote for your favorites, and watch the winners
          crowned live.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.26, ease }}
          className="mt-10 flex w-full flex-col gap-3"
        >
          <Link href="/enter" className={buttonVariants({ variant: "primary" })}>
            <Sparkles className="size-5" />
            Enter your costume
          </Link>
          <Link href="/vote" className={buttonVariants({ variant: "outline" })}>
            Browse &amp; vote
          </Link>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.5, ease }}
          className="mt-8 flex items-center gap-2 text-sm text-muted"
        >
          <ShieldCheck className="size-4" />
          No login. No app. Just your phone.
        </motion.p>
      </div>
    </main>
  );
}
