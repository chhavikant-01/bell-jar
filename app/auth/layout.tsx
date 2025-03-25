import React from 'react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Bell Jar - Sign In',
  description: 'Sign in or create an account to join Bell Jar - a private, anonymous movie discussion platform.',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}