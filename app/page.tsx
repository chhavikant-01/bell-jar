"use client"

import React from 'react';
import Link from 'next/link';
import { motion, Variants } from 'framer-motion';

export default function Home() {
  // Staggered animation for elements
  const container: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3,
      },
    },
  };
  
  const item: Variants = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { duration: 0.5 } },
  };
  
  // Glitch animation variants
  const glitchAnimation: Variants = {
    initial: { 
      textShadow: '0 0 0 rgba(255,0,255,0)',
      skew: 0
    },
    animate: {
      textShadow: [
        '0 0 0 rgba(255,0,255,0)',
        '-1px -1px 3px rgba(255,0,255,0.3)',
        '1px 1px 0 rgba(0,255,255,0.3)',
        '0 0 0 rgba(255,0,255,0)',
      ],
      skew: [0, -0.5, 0.5, 0],
      transition: { 
        duration: 0.8, 
        repeat: Infinity, 
        repeatType: "reverse",
        repeatDelay: 8,
      }
    }
  };
  
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-8 bg-gradient-to-br from-white to-purple-50 dark:from-gray-900 dark:to-purple-950">
      {/* Blurry background effect */}
      <div className="fixed inset-0 w-full h-full opacity-30 -z-10 overflow-hidden">
        <div className="absolute w-[60%] h-[60%] top-[5%] left-[20%] rounded-full bg-pink-200 dark:bg-pink-700 blur-[120px]" />
        <div className="absolute w-[50%] h-[50%] bottom-0 left-[10%] rounded-full bg-purple-200 dark:bg-purple-800 blur-[100px]" />
        <div className="absolute w-[40%] h-[40%] top-[30%] right-[5%] rounded-full bg-blue-200 dark:bg-blue-800 blur-[80px]" />
      </div>
      
      {/* Scanlines overlay */}
      <div className="fixed inset-0 bg-[url('/scanlines.png')] bg-repeat opacity-[0.03] dark:opacity-[0.05] pointer-events-none -z-10"></div>
      
      {/* Content */}
      <motion.div 
        className="w-full max-w-3xl mx-auto rounded-2xl overflow-hidden glass-card p-6 sm:p-12"
        variants={container}
        initial="hidden"
        animate="show"
      >
        <motion.div 
          className="text-center mb-12"
          variants={item}
        >
          <motion.h1 
            className="text-5xl md:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-pink-500 to-purple-600 mb-6"
            variants={glitchAnimation}
            initial="initial"
            animate="animate"
          >
            Bell Jar
          </motion.h1>
          
          <motion.p 
            className="text-gray-600 dark:text-gray-300 font-serif italic mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 2 }}
          >
            &quot;I listen to the old brag of heart, I am, I am, I am&quot;
          </motion.p>
          
          <motion.div
            className="text-gray-700 dark:text-gray-300 mb-8"
            variants={item}
          >
            <p>Anonymous movie discussions with real-time chat. Create a profile based on your conversations.</p>
            <p className="text-sm mt-2 text-purple-600 dark:text-purple-400">Your data stays private. Your preferences stay yours.</p>
          </motion.div>
        </motion.div>
        
        {/* Call to action */}
        <motion.div 
          className="flex flex-col sm:flex-row gap-4 justify-center"
          variants={item}
        >
          <Link href="/auth" className="inline-block">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium py-3 px-8 shadow-lg shadow-purple-600/20 dark:shadow-purple-900/20 text-center"
            >
              Get Started
            </motion.div>
          </Link>
          
          <Link href="/about" className="inline-block">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="rounded-full bg-white dark:bg-gray-800 text-purple-600 dark:text-purple-400 font-medium py-3 px-8 shadow-md border border-purple-200 dark:border-purple-700 text-center"
            >
              Learn More
            </motion.div>
          </Link>
        </motion.div>
        
        {/* Features */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16"
          variants={item}
        >
          <div className="p-4 bg-white/50 dark:bg-gray-800/50 rounded-xl">
            <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-600 dark:text-purple-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="font-medium text-lg mb-2">Anonymous Profiles</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">No personal data required. Your privacy is our priority.</p>
          </div>
          
          <div className="p-4 bg-white/50 dark:bg-gray-800/50 rounded-xl">
            <div className="w-10 h-10 rounded-full bg-pink-100 dark:bg-pink-900/50 flex items-center justify-center mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-pink-600 dark:text-pink-400" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
              </svg>
            </div>
            <h3 className="font-medium text-lg mb-2">Real-time Chats</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Discuss films with others who share your interests.</p>
          </div>
          
          <div className="p-4 bg-white/50 dark:bg-gray-800/50 rounded-xl">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600 dark:text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="font-medium text-lg mb-2">Smart Recommendations</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Get personalized movie suggestions based on your chats.</p>
          </div>
        </motion.div>
      </motion.div>
      
      {/* Footer */}
      <footer className="w-full mt-12 text-center text-sm text-gray-500 dark:text-gray-400">
        <p>© {new Date().getFullYear()} Bell Jar. Privacy-focused movie discussions.</p>
        <p className="mt-1">Your data never leaves the jar.</p>
      </footer>
    </main>
  );
}
