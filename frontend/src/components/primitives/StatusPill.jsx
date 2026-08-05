import { cn } from "../../lib/utils";

const statusStyles = {
  live: "bg-verified/15 text-verified",
  pending: "bg-pending/20 text-foreground",
  rejected: "bg-destructive/15 text-destructive",
};

export function StatusPill({ status, className }) {
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize", statusStyles[status], className)}>
      {status}
    </span>
  );
}
