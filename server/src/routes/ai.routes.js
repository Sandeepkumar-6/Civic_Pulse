import { Router } from 'express'
import { requireAuth } from '../lib/auth.js'
import { aiAnalysisSchema, validationError } from '../lib/validation.js'

export function createAiRouter(aiService) {
  const router = Router()
  router.use(requireAuth)
  router.post('/report-assist', async (req, res, next) => {
    try {
      const parsed = aiAnalysisSchema.safeParse(req.body)
      if (!parsed.success) return res.status(400).json(validationError(parsed.error))
      const analysis = await aiService.analyzeReport(parsed.data.description)
      res.json({ analysis })
    } catch (error) {
      if (error.code === 'AI_UNAVAILABLE') return res.status(503).json({ message: error.message })
      next(error)
    }
  })
  return router
}
