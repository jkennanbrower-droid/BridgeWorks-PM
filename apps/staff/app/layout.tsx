import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";

import "../src/app/globals.css";

export const metadata: Metadata = {
  title: "BridgeWorks Staff",
  description: "BridgeWorks Staff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased font-sans">
        <ClerkProvider>{children}</ClerkProvider>
      </body>
    </html>
  );
}
