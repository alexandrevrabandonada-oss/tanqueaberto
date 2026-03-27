import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true
  }
};

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-[color:var(--color-bg)] text-[color:var(--color-text)]">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-4">{children}</div>
    </div>
  );
}
