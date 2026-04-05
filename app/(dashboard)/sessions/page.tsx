export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionIdOrNull } from "@/lib/session";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function DashboardPage() {
  const sessionId = await getSessionIdOrNull();

  // No session yet — send them to the homepage to start one
  if (!sessionId) {
    redirect("/");
  }

  const studySets = await prisma.studySet.findMany({
    where: { sessionId },
    include: {
      _count: { select: { uploads: true, tests: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Session exists but has no study sets — send them home too
  if (studySets.length === 0) {
    redirect("/");
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl">Recent Sessions</h1>
          <p className="text-sm text-muted-foreground">
            Active for 7 days since your last visit
          </p>
        </div>
        <Link href="/">
          <Button>New Study Set</Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {studySets.map((set) => (
          <Link key={set.id} href={`/sessions/study-sets/${set.id}`}>
            <Card className="transition-shadow hover:shadow-md h-full">
              <CardHeader>
                <CardTitle className="font-heading text-lg">
                  {set.title}
                </CardTitle>
                {set.description && (
                  <CardDescription className="line-clamp-2">
                    {set.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <span>
                    {set._count.uploads}{" "}
                    {set._count.uploads === 1 ? "file" : "files"}
                  </span>
                  <span>
                    {set._count.tests}{" "}
                    {set._count.tests === 1 ? "test" : "tests"}
                  </span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
