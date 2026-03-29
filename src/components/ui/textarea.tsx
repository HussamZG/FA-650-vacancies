import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive flex field-sizing-content min-h-16 w-full rounded-[1.4rem] border border-white/10 bg-white/5 px-4 py-3 text-base shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_10px_28px_rgba(2,6,23,0.14)] backdrop-blur-md transition-[color,box-shadow,background-color,border-color] outline-none focus-visible:ring-[3px] hover:bg-white/7 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
