import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/auth";
import { AdminNav } from "@/components/admin/admin-nav";
import { LogoutButton } from "@/components/admin/logout-button";

/**
 * Protected admin shell (US-031).
 *
 * This `(admin)` route group wraps every admin page EXCEPT `/admin/login`
 * (which lives outside the group, at `src/app/admin/login/`, so it stays public
 * and there is no redirect loop). `force-dynamic` because the layout reads the
 * session cookie via `requireRole` and must never be statically cached; the
 * guard redirects unauthenticated/under-privileged users to /admin/login.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin · TFTLab" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireRole("EDITOR");

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link href="/admin" className="flex items-baseline gap-2">
            <span className="text-lg font-bold italic tracking-tight">
              <span className="text-primary">TFTLab</span>
              <span className="text-primary/50">.br</span>
            </span>
            <span className="text-sm font-medium text-muted-foreground">
              Admin
            </span>
          </Link>

          <AdminNav />

          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-xs text-muted-foreground sm:inline">
              {session.user.email}
              <span className="ml-2 rounded bg-secondary px-1.5 py-0.5 text-secondary-foreground">
                {session.user.role}
              </span>
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        {children}
      </main>
    </div>
  );
}
