import type { Metadata } from "next"
import localFont from "next/font/local"
import "./globals.css"
import { cn } from "@/lib/utils"
import { Providers } from "./providers"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Toaster } from "sonner"
import { BackgroundEffects } from "@/components/background-effects"

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
})

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
})

export const metadata: Metadata = {
  title: "DeFi Staking Dashboard",
  description: "Stake tokens and earn rewards on Base Sepolia",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={cn("font-sans dark")}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col text-slate-100`}
      >
        <Providers>
          <BackgroundEffects />
          <Navbar />
          <main className="container py-6 md:py-10 flex-1 relative z-10">
            {children}
          </main>
          <Footer />
          <Toaster
            position="bottom-right"
            richColors
            toastOptions={{
              style: {
                background: "rgba(15, 23, 42, 0.95)",
                border: "1px solid rgba(56, 189, 248, 0.2)",
                backdropFilter: "blur(12px)",
              },
            }}
          />
        </Providers>
      </body>
    </html>
  )
}
