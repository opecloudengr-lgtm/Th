import { AccountLayout } from "@/components/layout/AccountLayout";

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <AccountLayout>{children}</AccountLayout>;
}
