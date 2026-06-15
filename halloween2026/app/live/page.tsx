import Link from "next/link";

// Placeholder — Party Mode (big-screen live leaderboard + winner reveal).
export default function LivePage() {
  return (
    <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 text-center">
      <p className="text-xs font-medium uppercase tracking-[0.28em] text-parchment-dim">
        Party Mode
      </p>
      <h1 className="font-display mt-4 text-5xl font-semibold text-parchment">
        The Big Screen
      </h1>
      <p className="mt-3 max-w-sm text-parchment-dim">
        Live tallies and the winner reveal will play here — built for a TV or
        projector. Next phase.
      </p>
      <Link href="/" className="mt-8 text-ember-300 hover:underline">
        ← Back home
      </Link>
    </main>
  );
}
