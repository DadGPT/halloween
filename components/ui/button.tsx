import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-[transform,background-color,border-color,color] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none select-none whitespace-nowrap",
  {
    variants: {
      variant: {
        primary:
          "bg-ember-500 text-night-900 font-semibold shadow-ember hover:bg-ember-400",
        gold: "bg-gold-500 text-night-900 font-semibold hover:bg-gold-400",
        outline:
          "border border-night-500 bg-transparent text-parchment hover:border-ember-400 hover:text-ember-300",
        ghost: "bg-transparent text-parchment-dim hover:text-parchment",
      },
      size: {
        lg: "h-14 px-8 text-lg", // party-friendly tap target
        md: "h-11 px-5 text-base",
        sm: "h-9 px-4 text-sm",
      },
    },
    defaultVariants: { variant: "primary", size: "lg" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";
