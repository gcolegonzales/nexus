import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import { Providers } from "@/app/providers";
import { ThemeScript } from "@nexus/ui";
import { HubShell } from "@/shared/ui/hub/HubShell";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Nexus",
    template: "%s | Nexus",
  },
  description:
    "Your central hub for personal tech tools. Local-first, private, and built to grow with you.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${dmSans.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="flex min-h-full flex-col font-sans">
        <Providers>
          <HubShell>{children}</HubShell>
        </Providers>
      </body>
    </html>
  );
}
