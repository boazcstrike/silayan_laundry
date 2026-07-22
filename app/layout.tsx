import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppShell } from "@/components/AppShell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Silayan Laundry App",
  description: "A laundry app that helps you organize and track the number of items by category.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        {/* Apply persisted dark mode + color palette before first paint to
            avoid a flash of the default theme. Mirrors ThemeProvider logic. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("theme");var d=t?t==="dark":matchMedia("(prefers-color-scheme: dark)").matches;if(d)document.documentElement.classList.add("dark");var p=localStorage.getItem("palette");if(p&&p!=="default")document.documentElement.dataset.palette=p;}catch(e){}`,
          }}
        />
        <ErrorBoundary>
          <ThemeProvider>
            <AppShell>{children}</AppShell>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
