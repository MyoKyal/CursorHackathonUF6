import { AuthProvider } from "@/components/auth-provider";
import { AppShell } from "@/components/bottom-nav";
import { Toaster } from "@/components/ui/sonner";
import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "next-themes";
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
  title: "Loopify — Recycle. Exchange. Renew.",
  description:
    "A Yangon donation network. Post unused items in Bahan, Insein, Tamwe, and other Yangon townships.",
  icons: {
    icon: "/loopify-logo.jpg",
    apple: "/loopify-logo.jpg",
  },
  appleWebApp: {
    capable: true,
    title: "Loopify",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#059669",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-dvh bg-neutral-100 font-sans text-foreground antialiased`}
      >
        <ThemeProvider attribute="class" defaultTheme="light" forcedTheme="light" enableSystem={false}>
          <AuthProvider>
            <AppShell>{children}</AppShell>
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
