// The Supabase URL and anon key are safe to ship publicly — Supabase's design
// relies on Row Level Security, not on this key being secret. They're read
// from EXPO_PUBLIC_* env vars for local dev (see .env.example), falling back
// to these hardcoded values so the project also runs as-is in environments
// with no .env support, e.g. an Expo Snack.
const FALLBACK_SUPABASE_URL = 'https://mfkkjrptqwubuubxesup.supabase.co';
const FALLBACK_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ma2tqcnB0cXd1YnV1Ynhlc3VwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYxODk2NzgsImV4cCI6MjEwMTc2NTY3OH0.On7gZlQCNfDhzUlCV3bzQuhsnpfL3Glpt7FZqYr6L-g';

export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || FALLBACK_SUPABASE_URL;
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY;
