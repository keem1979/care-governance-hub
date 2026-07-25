import { AppShell } from "@/components/app-shell";
import { requireAuthorisedContext } from "@/lib/auth/dal";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = await requireAuthorisedContext();
  return <AppShell context={context}>{children}</AppShell>;
}
