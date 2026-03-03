import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "EAATA 90 Official Diagnostic Tool | Professional Remote Support",
  description: "Buy the EAATA 90 Advanced Diagnostic Machine. Get FREE USA shipping for $1600. Includes ADAS, TPMS, and exclusive remote 1-on-1 support from Jesus Teran.",
  keywords: "EAATA 90, Diagnostic Machine, Buy EAATA 90, Remote diagnostics, BCM coding, TPMS",
  authors: [{ name: "Jesus Teran" }],
  openGraph: {
    title: "EAATA 90 | Advanced Diagnostic Tool for Professionals",
    description: "Upgrade your shop with the EAATA 90. Full bidirectional control, ADAS, and expert 1-on-1 support included.",
    url: "https://eaata90.com",
    siteName: "EAATA 90 USA",
    images: [
      {
        url: "https://res.cloudinary.com/dtfbdf4dn/image/upload/v1772429094/eaata-90/a1nogdp3zzg9ztkljsm7.png",
        width: 1200,
        height: 630,
        alt: "EAATA 90 Tool",
      }
    ],
    locale: "en_US",
    type: "website",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${inter.className} bg-[#0a0a0c] text-gray-100 antialiased`}>
        {children}
      </body>
    </html>
  );
}
