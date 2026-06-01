import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Coherence",
  description: "连贯性，而非准确性",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
