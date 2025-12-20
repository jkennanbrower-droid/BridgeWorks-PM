import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

import { NavBar } from "./components/NavBar";

export const metadata: Metadata = {
  title: "BridgeWorks PM",
  description: "Property management platform for modern teams",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className="min-h-screen bg-white text-slate-900 antialiased dark:bg-black dark:text-white">
          <NavBar />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
