import { cn } from "@/lib/cn";

export function Notice({
  tone = "info",
  children,
}: {
  tone?: "info" | "success" | "warning" | "danger";
  children: React.ReactNode;
}) {
  const styles = {
    info: "border-line bg-surface text-ink",
    success: "border-emerald-200 bg-success-soft text-success",
    warning: "border-amber-200 bg-warning-soft text-warning",
    danger: "border-red-200 bg-danger-soft text-danger",
  };
  return (
    <p role="status" className={cn("rounded-xl border px-4 py-3 text-sm leading-6", styles[tone])}>
      {children}
    </p>
  );
}
