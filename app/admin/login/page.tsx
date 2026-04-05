import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  searchParams: Promise<{ error?: string }>;
}

export default async function AdminLoginPage({ searchParams }: Props) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-dvh items-center justify-center px-6 py-8">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="font-heading text-2xl">Admin</h1>
          <p className="text-sm text-muted-foreground">
            Enter the admin password.
          </p>
        </div>
        <form
          action="/api/admin/login"
          method="POST"
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoFocus
            />
          </div>
          {error && (
            <p className="text-xs text-destructive font-mono">
              Incorrect password.
            </p>
          )}
          <Button type="submit" className="w-full">
            Sign in
          </Button>
        </form>
      </div>
    </div>
  );
}
