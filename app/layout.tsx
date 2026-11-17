import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Keem Render — Architectural Visualisation Studio",
  description: "AI-assisted architectural image rendering workspace."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}