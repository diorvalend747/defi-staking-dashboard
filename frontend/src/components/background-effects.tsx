"use client"

import { useEffect, useRef } from "react"

/**
 * Animated background with gradient orbs that slowly float and pulse.
 *
 * Creates the signature "dark DeFi" atmosphere: deep navy/black background
 * with subtle blue/cyan/violet glowing orbs that drift behind the content.
 */
export function BackgroundEffects() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-[#020617]">
      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(56,189,248,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,0.3) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Floating gradient orbs */}
      <FloatingOrb className="top-[-10%] left-[-10%] w-[500px] h-[500px] bg-cyan-500/20 blur-[120px] animate-float-slow" />
      <FloatingOrb className="top-[20%] right-[-5%] w-[400px] h-[400px] bg-violet-500/15 blur-[100px] animate-float-medium" />
      <FloatingOrb className="bottom-[-10%] left-[20%] w-[600px] h-[600px] bg-blue-500/10 blur-[140px] animate-float-slow" />
      <FloatingOrb className="bottom-[10%] right-[10%] w-[300px] h-[300px] bg-emerald-500/10 blur-[80px] animate-float-medium" />

      {/* Vignette overlay */}
      <div className="absolute inset-0 bg-radial-gradient pointer-events-none" />
    </div>
  )
}

function FloatingOrb({ className }: { className: string }) {
  return (
    <div
      className={`absolute rounded-full pointer-events-none ${className}`}
    />
  )
}
