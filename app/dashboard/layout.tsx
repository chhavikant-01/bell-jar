import React from 'react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Bell Jar - Dashboard',
  description: 'Search for movies and start anonymous discussions with other movie enthusiasts.',
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}