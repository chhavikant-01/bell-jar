"use client"

import React, { ButtonHTMLAttributes, forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
  "relative inline-flex items-center justify-center rounded-md text-sm font-medium transition-all duration-200 hover:scale-[1.03] active:scale-[0.97]",
  {
    variants: {
      variant: {
        primary: 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md hover:shadow-lg shadow-purple-600/20 dark:shadow-purple-900/20',
        secondary: 'bg-white dark:bg-gray-800 text-purple-600 dark:text-purple-400 shadow-md hover:shadow-lg border border-purple-200 dark:border-purple-700',
        outline: 'border border-black/10 dark:border-white/20 hover:border-gray-300 dark:hover:border-white/30 bg-transparent',
        destructive: 'bg-red-500 text-white hover:bg-red-600',
      },
      size: {
        sm: 'h-8 px-3 py-1',
        md: 'h-10 px-4 py-2',
        lg: 'h-12 px-6 py-3',
      },
      fullWidth: {
        true: 'w-full',
        false: 'w-auto',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      fullWidth: false,
    },
  }
);

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, fullWidth, loading, children, disabled, ...props }, ref) => {
    const isDisabled = loading || disabled;
    
    return (
      <button
        ref={ref}
        className={buttonVariants({ variant, size, fullWidth, className })}
        disabled={isDisabled}
        {...props}
      >
        {loading ? (
          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : null}
        {children}
        
        {/* Subtle glow effect on hover */}
        <div className="absolute inset-0 rounded-md opacity-0 group-hover:opacity-20 bg-gradient-to-r from-transparent via-white/30 to-transparent blur pointer-events-none" />
      </button>
    );
  }
);

Button.displayName = 'Button';
