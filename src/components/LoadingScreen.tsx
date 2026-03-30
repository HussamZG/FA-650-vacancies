"use client";

import { AnimatePresence, motion } from "framer-motion";

interface LoadingScreenProps {
  isVisible: boolean;
}

export function LoadingScreen({ isVisible }: LoadingScreenProps) {
  return (
    <AnimatePresence>
      {isVisible ? (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.8 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#0b1220] via-[#0d1528] to-[#09101f] backdrop-blur-xl"
        >
          <div className="absolute h-[400px] w-[400px] rounded-full bg-[#ff5f6d]/20 blur-3xl animate-pulse" />

          <div className="relative flex flex-col items-center space-y-10 px-6 text-center">
            <motion.div
              initial={{ x: -200, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="text-7xl"
            >
              🚑
            </motion.div>

            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <h1 className="text-4xl font-bold tracking-wide text-white sm:text-5xl">
                FA-650 Emergency
              </h1>
              <p className="mt-2 text-sm text-[#ffb3bb] sm:text-base">
                Saving lives, every second counts...
              </p>
            </motion.div>

            <svg viewBox="0 0 200 50" className="h-16 w-72 max-w-full" aria-hidden="true">
              <motion.path
                d="M0 25 L20 25 L30 5 L40 45 L50 25 L200 25"
                fill="none"
                stroke="#ff5f6d"
                strokeWidth="2"
                strokeDasharray="200"
                strokeDashoffset="200"
                animate={{ strokeDashoffset: 0 }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "linear",
                }}
              />
            </svg>

            <motion.div
              className="h-12 w-12 rounded-full border-4 border-white/10 border-t-[#ff5f6d]"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            />
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
