import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Quote → CRM Record",
  description: "Excel & CFG quote structuring tool with CRM sync",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
