import { cn } from "@/lib/utils";

type BadgeVariant = "up" | "down" | "neutral" | "gold";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

export function EPLBadge({ variant = "neutral", children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "epl-badge",
        variant === "up"      && "badge-up",
        variant === "down"    && "badge-dn",
        variant === "neutral" && "badge-neu",
        variant === "gold"    && "badge-gold",
        className
      )}
    >
      {children}
    </span>
  );
}

interface EPLButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export function EPLButton({ children, className, ...props }: EPLButtonProps) {
  return (
    <button className={cn("epl-btn", className)} {...props}>
      {children}
    </button>
  );
}
