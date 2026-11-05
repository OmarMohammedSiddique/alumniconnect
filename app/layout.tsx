import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AlumniKonneQt",
  description:
    "Independent academic prototype for professional mentorship and networking. Inspired by Kenya Airways, not an official airline product.",
  applicationName: "AlumniKonneQt",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <meta name="color-scheme" content="light dark" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var t = localStorage.getItem("alumnikonneqt-theme") || "system";
                var d = t === "dark" || (t === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
                if (d) {
                  document.documentElement.classList.add("dark");
                  document.documentElement.classList.remove("light");
                } else if (t === "light") {
                  document.documentElement.classList.add("light");
                  document.documentElement.classList.remove("dark");
                } else {
                  document.documentElement.classList.remove("dark");
                  document.documentElement.classList.remove("light");
                }
                var m = document.querySelector('meta[name="color-scheme"]');
                if (m) m.content = t === "system" ? "light dark" : t;
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body suppressHydrationWarning className="min-h-full flex flex-col">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
