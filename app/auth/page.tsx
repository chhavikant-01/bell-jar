"use client"

import React from 'react';

import Link from 'next/link';
import dynamic from 'next/dynamic';

// Dynamically import auth components with no SSR to prevent localStorage errors
const AuthForms = dynamic(() => import('@/components/Auth/AuthForms'), {
  ssr: false, 
});

// Since we're using "use client", metadata needs to be moved to a separate file
// such as layout.ts or separate metadata file
// export const metadata: Metadata = {
//   title: 'Bell Jar - Sign In',
//   description: 'Sign in or create an account to join Bell Jar - a private, anonymous movie discussion platform.',
// };

export default function AuthPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-8 bg-gradient-to-br from-white to-purple-50 dark:from-gray-900 dark:to-purple-950">
      {/* Blurry background effect */}
      <div className="fixed inset-0 w-full h-full opacity-30 -z-10 overflow-hidden">
        <div className="absolute w-[40%] h-[40%] top-[15%] left-[30%] rounded-full bg-pink-200 dark:bg-pink-700 blur-[120px]" />
        <div className="absolute w-[50%] h-[50%] bottom-0 right-[10%] rounded-full bg-purple-200 dark:bg-purple-800 blur-[100px]" />
      </div>
      
      {/* Scanlines overlay */}
      <div className="fixed inset-0 bg-[url('/scanlines.png')] bg-repeat opacity-[0.03] dark:opacity-[0.05] pointer-events-none -z-10"></div>
      
      {/* Header / Logo */}
      <Link href="/" className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-pink-500 to-purple-600 neon-text">
          Bell Jar
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-sm mt-2">Anonymous movie discussions</p>
      </Link>
      
      {/* Auth container */}
      <div className="w-full max-w-md glass-card rounded-xl p-6 sm:p-8">
        <AuthForms />
      </div>
      
      {/* Privacy note */}
      <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400 max-w-md">
        <p>Bell Jar is committed to your privacy.</p>
        <p className="mt-1">We do not collect personal data, and your preferences are always under your control.</p>
      </div>
    </main>
  );
} 