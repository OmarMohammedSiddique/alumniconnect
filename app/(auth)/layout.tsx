import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Brand, PrototypeNotice } from "@/components/brand";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh items-center justify-center border-t-4 border-t-(--brand-red) bg-surface px-4 py-4 sm:px-6 lg:px-10">
      <main className="w-full max-w-[1440px]">
        <header className="mb-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          <Link href="/" aria-label="AlumniKonneQt home" className="inline-flex min-h-11 items-center focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">
            <Brand imageClassName="h-11 sm:h-12" />
          </Link>
          <Link href="/" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">
            <ArrowLeft className="size-4" aria-hidden="true" />Back to home
          </Link>
        </header>
        {children}
        <PrototypeNotice className="mx-auto mt-3 text-center" />
      </main>
    </div>
  );
}
