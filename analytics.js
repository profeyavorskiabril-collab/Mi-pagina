/**
 * Vercel Web Analytics initialization
 * This module initializes Vercel Analytics for tracking page views and user interactions
 */
import { inject } from '@vercel/analytics';

// Initialize Vercel Analytics
inject({
  mode: 'production', // Use 'development' for local testing
  debug: false // Set to true to see analytics events in console
});

console.log('✅ Vercel Analytics initialized');
