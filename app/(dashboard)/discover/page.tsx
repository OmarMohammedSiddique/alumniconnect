import { DiscoverClient } from "./discover-client";

export const metadata = { title: "Discover — AlumniConnect" };

export default function DiscoverPage() {
  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold">Discover mentors</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Ranked by how well their experience matches your profile.
      </p>
      <DiscoverClient />
    </div>
  );
}
