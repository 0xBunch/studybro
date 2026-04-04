import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between px-6 py-4">
        <span className="font-heading text-lg font-semibold">StudyBro</span>
        <Link href="/sign-in">
          <Button variant="outline" size="sm">
            Sign in
          </Button>
        </Link>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="max-w-2xl space-y-6">
          <h1 className="font-heading text-5xl font-bold tracking-tight text-balance sm:text-6xl">
            Study smarter,
            <br />
            not harder.
          </h1>
          <p className="mx-auto max-w-md text-lg text-muted-foreground text-pretty">
            Upload your notes and slides. StudyBro extracts key concepts and
            generates quizzes, flashcards, and smart recommendations — so you
            can focus on learning.
          </p>
          <Link href="/sign-in">
            <Button size="lg">Get started</Button>
          </Link>
        </div>
      </main>

      <footer className="px-6 py-4 text-center text-sm text-muted-foreground">
        Built by Based Compute
      </footer>
    </div>
  );
}
