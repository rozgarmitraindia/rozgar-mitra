import { X } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "./button";
import { cn } from "../../lib/utils";

export function Dialog({ open, onOpenChange, title, description, children, className }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-foreground/45 p-3 sm:p-4" role="dialog" aria-modal="true">
      <button className="absolute inset-0 cursor-default" aria-label="Close dialog" onClick={() => onOpenChange(false)} />
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className={cn("relative max-h-[calc(100dvh-1.5rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-lift sm:max-h-[calc(100dvh-2rem)] sm:p-6", className)}
      >
        <Button className="absolute right-4 top-4" variant="ghost" size="icon" onClick={() => onOpenChange(false)} aria-label="Close">
          <X className="size-4" />
        </Button>
        {title ? <h2 className="font-display text-2xl font-bold">{title}</h2> : null}
        {description ? <p className="mt-2 text-sm text-muted-foreground">{description}</p> : null}
        <div className="mt-6">{children}</div>
      </motion.div>
    </div>
  );
}
