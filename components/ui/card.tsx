import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "hairline rounded-card bg-night-700/70 shadow-lift backdrop-blur-sm",
        className,
      )}
      {...props}
    />
  );
}
