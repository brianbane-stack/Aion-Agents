import { requireOnboarded } from "@/lib/auth/guard";

export default async function ReadyLayout({ children }: { children: React.ReactNode }) {
  await requireOnboarded();
  return children;
}
