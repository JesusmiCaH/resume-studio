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
  title: "Resume Studio — Chenghao Jiang",
  description: "A private, browser-based resume editor with live PDF-ready templates.",
  applicationName: "Resume Studio",
  authors: [{ name: "Chenghao Jiang", url: "https://jesusmicah.github.io" }],
  keywords: ["resume builder", "academic CV", "PDF resume", "3D computer vision"],
  openGraph: {
    title: "Resume Studio",
    description: "Edit once. Export beautifully.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Resume Studio",
    description: "Edit once. Export beautifully.",
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
