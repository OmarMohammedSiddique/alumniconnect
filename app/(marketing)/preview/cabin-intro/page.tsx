import { notFound } from "next/navigation";
import LandingPage from "../../page";
import { IntroPreview } from "./intro-preview";

export const metadata = { title: "Cabin intro preview - AlumniKonneQt", robots: { index: false } };

// Local design review only: the cabin intro played over the current landing page.
export default function CabinIntroPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <>
      <IntroPreview />
      <LandingPage />
    </>
  );
}
