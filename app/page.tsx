import Link from "next/link";
import { prisma } from "@/lib/db";
import { EXAMPLE_SESSION_ID } from "@/lib/session";
import { HomeUploader } from "@/components/home-uploader";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/logo";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  // Find the example study set id so we can link to it
  const example = await prisma.studySet.findFirst({
    where: { sessionId: EXAMPLE_SESSION_ID },
    select: { id: true },
  });

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-end px-6 py-4">
        <ThemeToggle />
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 pb-16">
        <div className="w-full max-w-xl text-center">
          <div className="flex justify-center mb-16">
            <Logo variant="hero" linked={false} />
          </div>
          <div className="space-y-4 mb-8">
            <h1 className="font-heading text-4xl tracking-tight text-balance sm:text-5xl">
              Study smarter,
              <br />
              <span className="italic">not harder.</span>
            </h1>
            <p className="text-muted-foreground text-pretty max-w-md mx-auto">
              Upload your notes. We&apos;ll build quizzes, flashcards, and pair
              you with an AI tutor. No account. Your stuff auto-deletes after
              7 days.
            </p>
          </div>

          <HomeUploader />

          {example && (
            <div className="pt-6">
              <Link
                href={`/sessions/study-sets/${example.id}`}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4"
              >
                Or try the example →
              </Link>
            </div>
          )}
        </div>
      </main>

      <footer className="px-6 py-4 text-center text-xs text-muted-foreground">
        No accounts. No tracking. Sessions auto-delete after 7 days of
        inactivity.
      </footer>
    </div>
  );
}
