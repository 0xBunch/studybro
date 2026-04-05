import { redirect } from "next/navigation";
import Link from "next/link";
import { isAuthenticated } from "@/lib/admin-session";
import { Logo } from "@/components/logo";

export default async function AdminAuthedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authed = await isAuthenticated();
  if (!authed) {
    redirect("/admin/login");
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <div className="flex items-center gap-6">
          <Link href="/admin" className="inline-flex items-center gap-2.5 transition-opacity hover:opacity-80">
            <Logo variant="mark-only" linked={false} />
            <span className="font-heading text-lg tracking-tight">Admin</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link
              href="/admin"
              className="hover:text-foreground transition-colors"
            >
              Tutors
            </Link>
            <Link
              href="/"
              className="hover:text-foreground transition-colors"
            >
              ← Back to app
            </Link>
          </nav>
        </div>
        <form action="/api/admin/logout" method="POST">
          <button
            type="submit"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign out
          </button>
        </form>
      </header>
      <main className="flex-1 px-6 py-6">{children}</main>
    </div>
  );
}
