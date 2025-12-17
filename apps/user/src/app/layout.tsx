import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BridgeWorks User",
  description: "BridgeWorks User",
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
