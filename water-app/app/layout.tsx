import type { Metadata } from "next";
import Link from "next/link";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Water Directory — What's actually in your tap water?",
  description:
    "Real 2024 lab data for every UK postcode. Check nitrates, lead, chlorine and more.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <header className="border-b border-[#0f2942]/10 bg-white px-4 py-3">
          <nav className="mx-auto flex max-w-4xl items-center gap-6">
            <Link
              href="/"
              className="font-semibold text-[#0f2942] hover:text-[#0891b2]"
            >
              Water Directory
            </Link>
            <Link
              href="/suppliers"
              className="text-[#1e293b] hover:text-[#0891b2]"
            >
              Water Suppliers
            </Link>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
