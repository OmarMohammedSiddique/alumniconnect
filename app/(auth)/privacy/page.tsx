import Link from "next/link";

export const metadata = { title: "Prototype privacy information - AlumniConnect" };

export default function PrivacyPage() {
  return <article className="mx-auto grid max-w-3xl gap-5 border bg-card p-5 sm:p-8">
    <h1 className="text-2xl font-semibold">Prototype privacy information</h1>
    <p>AlumniConnect is an independent academic prototype. It is not an official Kenya Airways service or an operating alumni association.</p>
    <section className="grid gap-2">
      <h2 className="text-lg font-semibold">Account and profile information</h2>
      <p>Registration sends your name, email address, password and chosen mentorship role to Supabase Auth. Supabase manages account authentication. Profile information supports mentorship discovery and connections; optional profile pictures are stored in Supabase Storage and can be accessed by signed-in members.</p>
      <p>If you choose Google sign-in, Google and Supabase handle authentication and provide basic account identity details. The app requests only identity, email and profile scopes; it does not request Gmail or Google Drive access.</p>
      <p>Please use test details for prototype evaluation. Do not enter national ID, passport or staff identification numbers in your profile, biography, skills or other free-text fields, or upload identity-document photographs.</p>
    </section>
    <section className="grid gap-2">
      <h2 className="text-lg font-semibold">Identity verification is not active</h2>
      <p>The membership fields on registration are a disabled design preview. They are not submitted or saved. Registration and email confirmation do not establish airline employment, association membership or verified identity.</p>
    </section>
    <section className="grid gap-2">
      <h2 className="text-lg font-semibold">Proposed association privacy notice</h2>
      <blockquote className="border-l-2 border-primary pl-4">Your information is protected under the Data Protection Act and will only be used for alumni association purposes.</blockquote>
      <p>This is proposed wording for a future association-operated service, not a verified assurance about this prototype. A live service must identify its responsible operator and contact, explain its lawful purposes and necessary data, and establish access, correction, deletion, retention, security and incident-handling procedures before relying on this statement.</p>
      <p>Those processes and the hosted safeguards have not been verified here. There is currently no self-service account deletion or data-rights request workflow. A research use also needs its own clear explanation and appropriate permissions; the proposed association-only sentence would not cover an undisclosed research use.</p>
      <a href="https://kdic.go.ke/sites/default/files/2021-07/TheDataProtectionAct__No24of2019.pdf" className="inline-flex min-h-11 items-center font-medium text-primary underline underline-offset-4">Read Kenya’s Data Protection Act, 2019</a>
    </section>
    <Link href="/signup" className="inline-flex min-h-11 items-center font-medium text-primary underline underline-offset-4">Back to registration</Link>
  </article>;
}
