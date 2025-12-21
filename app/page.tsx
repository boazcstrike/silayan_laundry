"use client";

/**
 * Main page component for the laundry counter application
 * Uses the new modular architecture with hooks and components
 */

import React from 'react';
import { LaundryCounter } from '@/components/LaundryCounter';
import categories from '@/app/assets/data/list';

/**
 * Home page component
 * Renders the laundry counter with categories data
 */
export default function HomePage() {
  return <LaundryCounter categories={categories} />;
}
