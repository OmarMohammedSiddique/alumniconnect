import { SiteBackground } from "@/components/three/site-background";

// The marketing layout owns the one continuous background; every section the
// page renders sits transparently on top of it, so scrolling never reveals a
// seam where the background stops.
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-svh text-white">
      <SiteBackground />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
