// Domain types for the costume contest.

export type Phase = "preshow" | "voting" | "closed";

export type Category = {
  id: string;
  label: string;
  description: string | null;
  icon: string | null; // lucide icon name or emoji
  couples_only: boolean;
  sort_order: number;
  active: boolean;
};

export type EntryKind = "individual" | "group";

export type Entry = {
  id: string;
  name: string;
  description: string;
  kind: EntryKind;
  photo_path: string | null;
  photo_url: string | null;
  device_id: string;
  created_at: string;
};

export type Vote = {
  id: string;
  category_id: string;
  entry_id: string;
  device_id: string;
  created_at: string;
};

export type Reaction = {
  id: string;
  entry_id: string;
  device_id: string;
  emoji: string;
  created_at: string;
};

export type ContestSettings = {
  id: 1;
  phase_override: Phase | null;
  voting_opens_at: string | null;
  voting_closes_at: string | null;
  results_revealed: boolean;
  updated_at: string;
};

// Aggregated entry for galleries / leaderboards.
export type EntryWithScores = Entry & {
  votesByCategory: Record<string, number>;
  reactions: Record<string, number>;
};
