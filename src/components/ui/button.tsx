import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl border border-white/10 text-sm font-semibold tracking-[0.01em] transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-[linear-gradient(135deg,#ff6c78_0%,#ff506a_100%)] text-white shadow-[0_18px_40px_rgba(255,95,109,0.28)] hover:-translate-y-0.5 hover:shadow-[0_22px_48px_rgba(255,95,109,0.36)]",
        destructive:
          "border-transparent bg-[linear-gradient(135deg,#ff7e64_0%,#ef4444_100%)] text-white shadow-[0_18px_40px_rgba(239,68,68,0.24)] hover:-translate-y-0.5 hover:opacity-95 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
        outline:
          "bg-white/5 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-md hover:bg-white/9 hover:text-white dark:bg-white/5 dark:border-white/10 dark:hover:bg-white/10",
        secondary:
          "border-transparent bg-white/[0.08] text-secondary-foreground shadow-[0_12px_30px_rgba(2,6,23,0.18)] hover:bg-white/[0.12]",
        ghost:
          "border-transparent bg-transparent text-muted-foreground hover:bg-white/7 hover:text-white dark:hover:bg-white/7",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-5 py-2.5 has-[>svg]:px-4",
        sm: "h-9 rounded-xl gap-1.5 px-3.5 has-[>svg]:px-3",
        lg: "h-12 rounded-2xl px-7 has-[>svg]:px-5",
        icon: "size-11 rounded-2xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
