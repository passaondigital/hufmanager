import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.99] [&_svg]:pointer-events-none [&_svg]:size-5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-[var(--hm-orange)] text-white shadow-[0_8px_18px_rgba(255,106,0,0.22)] hover:brightness-[0.96]",
        destructive: "bg-destructive text-destructive-foreground shadow-[0_10px_24px_rgba(239,68,68,0.2)] hover:bg-destructive/90",
        outline: "border border-hm-border bg-hm-surface text-hm-text hover:bg-orange-50 hover:text-[var(--hm-orange)] dark:hover:bg-white/5",
        secondary: "border border-hm-border bg-hm-canvas text-hm-text hover:bg-orange-50 hover:text-[var(--hm-orange)] dark:hover:bg-white/5",
        ghost: "hover:bg-orange-50 hover:text-[var(--hm-orange)] dark:hover:bg-white/5",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-12 px-6 py-3 min-w-[120px]",
        sm: "h-10 px-4",
        lg: "h-14 px-10 text-base",
        icon: "h-11 w-11 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
