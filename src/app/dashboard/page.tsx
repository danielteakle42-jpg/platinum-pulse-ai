import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import DashboardShell from "@/components/DashboardShell";
import { createClient } from "@/lib/supabase/server";
import { ADMIN_COOKIE, verifyAdminToken } from "@/lib/admin-auth";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const credentialAdmin = verifyAdminToken(
    cookieStore.get(ADMIN_COOKIE)?.value
  );

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !credentialAdmin) {
    redirect("/login");
  }

  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  const emailAdmin = Boolean(
    user?.email &&
      adminEmails.includes(user.email.toLowerCase())
  );

  const isAdmin = credentialAdmin || emailAdmin;

  return (
    <DashboardShell
      email={user?.email ?? "Administrator"}
      isAdmin={isAdmin}
    />
  );
}
