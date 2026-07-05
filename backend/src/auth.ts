import { createClient } from '@supabase/supabase-js';
import type { NextFunction, Request, Response } from 'express';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan SUPABASE_URL o SUPABASE_ANON_KEY en las variables de entorno.');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Extiende Request para llevar el usuario autenticado.
export interface AuthedRequest extends Request {
  userId?: string;
}

/**
 * Middleware: exige un token de sesión de Supabase válido en el header
 * `Authorization: Bearer <access_token>`. Si es válido, adjunta userId.
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
  next();
}
