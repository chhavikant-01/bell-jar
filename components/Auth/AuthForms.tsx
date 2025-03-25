/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';

const AuthForms: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const router = useRouter();
  
  const toggleForm = () => {
    setIsLogin(!isLogin);
  };
  
  const handleAuthSuccess = () => {
    // Navigate to dashboard or movie selection after successful auth
    router.push('/dashboard');
  };
  
  return (
    <div className="relative">
      <AnimatePresence mode="wait">
        {isLogin ? (
          <LoginForm 
            key="login" 
            onSuccess={handleAuthSuccess} 
            onToggleForm={toggleForm} 
          />
        ) : (
          <RegisterForm 
            key="register" 
            onSuccess={handleAuthSuccess} 
            onToggleForm={toggleForm} 
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default AuthForms; 