import { cn } from "@/lib/utils";

interface SectionCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function SectionCard({ children, className, ...props }: SectionCardProps) {
  return (
    <section
      className={cn(
        "rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.09),rgba(255,255,255,0.04))] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.28)] backdrop-blur-sm",
        className
      )}
      {...props}
    >
      {children}
    </section>
  );
}
