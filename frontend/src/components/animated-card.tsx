"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface AnimatedCardProps {
  children: React.ReactNode
  className?: string
  delay?: number
}

/**
 * Glassmorphism card with entrance animation and hover glow.
 *
 * Uses a dark translucent background with a subtle gradient border
 * that brightens on hover — the signature look of modern DeFi dashboards.
 */
export function AnimatedCard({ children, className, delay = 0 }: AnimatedCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={cn(
        "group relative rounded-2xl overflow-hidden",
        "bg-slate-900/60 backdrop-blur-xl",
        "border border-slate-700/50",
        "hover:border-cyan-500/30",
        "transition-colors duration-300",
        "shadow-lg shadow-black/20",
        className
      )}
    >
      {/* Top gradient line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      {/* Corner glow */}
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-cyan-500/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

      {children}
    </motion.div>
  )
}
