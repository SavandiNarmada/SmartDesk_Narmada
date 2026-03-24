import jwt, { SignOptions } from 'jsonwebtoken';
import { JWTPayload } from '../types';

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) throw new Error('JWT_SECRET environment variable is not set');
const JWT_SECRET: string = jwtSecret;
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || '7d') as string;

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as SignOptions);
}

export function verifyToken(token: string): JWTPayload {
  return jwt.verify(token, JWT_SECRET) as unknown as JWTPayload;
}

export function generateRefreshToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' } as SignOptions);
}
