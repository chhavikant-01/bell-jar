'use client'

import React, { InputHTMLAttributes, forwardRef, useState } from 'react';
import { motion } from 'framer-motion';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, fullWidth = false, ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false);

    const baseClasses = 'bg-transparent border border-black/10 dark:border-white/20 px-4 py-2 rounded-md outline-none';
    const focusClasses = isFocused 
      ? 'border-pink-500 shadow-[0_0_8px_rgba(255,0,255,0.3)] dark:shadow-[0_0_10px_rgba(255,0,255,0.4)]'
      : 'hover:border-gray-300 dark:hover:border-white/30';
    const errorClasses = error 
      ? 'border-red-500 dark:border-red-400'
      : '';
    const widthClasses = fullWidth ? 'w-full' : 'max-w-[300px]';
    
    return (
      <div className={`${fullWidth ? 'w-full' : ''} ${className || ''}`}>
        {label && (
          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
            {label}
          </label>
        )}
        <motion.div
          whileHover={{ scale: props.disabled ? 1 : 1.02 }}
          className="relative"
        >
          <input
            ref={ref}
            className={`${baseClasses} ${focusClasses} ${errorClasses} ${widthClasses} transition-all duration-200`}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            {...props}
          />
          {/* Glitch effect on hover */}
          <div className="absolute inset-0 pointer-events-none opacity-0 hover:opacity-20 bg-gradient-to-r from-transparent via-pink-200 to-transparent animate-pulse" />
        </motion.div>
        {error && (
          <p className="mt-1 text-sm text-red-500 dark:text-red-400">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input'; 