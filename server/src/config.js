import 'dotenv/config'
import path from 'node:path'

const isProduction = process.env.NODE_ENV === 'production'

export const config = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProduction,
  port: Number(process.env.PORT ?? 4000),
  mongoUri: process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/civicpulse',
  jwtSecret: process.env.JWT_SECRET ?? (isProduction ? '' : 'civicpulse-development-secret-change-before-production'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:5176,http://localhost:5177,http://127.0.0.1:5173,http://127.0.0.1:5174,http://127.0.0.1:5175,http://127.0.0.1:5176,http://127.0.0.1:5177',
  cookieSameSite: process.env.COOKIE_SAME_SITE ?? 'lax',
  trustProxy: Number(process.env.TRUST_PROXY ?? 0),
  uploadDir: path.resolve(process.cwd(), process.env.UPLOAD_DIR ?? 'uploads'),
}

if (!config.jwtSecret || config.jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must contain at least 32 characters.')
}
if (!['lax', 'strict', 'none'].includes(config.cookieSameSite)) throw new Error('COOKIE_SAME_SITE must be lax, strict or none.')
if (isProduction && (!process.env.MONGODB_URI || !process.env.CLIENT_ORIGIN || config.jwtSecret.includes('replace-with') || config.jwtSecret.includes('development-secret'))) {
  throw new Error('Production requires explicit MONGODB_URI, CLIENT_ORIGIN and a private JWT_SECRET.')
}
