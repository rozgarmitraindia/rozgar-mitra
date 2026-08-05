import { cn } from "../../lib/utils";

const variants = {
  default: "bg-foreground text-background hover:bg-foreground/90",
  signal: "bg-gradient-signal text-signal-foreground shadow-float hover:shadow-lift",
  ink: "bg-gradient-ink text-background hover:opacity-95",
  outline: "border border-border bg-card text-foreground hover:bg-accent hover:text-accent-foreground",
  ghost: "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
  glass: "glass text-background hover:bg-background/15",
};

const sizes = {
  icon: "size-9",
  sm: "h-9 px-3 text-sm",
  lg: "h-11 px-5 text-sm",
  xl: "h-12 px-6 text-base",
  default: "h-10 px-4 text-sm",
};

export function Button({ className, variant = "default", size = "default", asChild = false, ...props }) {
  const Comp = asChild ? "span" : "button";
  return (
    <Comp
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-2 rounded-lg font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
