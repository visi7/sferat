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

export const metadata = {
  title: "SFERAT — Republika e Mendimeve të Lira",
  description: "Diskuto, voto, shpërndaj ide në Republikat tematike. Postimet fshihen automatikisht pas 7 ditësh.",
  openGraph: {
    title: "SFERAT",
    description: "Platformë diskutimesh me republika tematike.",
    url: "https://sferat.app",
    siteName: "SFERAT",
    locale: "sq_AL",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
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
