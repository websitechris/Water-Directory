// Configuration file for Supabase credentials
// These values are loaded from environment variables or can be set directly
// For production, use a build process to inject values from .env file

// Load from window.env if available (set by build process or server-side injection)
// Otherwise, use default values (should be replaced in production)
const SUPABASE_URL = window.env?.SUPABASE_URL || 'https://olgqzkkubqylfhswwzmf.supabase.co';
const SUPABASE_ANON_KEY = window.env?.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9sZ3F6a2t1YnF5bGZoc3d3em1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxMjA3NTIsImV4cCI6MjA4MDY5Njc1Mn0.apqyKmh97veDquQDVxQg5IuFUDeNLwBlgml6s7kYyxs';

// Export for use in other scripts
window.SUPABASE_CONFIG = {
    SUPABASE_URL,
    SUPABASE_ANON_KEY
};
