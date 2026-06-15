"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import imageCompression from "browser-image-compression";
import {
  Camera,
  Loader2,
  Check,
  User,
  Users,
  ArrowLeft,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getDeviceId } from "@/lib/device";
import { cn } from "@/lib/utils";

type Status = "idle" | "submitting" | "done";

export default function EnterPage() {
  const [phase, setPhase] = useState<string>("preshow");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"individual" | "group">("individual");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/state")
      .then((r) => r.json())
      .then((s) => setPhase(s.phase))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!file) return setPreview(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    if (!picked) return;
    setError(null);
    try {
      // Shrink big phone photos before they ever leave the device.
      const compressed = await imageCompression(picked, {
        maxSizeMB: 1.2,
        maxWidthOrHeight: 1600,
        useWebWorker: true,
      });
      setFile(compressed);
    } catch {
      setFile(picked); // fall back to the original if compression fails
    }
  }

  async function submit() {
    if (!file || !name.trim() || status === "submitting") return;
    setStatus("submitting");
    setError(null);
    try {
      const body = new FormData();
      body.set("photo", file);
      body.set("name", name.trim());
      body.set("kind", kind);
      body.set("description", description.trim());
      body.set("device_id", getDeviceId());

      const res = await fetch("/api/entries", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed.");
      setStatus("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
      setStatus("idle");
    }
  }

  if (phase === "closed") return <ClosedNotice />;
  if (status === "done") return <SuccessNotice name={name} />;

  return (
    <main className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-28 pt-6">
      <TopBar />

      <h1 className="font-display mt-4 text-4xl font-semibold leading-tight text-parchment">
        Enter your costume
      </h1>
      <p className="mt-2 text-parchment-dim">
        One good photo is all it takes. You can do this from your phone.
      </p>

      {/* Photo capture */}
      <button
        type="button"
        onClick={() => fileInput.current?.click()}
        className={cn(
          "group relative mt-6 aspect-[4/5] w-full overflow-hidden rounded-card hairline",
          "bg-night-800 transition-colors hover:border-ember-400",
        )}
      >
        {preview ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="Your costume"
              className="size-full object-cover"
            />
            <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-night-900/80 px-3 py-1.5 text-sm font-medium text-parchment backdrop-blur">
              <RotateCcw className="size-4" /> Retake
            </span>
          </>
        ) : (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-parchment-dim">
            <span className="flex size-16 items-center justify-center rounded-full bg-ember-500/15 text-ember-400 transition-transform group-hover:scale-105">
              <Camera className="size-8" />
            </span>
            <span className="text-base font-medium text-parchment">
              Tap to take a photo
            </span>
            <span className="text-sm text-muted">or choose from your library</span>
          </span>
        )}
      </button>
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onPick}
        className="hidden"
      />

      {/* Name */}
      <Field label="Costume name" className="mt-6">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Beetlejuice"
          maxLength={60}
          className="w-full rounded-xl bg-night-800 hairline px-4 py-3.5 text-parchment placeholder:text-muted focus:border-ember-400"
        />
      </Field>

      {/* Kind */}
      <Field label="Who's in it?" className="mt-5">
        <div className="grid grid-cols-2 gap-3">
          <KindToggle
            active={kind === "individual"}
            onClick={() => setKind("individual")}
            icon={<User className="size-5" />}
            label="Just me"
          />
          <KindToggle
            active={kind === "group"}
            onClick={() => setKind("group")}
            icon={<Users className="size-5" />}
            label="Duo / Group"
          />
        </div>
      </Field>

      {/* Description */}
      <Field label="Description" hint="optional" className="mt-5">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Tell us about it…"
          rows={2}
          maxLength={140}
          className="w-full resize-none rounded-xl bg-night-800 hairline px-4 py-3.5 text-parchment placeholder:text-muted focus:border-ember-400"
        />
      </Field>

      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-4 text-sm text-ember-300"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Sticky submit */}
      <div className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md bg-gradient-to-t from-night-900 via-night-900/95 to-transparent px-5 pb-6 pt-8">
        <Button
          onClick={submit}
          disabled={!file || !name.trim() || status === "submitting"}
          className="w-full"
        >
          {status === "submitting" ? (
            <>
              <Loader2 className="size-5 animate-spin" /> Submitting…
            </>
          ) : (
            <>
              <Check className="size-5" /> Submit my costume
            </>
          )}
        </Button>
      </div>
    </main>
  );
}

function TopBar() {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-1.5 text-sm text-parchment-dim transition-colors hover:text-parchment"
    >
      <ArrowLeft className="size-4" /> Back
    </Link>
  );
}

function Field({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-2 flex items-baseline gap-2 text-sm font-medium text-parchment-dim">
        {label}
        {hint && <span className="text-xs text-muted">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

function KindToggle({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-base font-medium transition-colors",
        active
          ? "bg-ember-500/15 text-ember-300 ring-1 ring-ember-400"
          : "bg-night-800 hairline text-parchment-dim hover:text-parchment",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function SuccessNotice({ name }: { name: string }) {
  return (
    <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 text-center">
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 16 }}
        className="flex size-20 items-center justify-center rounded-full bg-confirm/20 text-confirm"
      >
        <Check className="size-10" />
      </motion.div>
      <h1 className="font-display mt-6 text-3xl font-semibold text-parchment">
        You&apos;re in{name ? `, ${name}` : ""}!
      </h1>
      <p className="mt-2 max-w-xs text-parchment-dim">
        Your costume is in the contest. We&apos;ll let you know when voting opens.
      </p>
      <Link
        href="/vote"
        className="mt-8 text-ember-300 underline-offset-4 hover:underline"
      >
        See who else entered →
      </Link>
    </main>
  );
}

function ClosedNotice() {
  return (
    <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 text-center">
      <h1 className="font-display text-3xl font-semibold text-parchment">
        Submissions are closed
      </h1>
      <p className="mt-2 max-w-xs text-parchment-dim">
        The contest has moved on to voting and results. Head to the big screen!
      </p>
      <Link href="/" className="mt-8 text-ember-300 hover:underline">
        ← Back home
      </Link>
    </main>
  );
}
