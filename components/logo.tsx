import Link from "next/link";
import { cn } from "@/lib/utils";

interface Props {
  /** Whether to wrap in a Link to "/" */
  linked?: boolean;
  /** Display variant */
  variant?: "mark-only" | "with-text" | "hero";
  /** Extra classes for the wrapper */
  className?: string;
}

/**
 * Churro Academy logo. Use `variant="hero"` on the homepage for the big
 * centered treatment, `variant="with-text"` for headers, `variant="mark-only"`
 * for tiny spots.
 */
export function Logo({ linked = true, variant = "with-text", className }: Props) {
  const sizes = {
    "mark-only": "h-6",
    "with-text": "h-7",
    hero: "h-24",
  };

  const content = (
    <span
      className={cn(
        "inline-flex items-center gap-2.5",
        variant === "hero" && "flex-col gap-4",
        className
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/c_logo.svg"
        alt="Churro Academy"
        className={cn(sizes[variant], "w-auto")}
      />
      {variant !== "mark-only" && (
        <span
          className={cn(
            "font-heading tracking-tight",
            variant === "hero" ? "text-4xl sm:text-5xl" : "text-xl"
          )}
        >
          Churro Academy
        </span>
      )}
    </span>
  );

  if (!linked) return content;

  return (
    <Link
      href="/"
      className="inline-flex items-center transition-opacity hover:opacity-80"
    >
      {content}
    </Link>
  );
}
