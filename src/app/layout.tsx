import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Platinum Pulse AI",
  description: "Platinum Pulse AI business command centre"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
