import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://isqqophpzaunxhdcaoly.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzcXFvcGhwemF1bnhoZGNhb2x5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIzODE3MTEsImV4cCI6MjEwNzk1NzcxMX0.OEVTTrWSRjjaNZ96sljS1S8mM7WTk5k-h0Zi5CbxgX0'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
