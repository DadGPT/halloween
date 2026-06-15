"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Vote, Mic2, Images } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/vote", label: "Costumes", icon: Vote },
  { href: "/karaoke", label: "Karaoke", icon: Mic2 },
  { href: "/past", label: "Memories", icon: Images },
];

// Focused / big-screen / host views don't get the guest nav.
const HIDDEN = ["/enter", "/live", "/admin"];

export function SiteNav() {
  const pathname = usePathname();
  if (HIDDEN.some((h) => pathname === h || pathname.startsWith(h + "/"))) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-night-600 bg-night-900/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md">
      <div className="mx-auto flex max-w-md items-stretch justify-around">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors",
                active ? "text-ember-300" : "text-parchment-dim hover:text-parchment",
              )}
            >
              <Icon className="size-5" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
