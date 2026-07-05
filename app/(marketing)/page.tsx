import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

// Placeholder landing page. The R3F hero scene and GSAP scroll reveals are
// deliberately last in the build order (step 9) — functional app first.
export default function LandingPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="max-w-2xl text-4xl font-semibold tracking-tight">
        AlumniConnect
      </h1>
      <p className="max-w-md text-muted-foreground">
        Intelligent mentorship matching for professional alumni networks,
        powered by semantic search.
      </p>
      <div className="flex gap-3">
        <Link href="/signup" className={buttonVariants()}>
          Get started
        </Link>
        <Link href="/login" className={buttonVariants({ variant: "outline" })}>
          Sign in
        </Link>
      </div>
    </div>
  );
}
