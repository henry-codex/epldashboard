import { cn } from "@/lib/utils";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "blue" | "strong";
  size?: "xs" | "sm" | "md";
  padding?: string;
}

export function GlassCard({
  children,
  className,
  variant = "default",
  size = "md",
  padding = "p-4",
  ...props
}: GlassCardProps) {
  return (
    <div
      className={cn(
        "gc",
        variant === "blue" && "gc-blue",
        variant === "strong" && "gc-strong",
        size === "sm" && "gc-sm",
        size === "xs" && "gc-xs",
        padding,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface SectionHeaderProps {
  title: string;
  right?: React.ReactNode;
  className?: string;
}

export function SectionHeader({ title, right, className }: SectionHeaderProps) {
  return (
    <div className={cn("flex items-center gap-2 mb-2.5", className)}>
      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ewhite)", flex: 1 }}>
        {title}
      </span>
      {right}
    </div>
  );
}
