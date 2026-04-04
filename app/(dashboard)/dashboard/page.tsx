export const dynamic = "force-dynamic";

import Link from "next/link";
import { USER_ID } from "@/lib/auth";
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
  const studySets = await prisma.studySet.findMany({
    where: { userId: USER_ID },
    include: {
      _count: { select: { uploads: true, tests: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Study Sets</h1>
          <p className="text-sm text-muted-foreground">
            Your uploaded materials and generated tests
          </p>
        </div>
        <Link href="/dashboard/study-sets/new">
          <Button>New Study Set</Button>
        </Link>
      </div>

      {studySets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <p className="text-muted-foreground">
              No study sets yet. Upload your first notes to get started.
            </p>
            <Link href="/dashboard/study-sets/new">
              <Button>Create your first study set</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {studySets.map((set) => (
            <Link key={set.id} href={`/dashboard/study-sets/${set.id}`}>
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
      )}
    </div>
  );
}
