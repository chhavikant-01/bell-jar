import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: '--font-inter' });
const playfair = Playfair_Display({ 
  subsets: ["latin"], 
  variable: '--font-playfair',
  weight: ['400', '700'],
});

export const metadata: Metadata = {
  title: "Bell Jar - Privacy-Focused Movie Discussions",
  description: "Bell Jar is a privacy-focused platform for anonymous movie discussions that creates preference profiles based on your conversations.",
  keywords: ["movies", "film", "discussions", "privacy", "anonymous", "recommendations"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${playfair.variable} font-sans min-h-screen`}>
        {children}
      </body>
    </html>
  );
}
