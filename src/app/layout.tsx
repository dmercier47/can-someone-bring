import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import "./globals.css";

const brand = Bricolage_Grotesque({ variable: "--font-brand", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Can Someone Bring",
  description: "The signup sheet for dinner parties and house parties.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f6f1e7",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${brand.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}
