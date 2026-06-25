import type { Metadata } from "next";
import { Libre_Caslon_Text, Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import AuthGuard from "@/components/AuthGuard";

const headline = Libre_Caslon_Text({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-headline",
});
const body = Hanken_Grotesk({
  weight: ["400", "600", "700"],
  subsets: ["latin"],
  variable: "--font-body",
});
const mono = JetBrains_Mono({
  weight: ["500"],
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Comet | Video Pipeline",
  description: "Make a narrated video from a script. Fix only what breaks.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${headline.variable} ${body.variable} ${mono.variable}`}>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-background text-on-surface font-body antialiased min-h-screen">
        <AuthGuard>{children}</AuthGuard>
      </body>
    </html>
  );
}
