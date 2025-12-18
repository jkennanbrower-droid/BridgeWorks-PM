import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import { SiteHeader } from "./components/SiteHeader";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "BridgeWorks PM",
    template: "%s · BridgeWorks PM",
  },
  description:
    "BridgeWorks PM unifies leasing, rent collection, maintenance, accounting, and resident communication into one clean platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-6 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-slate-900 focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-teal-600 dark:focus:bg-slate-900 dark:focus:text-white"
        >
          Skip to content
        </a>
        <SiteHeader />
        <main id="content">{children}</main>
      </body>
    </html>
  );
}
