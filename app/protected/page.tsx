import { redirect } from "next/navigation";

import { LogoutButton } from "@/components/auth/logout-button";
import { getCurrentUser } from "@/lib/auth/current-user";

export default async function ProtectedPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main>
      <h1>Protected route</h1>
      <p>Signed in as {user.name}.</p>
      <p>Role: {user.role}</p>
      <LogoutButton />
    </main>
  );
}
