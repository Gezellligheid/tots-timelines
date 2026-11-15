"use client";
import { motion } from "framer-motion";

/**
 * Shown the moment you switch tabs, while the next page loads. The tab bar has already moved,
 * so the app feels instant: a slim sweeping bar on top plus a soft skeleton of the page.
 */
export default function Loading() {
  return (
    <div className="space-y-5 pt-2" role="status" aria-busy="true" aria-live="polite">
      {/* indeterminate progress sweep */}
      <div className="fixed inset-x-0 top-0 z-[60] h-1 overflow-hidden">
        <motion.div
          className="h-full w-1/3 rounded-full bg-accent-ink"
          initial={{ x: "-100%" }}
          animate={{ x: "300%" }}
          transition={{ duration: 1.1, ease: "easeInOut", repeat: Infinity }}
        />
      </div>

      <div className="flex items-center gap-3">
        <div className="shimmer h-14 w-14 rounded-full" />
        <div className="space-y-2">
          <div className="shimmer h-5 w-40 rounded-full" />
          <div className="shimmer h-3.5 w-28 rounded-full" />
        </div>
      </div>
      <div className="shimmer h-40 rounded-[32px]" />
      <div className="grid grid-cols-2 gap-4">
        <div className="shimmer h-36 rounded-[30px]" />
        <div className="shimmer h-36 rounded-[30px]" />
      </div>
      <div className="shimmer h-24 rounded-[28px]" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
