import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "../index.css";
import Providers from "@/components/providers";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

export const metadata: Metadata = {
  title: "EPL Global — Fellows Dashboard",
  description: "Emerging Public Leaders Global — Fellows Activity & Profile Monitoring Platform",
  icons: {
    icon: "/EPL_logo_square-block.webp",
    shortcut: "/EPL_logo_square-block.webp",
    apple: "/EPL_logo_square-block.webp",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${dmSans.variable} antialiased`} style={{ fontFamily: "var(--font-dm-sans, 'DM Sans', system-ui, sans-serif)" }}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
