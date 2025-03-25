"use client"

import React from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';

// Dynamically import dashboard component with no SSR to prevent localStorage errors
const DashboardContent = dynamic(() => import('@/components/Dashboard/DashboardContent'), {
  ssr: false,
});

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-white to-purple-50 dark:from-gray-900 dark:to-purple-950">
      {/* Blurry background effect */}
      <div className="fixed inset-0 w-full h-full opacity-30 -z-10 overflow-hidden">
        <div className="absolute w-[60%] h-[60%] top-[5%] left-[20%] rounded-full bg-pink-200 dark:bg-pink-700 blur-[120px]" />
        <div className="absolute w-[50%] h-[50%] bottom-0 left-[10%] rounded-full bg-purple-200 dark:bg-purple-800 blur-[100px]" />
        <div className="absolute w-[40%] h-[40%] top-[30%] right-[5%] rounded-full bg-blue-200 dark:bg-blue-800 blur-[80px]" />
      </div>
      
      {/* Scanlines overlay */}
      <div className="fixed inset-0 bg-[url('/scanlines.png')] bg-repeat opacity-[0.03] dark:opacity-[0.05] pointer-events-none -z-10"></div>
      
      {/* Header */}
      <header className="glass-card border-b border-purple-200 dark:border-purple-900/30">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-pink-500 to-purple-600 neon-text">
              Bell Jar
            </h1>
          </Link>
          
          <nav>
            <ul className="flex gap-6">
              <li>
                <Link 
                  href="/dashboard" 
                  className="text-purple-700 dark:text-purple-300 hover:text-purple-900 dark:hover:text-purple-100"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link 
                  href="/dashboard/preferences" 
                  className="text-gray-700 dark:text-gray-300 hover:text-purple-900 dark:hover:text-purple-100"
                >
                  My Preferences
                </Link>
              </li>
              <li>
                <button 
                  className="text-gray-700 dark:text-gray-300 hover:text-purple-900 dark:hover:text-purple-100"
                  // We'll implement logout functionality in the client component
                >
                  Logout
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </header>
      
      {/* Main content - Dynamically loaded client component */}
      <div className="container mx-auto px-4 py-8">
        <DashboardContent />
      </div>
      
      {/* Footer */}
      <footer className="mt-auto py-6 text-center text-sm text-gray-500 dark:text-gray-400">
        <p>© {new Date().getFullYear()} Bell Jar. Privacy-focused movie discussions.</p>
      </footer>
    </main>
  );
}