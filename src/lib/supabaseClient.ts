import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Debug logging to see what's actually loaded
console.log('🔍 Supabase Config Debug:', {
  supabaseUrl: supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'MISSING',
  supabaseAnonKey: supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'MISSING',
  envKeys: Object.keys(import.meta.env).filter(k => k.startsWith('VITE_SUPABASE'))
})

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables:', {
    VITE_SUPABASE_URL: supabaseUrl ? '✓ set' : '✗ MISSING',
    VITE_SUPABASE_ANON_KEY: supabaseAnonKey ? '✓ set' : '✗ MISSING',
  })
  console.error('\n📝 To fix this:\n1. Create a .env file in the project root\n2. Add:\n   VITE_SUPABASE_URL=https://your-project.supabase.co\n   VITE_SUPABASE_ANON_KEY=your-anon-key\n3. Restart the dev server\n\nSee README.md for detailed instructions.')
  throw new Error('Missing Supabase environment variables. Check your .env file and README.md')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})
