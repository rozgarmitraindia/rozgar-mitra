import { motion } from "motion/react";
import { cn } from "../../lib/utils";

export function Reveal({ children, className, delay = 0, as = "div" }) {
  const Comp = motion[as] || motion.div;

  return (
    <Comp
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      className={cn(className)}
    >
      {children}
    </Comp>
  );
}
