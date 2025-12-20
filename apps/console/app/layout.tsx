import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";

import "../src/app/globals.css";

export const metadata: Metadata = {
  title: "BridgeWorks Internal Console",
  description: "BridgeWorks Internal Console",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased font-sans">
        <ClerkProvider
          signInUrl="/sign-in/console"
          afterSignInUrl="/console"
          afterSignUpUrl="/console"
        >
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
