"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

interface GradientButtonProps {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  loading?: boolean
  variant?: "primary" | "secondary" | "danger"
  className?: string
  type?: "button" | "submit"
}

/**
 * Animated gradient button with shimmer and press effects.
 *
 * The primary variant uses a cyan-to-blue gradient that shifts on hover,
 * giving the interactive feel expected in DeFi interfaces.
 */
export function GradientButton({
  children,
  onClick,
  disabled,
  loading,
  variant = "primary",
  className,
  type = "button",
}: GradientButtonProps) {
  const variants = {
    primary:
      "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30",
    secondary:
      "bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-600/50 hover:border-slate-500/50",
    danger:
      "bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-400 hover:to-rose-500 text-white shadow-lg shadow-red-500/20 hover:shadow-red-500/30",
  }

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      whileHover={{ scale: disabled || loading ? 1 : 1.02 }}
      whileTap={{ scale: disabled || loading ? 1 : 0.97 }}
      className={cn(
        "relative inline-flex items-center justify-center gap-2",
        "px-5 py-2.5 rounded-xl font-medium text-sm",
        "transition-all duration-200",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100",
        variants[variant],
        className
      )}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </motion.button>
  )
}
