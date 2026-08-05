import { useEffect, useState } from "react";
import { motion } from "motion/react";

export function StatCard({ value, label, suffix = "" }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let frame;
    const start = performance.now();
    const duration = 1100;

    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(value * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return (
    <motion.div whileHover={{ y: -4 }} className="rounded-2xl border border-border bg-card p-5 shadow-float transition hover:shadow-lift">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      <strong className="mt-2 block font-display text-3xl font-bold">{count.toLocaleString("en-IN")}{suffix}</strong>
    </motion.div>
  );
}
