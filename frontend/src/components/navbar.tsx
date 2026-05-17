"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import { ConnectButton } from "@/components/ConnectButton"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"
import { Layers } from "lucide-react"

const navLinks = [
  { href: "/", label: "Dashboard" },
  { href: "/staking", label: "Staking" },
  { href: "/rewards", label: "Rewards" },
]

export function Navbar() {
  const pathname = usePathname()

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="sticky top-0 z-50 w-full border-b border-slate-800/60 bg-[#020617]/80 backdrop-blur-xl"
    >
      <div className="container flex h-16 items-center">
        <div className="mr-4 flex items-center gap-2">
          <Link href="/" className="mr-6 flex items-center gap-2.5 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/40 transition-shadow duration-300">
              <Layers className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight text-gradient">
              DeFi Dash
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "relative px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                  pathname === link.href
                    ? "text-cyan-400"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                )}
              >
                {link.label}
                {pathname === link.href && (
                  <motion.div
                    layoutId="navbar-active"
                    className="absolute inset-0 rounded-lg bg-slate-800/60 border border-slate-700/50 -z-10"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-2">
          <ConnectButton />
        </div>
      </div>
    </motion.header>
  )
}
