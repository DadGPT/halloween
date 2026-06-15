// Shared constants.

/** Supabase Storage bucket holding costume photos (public read). */
export const BUCKET = "costumes";

/** Lightweight hype reactions shown on each costume. */
export const REACTION_EMOJIS = ["🔥", "👻", "😂", "😍", "🤯"] as const;

export const PHASE_COPY: Record<
  string,
  { title: string; body: string }
> = {
  preshow: {
    title: "Submissions are open",
    body: "Add your costume now. Voting opens once the party gets going.",
  },
  voting: {
    title: "Voting is live",
    body: "Browse the costumes and cast your votes.",
  },
  closed: {
    title: "Voting has closed",
    body: "Winners are being crowned. Watch the big screen.",
  },
};
