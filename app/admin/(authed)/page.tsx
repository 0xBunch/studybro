import Link from "next/link";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function AdminTutorsPage() {
  const tutors = await prisma.tutor.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl">Tutors</h1>
          <p className="text-sm text-muted-foreground">
            {tutors.length} tutor{tutors.length === 1 ? "" : "s"} configured
          </p>
        </div>
        <Link href="/admin/tutors/new">
          <Button>New Tutor</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Tutors</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {tutors.map((tutor) => (
              <Link
                key={tutor.id}
                href={`/admin/tutors/${tutor.id}`}
                className="flex items-center gap-3 rounded-md border p-3 hover:bg-muted/50 transition-colors"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-base">
                  {tutor.avatar}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{tutor.name}</p>
                    {!tutor.enabled && (
                      <Badge variant="secondary" className="text-xs">
                        Disabled
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {tutor.description}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground font-mono">
                  {tutor.id}
                </span>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
