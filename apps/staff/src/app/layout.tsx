import "./globals.css";
import type { Metadata } from "next";

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
        {children}
      </body>
    </html>
  );
}
