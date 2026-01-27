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
  title: "Unbiased News | See the whole story",
  description: "Compare how different news sources cover the same story. Spot the spin, see the delta.",
  openGraph: {
    title: "Unbiased News",
    description: "See how different sources cover the same story. Spot the spin.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Unbiased News",
    description: "See how different sources cover the same story. Spot the spin.",
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
