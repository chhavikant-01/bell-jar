/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Input } from '../ui/Input';
import { Button } from '../ui/button';

interface RegisterFormProps {
  onSuccess?: (data: any) => void;
  onToggleForm: () => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ onSuccess, onToggleForm }) => {
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear errors when user types
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    setIsLoading(true);
    setServerError('');
    
    try {
      const response = await axios.post('/api/auth/register', {
        username: formData.username,
        password: formData.password,
      });
      
      // Store token in localStorage for subsequent requests
      localStorage.setItem('belljar_token', response.data.token);
      localStorage.setItem('belljar_user', JSON.stringify(response.data.user));
      
      if (onSuccess) {
        onSuccess(response.data);
      } else {
        router.push('/dashboard');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Registration failed. Please try again.';
      setServerError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-md"
    >
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Join Bell Jar
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Create your anonymous account to start movie discussions
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {serverError && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 p-3 rounded-md text-sm"
          >
            {serverError}
          </motion.div>
        )}
        
        <div>
          <Input
            fullWidth
            type="text"
            name="username"
            placeholder="Username"
            value={formData.username}
            onChange={handleChange}
            error={errors.username}
            disabled={isLoading}
          />
        </div>
        
        <div>
          <Input
            fullWidth
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            error={errors.password}
            disabled={isLoading}
          />
        </div>
        
        <div>
          <Input
            fullWidth
            type="password"
            name="confirmPassword"
            placeholder="Confirm Password"
            value={formData.confirmPassword}
            onChange={handleChange}
            error={errors.confirmPassword}
            disabled={isLoading}
          />
        </div>
        
        <Button
          type="submit"
          variant="primary"
          fullWidth
          disabled={isLoading}
          className="mt-2"
        >
          {isLoading ? (
            <span className="flex items-center justify-center">
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2"
              />
              Creating Account...
            </span>
          ) : (
            'Sign Up'
          )}
        </Button>
        
        <div className="text-center mt-4">
          <button
            type="button"
            onClick={onToggleForm}
            className="text-sm text-pink-600 dark:text-pink-400 hover:underline"
          >
            Already have an account? Log in
          </button>
        </div>
      </form>
    </motion.div>
  );
}; 