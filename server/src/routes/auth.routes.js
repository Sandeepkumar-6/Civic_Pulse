import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { User } from '../models/User.js'
import { clearSessionCookie, hashPassword, optionalAuth, publicUser, requireAuth, setSessionCookie, verifyPassword } from '../lib/auth.js'
import { loginSchema, profileSchema, registerSchema, validationError } from '../lib/validation.js'

export const authRouter = Router()

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many sign-in attempts. Please wait a few minutes and try again.' },
})

authRouter.post('/register', authLimiter, async (req, res, next) => {
  try {
    const parsed = registerSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json(validationError(parsed.error))
    const exists = await User.exists({ email: parsed.data.email })
    if (exists) return res.status(409).json({ message: 'An account already exists for this email. Sign in instead.' })
    const user = await User.create({ ...parsed.data, password: undefined, passwordHash: await hashPassword(parsed.data.password), role: 'citizen' })
    setSessionCookie(res, user)
    res.status(201).json({ user: publicUser(user) })
  } catch (error) {
    next(error)
  }
})

authRouter.post('/login', authLimiter, async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ message: 'Enter a valid email and password.' })
    const user = await User.findOne({ email: parsed.data.email }).select('+passwordHash')
    if (!user || !user.isActive || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
      return res.status(401).json({ message: 'The email or password is incorrect.' })
    }
    setSessionCookie(res, user)
    res.json({ user: publicUser(user) })
  } catch (error) {
    next(error)
  }
})

authRouter.post('/logout', (_req, res) => {
  clearSessionCookie(res)
  res.status(204).end()
})

authRouter.get('/me', optionalAuth, (req, res) => res.json({ user: req.user ? publicUser(req.user) : null }))

authRouter.patch('/profile', requireAuth, async (req, res, next) => {
  try {
    const parsed = profileSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json(validationError(parsed.error))
    req.user.name = parsed.data.name
    req.user.phone = parsed.data.phone
    if (req.user.role === 'citizen') req.user.city = parsed.data.city
    req.user.settings = parsed.data.settings
    await req.user.save()
    res.json({ user: publicUser(req.user) })
  } catch (error) {
    next(error)
  }
})
