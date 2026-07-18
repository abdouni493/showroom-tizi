import { motion } from "framer-motion";
import { Car } from "lucide-react";

// Red-and-silver alternating metal ring — mirrors the logo, which alternates
// brushed chrome and oxidised crimson as it sweeps around.
const RING =
  "conic-gradient(from 0deg, #C0C2C4, #99A1A9, #6B747E, #6C2826, #9B302B, #B4413C, #9B302B, #6C2826, #6B747E, #99A1A9, #C0C2C4)";

/**
 * Shows a showroom logo in FULL (object-contain — never cropped) inside an
 * animated, multi-colour rotating gradient frame with a soft pulsing glow.
 * Falls back to a car icon when no logo is set.
 *
 * Used in the sidebar, website nav, hero, login header and settings preview.
 */
export default function AnimatedLogo({ src, size = 64, rounded = "rounded-2xl", className = "" }) {
  const pad = Math.max(2, Math.round(size * 0.05)); // frame thickness scales with size
  const imgPad = Math.round(size * 0.12); // breathing room so the logo never touches the frame

  return (
    <div className={`relative shrink-0 ${className}`} style={{ width: size, height: size }}>
      {/* Soft pulsing colour halo behind everything */}
      <motion.div
        className={`absolute -inset-1.5 ${rounded} blur-md`}
        style={{ background: RING }}
        animate={{ rotate: 360, opacity: [0.3, 0.6, 0.3] }}
        transition={{
          rotate: { duration: 10, repeat: Infinity, ease: "linear" },
          opacity: { duration: 3.5, repeat: Infinity, ease: "easeInOut" },
        }}
      />

      {/* Spinning gradient frame (clipped to a rounded ring) */}
      <div className={`absolute inset-0 ${rounded} overflow-hidden`}>
        <motion.div
          className="absolute"
          style={{ inset: "-45%", background: RING }}
          animate={{ rotate: 360 }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
        />
      </div>

      {/* Inner well holding the full logo */}
      <div
        className={`absolute ${rounded} bg-[#1B1F25] flex items-center justify-center overflow-hidden`}
        style={{ inset: pad }}
      >
        {src ? (
          <img
            src={src}
            alt=""
            className="w-full h-full object-contain"
            style={{ padding: imgPad, boxSizing: "border-box" }}
          />
        ) : (
          <Car className="text-silver-400" style={{ width: size * 0.45, height: size * 0.45 }} />
        )}
      </div>
    </div>
  );
}

/**
 * Static (print-safe) logo for invoices & receipts — the FULL logo image with
 * NO frame, no border and no background box, so the whole artwork is visible
 * exactly as uploaded. `size` is the max height; width scales with the image.
 */
export function PrintLogo({ src, size = 64 }) {
  if (!src) return null;
  return (
    <img
      src={src}
      alt=""
      style={{
        height: size,
        width: "auto",
        maxWidth: size * 2.6,
        objectFit: "contain",
        display: "block",
        // make sure the logo is never dropped when printing
        WebkitPrintColorAdjust: "exact",
        printColorAdjust: "exact",
      }}
    />
  );
}
