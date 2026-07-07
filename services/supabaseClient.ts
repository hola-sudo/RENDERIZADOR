import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  throw new Error(
    'Faltan VITE_SUPABASE_URL o VITE_SUPABASE_PUBLISHABLE_KEY. Revisa tu archivo .env.local.',
  );
}

export const supabase = createClient(url, key);

// URL base del backend (Render Web Service). En local: http://localhost:8080
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';
