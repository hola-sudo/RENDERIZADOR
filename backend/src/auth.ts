import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { NextFunction, Request, Response } from 'express';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Faltan SUPABASE_URL o SUPABASE_PUBLISHABLE_KEY en las variables de entorno.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Extiende Request para llevar el usuario autenticado y su token.
export interface AuthedRequest extends Request {
  userId?: string;
  accessToken?: string;
}

/**
 * Crea un cliente Supabase que actúa CON la identidad del usuario, de modo
 * que las políticas RLS (auth.uid()) apliquen a sus consultas y a Storage.
 */
export function createUserClient(accessToken: string): SupabaseClient {
  return createClient(supabaseUrl!, supabaseKey!, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Middleware: exige un token de sesión de Supabase válido en el header
 * `Authorization: Bearer <access_token>`. Si es válido, adjunta userId y token.
 */
export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Falta el token de autenticación.' });
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return res.status(401).json({ error: 'Sesión inválida o expirada.' });
  }

  req.userId = data.user.id;
  req.accessToken = token;
  next();
}
