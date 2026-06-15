import Link from "next/link";

// Placeholder — the swipe-to-vote gallery lands here next (see BUILD_PLAN.md).
export default function VotePage() {
  return (
    <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 text-center">
      <p className="text-xs font-medium uppercase tracking-[0.28em] text-parchment-dim">
        Coming together
      </p>
      <h1 className="font-display mt-4 text-4xl font-semibold text-parchment">
        Browse &amp; Vote
      </h1>
      <p className="mt-3 max-w-xs text-parchment-dim">
        The swipe-to-vote gallery is the next build phase.
      </p>
      <Link href="/" className="mt-8 text-ember-300 hover:underline">
        ← Back home
      </Link>
    </main>
  );
}
