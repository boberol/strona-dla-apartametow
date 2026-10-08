import type { ReactNode } from "react";
import { Brand } from "@/components/panel/Brand";
import { ThemeToggle } from "@/components/panel/ThemeToggle";

/** Log in and sign up: a quiet page with one card in the middle. */
export default async function AuthLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <div className="flex min-h-svh flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <Brand href={`/${locale}`} />
        <ThemeToggle />
      </header>
      <main className="flex flex-1 items-start justify-center px-6 pb-16 pt-10 sm:items-center sm:pt-0">
        <div className="panel-surface w-full max-w-sm p-7 sm:p-8">{children}</div>
      </main>
    </div>
  );
}
