import type { Metadata } from "next";

import "../src/app/globals.css";

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
    <html lang="en">
      <body className="antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
