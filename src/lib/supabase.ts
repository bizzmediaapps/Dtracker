import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = 'https://xethyefkimjtidxxkniz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhldGh5ZWZraW1qdGlkeHhrbml6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAwNzIwMTIsImV4cCI6MjA1NTY0ODAxMn0.CzOSipYiGj3i6WHIEJgSs3iasurl1Yas2Su71GMtEzU';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey); 