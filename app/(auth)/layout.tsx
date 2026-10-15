import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Brand, PrototypeNotice } from "@/components/brand";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh items-center justify-center bg-surface px-4 py-8 sm:px-6">
      <main className="w-full max-w-md">
        <Link
          href="/"
          className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-md text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to home
        </Link>
        <div className="mb-6"><Brand /></div>
        {children}
        <PrototypeNotice className="mx-auto mt-6 text-center" />
      </main>
    </div>
  );
}
