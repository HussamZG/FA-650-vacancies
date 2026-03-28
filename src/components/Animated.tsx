"use client";

import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { fadeIn, slideUp, scale } from "@/lib/animations";

// Animated Card Component
interface AnimatedCardProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  onClick?: () => void;
}

export const AnimatedCard = memo(function AnimatedCard({ 
  children, 
  className = "", 
  delay = 0,
  onClick 
}: AnimatedCardProps) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={slideUp}
      transition={{ delay }}
      whileHover={{ scale: 1.01 }}
      whileTap={onClick ? { scale: 0.99 } : undefined}
      onClick={onClick}
      className={className}
    >
      {children}
    </motion.div>
  );
});

// Animated Tab Content
interface AnimatedTabProps {
  children: React.ReactNode;
  isActive: boolean;
}

export const AnimatedTab = memo(function AnimatedTab({ children, isActive }: AnimatedTabProps) {
  return (
    <AnimatePresence mode="wait">
      {isActive && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 10 }}
          transition={{ duration: 0.2 }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
});

// Animated List Item
interface AnimatedListItemProps {
  children: React.ReactNode;
  index: number;
}

export const AnimatedListItem = memo(function AnimatedListItem({ children, index }: AnimatedListItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.2 }}
    >
      {children}
    </motion.div>
  );
});

// Animated Badge
interface AnimatedBadgeProps {
  children: React.ReactNode;
  className?: string;
  pulse?: boolean;
}

export const AnimatedBadge = memo(function AnimatedBadge({ 
  children, 
  className = "",
  pulse = false 
}: AnimatedBadgeProps) {
  return (
    <motion.span
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className={className}
      {...(pulse && {
        animate: { scale: [1, 1.1, 1] },
        transition: { duration: 0.5, repeat: Infinity, repeatDelay: 2 }
      })}
    >
      {children}
    </motion.span>
  );
});

// Animated Button
interface AnimatedButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  variant?: 'default' | 'primary' | 'danger';
}

export const AnimatedButton = memo(function AnimatedButton({
  children,
  onClick,
  className = "",
  disabled = false,
  variant = 'default'
}: AnimatedButtonProps) {
  const baseClass = variant === 'primary' 
    ? 'bg-red-600 hover:bg-red-700 text-white' 
    : variant === 'danger'
      ? 'bg-red-500 hover:bg-red-600 text-white'
      : '';
      
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      className={`${baseClass} ${className} disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {children}
    </motion.button>
  );
});

// Animated Dialog
interface AnimatedDialogProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}

export const AnimatedDialog = memo(function AnimatedDialog({
  isOpen,
  onClose,
  children,
  title
}: AnimatedDialogProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-0 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

// Animated Counter
interface AnimatedCounterProps {
  value: number;
  className?: string;
}

export const AnimatedCounter = memo(function AnimatedCounter({ value, className = "" }: AnimatedCounterProps) {
  return (
    <motion.span
      key={value}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={className}
    >
      {value}
    </motion.span>
  );
});

// Animated Progress Bar
interface AnimatedProgressProps {
  value: number;
  max?: number;
  className?: string;
  colorClass?: string;
}

export const AnimatedProgress = memo(function AnimatedProgress({
  value,
  max = 100,
  className = "",
  colorClass = "bg-red-500"
}: AnimatedProgressProps) {
  const percentage = (value / max) * 100;
  
  return (
    <div className={`h-2 bg-zinc-700 rounded-full overflow-hidden ${className}`}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${percentage}%` }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className={`h-full ${colorClass} rounded-full`}
      />
    </div>
  );
});

// Fade In Wrapper
interface FadeInProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

export const FadeIn = memo(function FadeIn({ children, delay = 0, className = "" }: FadeInProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay, duration: 0.3 }}
      className={className}
    >
      {children}
    </motion.div>
  );
});

// Stagger Container
interface StaggerContainerProps {
  children: React.ReactNode;
  className?: string;
}

export const StaggerContainer = memo(function StaggerContainer({ children, className = "" }: StaggerContainerProps) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={{
        initial: {},
        animate: {
          transition: {
            staggerChildren: 0.05
          }
        }
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
});

// Stagger Item
interface StaggerItemProps {
  children: React.ReactNode;
  className?: string;
}

export const StaggerItem = memo(function StaggerItem({ children, className = "" }: StaggerItemProps) {
  return (
    <motion.div
      variants={{
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 }
      }}
      transition={{ duration: 0.2 }}
      className={className}
    >
      {children}
    </motion.div>
  );
});

// Success Animation
export const SuccessCheck = memo(function SuccessCheck() {
  return (
    <motion.svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-green-500"
    >
      <motion.path
        d="M5 13l4 4L19 7"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      />
    </motion.svg>
  );
});

// Loading Spinner with Animation
export const AnimatedSpinner = memo(function AnimatedSpinner({ className = "" }: { className?: string }) {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      className={className}
    >
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </motion.div>
  );
});
