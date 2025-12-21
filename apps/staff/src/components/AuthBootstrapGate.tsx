"use client";

type AuthBootstrapGateProps = {
  children: React.ReactNode;
  required: "staff" | "tenant";
};

export function AuthBootstrapGate({ children }: AuthBootstrapGateProps) {
  return <>{children}</>;
}
