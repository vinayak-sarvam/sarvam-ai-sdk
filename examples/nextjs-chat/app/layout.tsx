import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sarvam AI — Chat Demo",
  description:
    "A streaming chat demo built with sarvam-ai-sdk and Vercel AI SDK v6.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-slate-50 antialiased">{children}</body>
    </html>
  );
}
