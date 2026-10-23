import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Resume Studio",
  description: "A private, browser-based resume editor with live PDF-ready templates.",
  applicationName: "Resume Studio",
  keywords: ["resume builder", "academic CV", "PDF resume", "resume templates"],
  openGraph: {
    title: "Resume Studio",
    description: "Edit once. Export beautifully.",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Resume Studio — Edit once. Export beautifully." }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Resume Studio",
    description: "Edit once. Export beautifully.",
    images: ["/og.png"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
