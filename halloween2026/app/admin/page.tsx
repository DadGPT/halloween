import Link from "next/link";

// Placeholder — host dashboard (phase control, moderation, reveal trigger).
export default function AdminPage() {
  return (
    <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 text-center">
      <p className="text-xs font-medium uppercase tracking-[0.28em] text-parchment-dim">
        Host
      </p>
      <h1 className="font-display mt-4 text-4xl font-semibold text-parchment">
        Control Room
      </h1>
      <p className="mt-3 max-w-xs text-parchment-dim">
        Phase control, moderation, and the reveal trigger — behind a passcode.
        Next phase.
      </p>
      <Link href="/" className="mt-8 text-ember-300 hover:underline">
        ← Back home
      </Link>
    </main>
  );
}
