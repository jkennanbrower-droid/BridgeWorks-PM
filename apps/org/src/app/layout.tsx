import "./globals.css";
import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";

export const metadata: Metadata = {
  title: "BridgeWorks Owner / Investor Portal",
  description: "BridgeWorks Owner / Investor Portal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className="antialiased font-sans">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
