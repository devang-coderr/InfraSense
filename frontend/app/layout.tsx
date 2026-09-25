import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Navbar } from "@/components/navigation/Navbar";
import { Particles } from "@/components/3d/Particles";

export const metadata: Metadata = {
  title: "InfraSense — AI-Powered Public Infrastructure Intelligence",
  description:
    "InfraSense transforms citizen-reported infrastructure problems into actionable intelligence using computer vision, GIS, duplicate detection, priority scoring and predictive analytics.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col relative" style={{ fontFamily: "var(--font-sans)" }}>
        <ThemeProvider>
          <Particles />
          <Navbar />
          <main className="flex-1 relative z-10">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
