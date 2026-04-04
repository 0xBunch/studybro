// Auth is disabled for local development.
// When re-enabled, this will use NextAuth v4 with Google OAuth.

const DEV_USER = {
  id: "dev-user",
  name: "Dev User",
  email: "dev@studybro.local",
  image: null,
};

export async function auth() {
  // Return a fake session for development
  return {
    user: DEV_USER,
    expires: new Date(Date.now() + 86400000).toISOString(),
  };
}
