import express from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import helmet from 'helmet'
import multer from 'multer'
import mongoose from 'mongoose'
import { config } from './config.js'
import { authRouter } from './routes/auth.routes.js'
import { reportRouter } from './routes/report.routes.js'
import { createAiRouter } from './routes/ai.routes.js'
import { dashboardRouter } from './routes/dashboard.routes.js'
import { civicAiService } from './services/ai-service.js'

export function createApp({ aiService = civicAiService } = {}) {
  const app = express()
  app.disable('x-powered-by')
  if (config.trustProxy) app.set('trust proxy', config.trustProxy)
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-site' } }))

  const origins = config.clientOrigin.split(',').map((origin) => origin.trim()).filter(Boolean)
  const isLocalhostOrigin = (origin) => {
    if (!origin) return true
    try {
      const { protocol, hostname } = new URL(origin)
      return ['http:', 'https:'].includes(protocol) && ['localhost', '127.0.0.1', '0.0.0.0'].includes(hostname)
    } catch {
      return false
    }
  }

  app.use(cors({
    origin: (origin, callback) => {
      if (!origin || origins.includes(origin) || isLocalhostOrigin(origin)) {
        callback(null, true)
        return
      }
      callback(null, false)
    },
    credentials: true,
  }))

  app.use((req, res, next) => {
    const origin = req.headers.origin
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && origin && !origins.includes(origin) && !isLocalhostOrigin(origin)) {
      return res.status(403).json({ message: 'Request origin is not permitted.' })
    }
    next()
  })

  app.use(express.json({ limit: '1mb' }))
  app.use(cookieParser())

  app.get('/api/health', (_req, res) => {
    const connected = mongoose.connection.readyState === 1
    res.status(connected ? 200 : 503).json({ status: connected ? 'ok' : 'unavailable', database: connected ? 'connected' : 'disconnected' })
  })
  app.use('/api/auth', authRouter)
  app.use('/api/reports', reportRouter)
  app.use('/api/ai', createAiRouter(aiService))
  app.use('/api/dashboard', dashboardRouter)

  app.use('/api/{*path}', (_req, res) => res.status(404).json({ message: 'API endpoint not found.' }))
  app.use((error, _req, res, _next) => {
    if (error.type === 'entity.parse.failed') return res.status(400).json({ message: 'Request body must contain valid JSON.' })
    if (error.type === 'entity.too.large') return res.status(413).json({ message: 'Request is too large.' })
<<<<<<< HEAD
    if (error.name === 'ValidationError') return res.status(400).json({ message: 'Please check the supplied information.' })
=======
    if (error.name === 'ValidationError') {
      const errors = Object.fromEntries(Object.entries(error.errors ?? {}).map(([path, issue]) => [path, issue.message]))
      return res.status(400).json({ message: 'Please check the supplied information.', ...(Object.keys(errors).length ? { errors } : {}) })
    }
>>>>>>> d7791a3a153ce2670831d4f31241860676c7fdd2
    if (error instanceof multer.MulterError) {
      const message = error.code === 'LIMIT_FILE_SIZE' ? 'Each photograph must be 5 MB or smaller.' : error.code === 'LIMIT_FILE_COUNT' ? 'You can add up to four photographs.' : 'The photograph upload could not be completed.'
      return res.status(400).json({ message })
    }
    if (error?.message?.includes('Only JPEG')) return res.status(400).json({ message: error.message })
    if (error?.name === 'CastError') return res.status(404).json({ message: 'The requested record was not found.' })
    if (error?.code === 11000) return res.status(409).json({ message: 'A record with this information already exists.' })
    console.error(error)
    res.status(500).json({ message: 'Something went wrong on our side. Please try again.' })
  })

  return app
}
