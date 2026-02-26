import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fhwxfppwkenmycsrxmsq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZod3hmcHB3a2VubXljc3J4bXNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1MDcyMjcsImV4cCI6MjA4NDA4MzIyN30.sn2S-swfjQyUqfZPnXRIM0C_OKysgNSPtJLpztbraQk';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
