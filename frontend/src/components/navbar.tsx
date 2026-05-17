"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import { ConnectButton } from "@/components/ConnectButton"
import { usePathname } from "next/navigation"

const navLinks = [
  { href: "/", label: "Dashboard" },
  { href: "/staking", label: "Staking" },
  { href: "/rewards", label: "Rewards" },
]

/**
 * Global navigation bar displayed on every page.
 *
 * Uses Next.js Link for client-side navigation and highlights the
 * active route based on the current pathname.
 */
export function Navbar() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <span className="font-bold text-lg tracking-tight">DeFi Dash</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm font-medium">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "transition-colors hover:text-foreground/80",
                  pathname === link.href
                    ? "text-foreground"
                    : "text-foreground/60"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-2">
          <ConnectButton />
        </div>
      </div>
    </header>
  )
}
