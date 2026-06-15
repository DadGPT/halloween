import { Crown, Ghost, Laugh, Users, Scissors, Award } from "lucide-react";
import type { LucideProps } from "lucide-react";

const MAP: Record<string, React.ComponentType<LucideProps>> = {
  crown: Crown,
  ghost: Ghost,
  laugh: Laugh,
  users: Users,
  scissors: Scissors,
};

export function CategoryIcon({
  name,
  className,
}: {
  name: string | null;
  className?: string;
}) {
  const Icon = MAP[name ?? ""] ?? Award;
  return <Icon className={className} />;
}
