import { X } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "./button";

export function Sheet({ open, onOpenChange, children }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70]">
      <button className="absolute inset-0 bg-foreground/45" aria-label="Close menu" onClick={() => onOpenChange(false)} />
      <motion.aside
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className="absolute right-0 top-0 h-full w-full max-w-sm overflow-y-auto border-l border-border bg-card p-5 shadow-lift"
      >
        <div className="flex justify-end">
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} aria-label="Close menu">
            <X className="size-5" />
          </Button>
        </div>
        {children}
      </motion.aside>
    </div>
  );
}
