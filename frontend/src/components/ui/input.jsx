import { cn } from "../../lib/utils";

export function Input({ className, ...props }) {
  return (
    <input
      className={cn(
        "flex h-10 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-signal placeholder:text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}
