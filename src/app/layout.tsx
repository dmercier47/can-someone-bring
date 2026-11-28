import type { Metadata, Viewport } from "next";
import { Hedvig_Letters_Sans, Hedvig_Letters_Serif } from "next/font/google";
import "./globals.css";

const text = Hedvig_Letters_Sans({ variable: "--font-text", subsets: ["latin"], weight: "400" });
const display = Hedvig_Letters_Serif({ variable: "--font-display-face", subsets: ["latin"], axes: ["opsz"] });

export const metadata: Metadata = {
  title: "Can Someone Bring",
  description: "Who's bringing what to your party. Drop the link in your Partiful.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // Android Chrome: shrink the page when the keyboard opens (iOS is handled by useVisualViewport).
  interactiveWidget: "resizes-content",
  themeColor: "#121011",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${text.variable} ${display.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}
