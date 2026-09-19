import { REPORT_CATEGORIES } from '../models/Report.js'

const categorySignals = {
  Pothole: ['pothole', 'crater', 'pit', 'hole', 'two-wheeler'],
  'Garbage accumulation': ['garbage', 'waste', 'rubbish', 'bin', 'dump', 'litter'],
  'Damaged streetlight': ['streetlight', 'lamp', 'dark', 'lighting', 'light'],
  'Blocked drainage': ['drain', 'drainage', 'waterlogging', 'overflow', 'sewage', 'stormwater'],
  'Road damage': ['road', 'surface', 'divider', 'shoulder', 'crack', 'asphalt'],
  'Water infrastructure': ['pipeline', 'water', 'leak', 'tap', 'supply', 'hydrant'],
  'Public sanitation': ['toilet', 'sanitation', 'washroom', 'cleaning', 'urinal'],
  'Signage issue': ['sign', 'signage', 'direction', 'board', 'signal'],
}

const urgentSignals = ['accident', 'collapse', 'danger', 'electrical', 'exposed', 'flood', 'injury', 'sparking', 'sinkhole']
const importantSignals = ['blocked', 'hazard', 'leak', 'overflow', 'unsafe', 'waterlogging']

export class LocalCivicAnalysisProvider {
  name = 'local-civic-analysis'

  async analyze(description) {
    const normalised = description.toLowerCase()
    const scores = REPORT_CATEGORIES.map((category) => ({
      category,
      score: categorySignals[category].reduce((total, signal) => total + (normalised.includes(signal) ? 1 : 0), 0),
    })).sort((a, b) => b.score - a.score)
    const best = scores[0]
    const totalSignals = scores.reduce((sum, item) => sum + item.score, 0)
    const priority = urgentSignals.some((signal) => normalised.includes(signal))
      ? 'Urgent'
      : importantSignals.some((signal) => normalised.includes(signal)) ? 'Important' : 'Routine'
    const firstSentence = description.trim().split(/(?<=[.!?])\s+/)[0]
    return {
      provider: this.name,
      suggestedCategory: best.score ? best.category : null,
      confidence: best.score ? Math.min(0.96, 0.55 + (best.score / Math.max(totalSignals, 1)) * 0.35) : 0,
      suggestedPriority: priority,
      summary: firstSentence.slice(0, 220),
      guidance: best.score ? 'Review this suggestion before applying it.' : 'Add the affected civic asset and visible hazard for a stronger suggestion.',
    }
  }
}

export class CivicAiService {
  constructor(provider = new LocalCivicAnalysisProvider()) {
    this.provider = provider
  }

  async analyzeReport(description) {
    try {
      const analysis = await this.provider.analyze(description)
      return { available: true, ...analysis }
    } catch (error) {
      const wrapped = new Error('Civic Assist is temporarily unavailable. You can continue reporting without it.')
      wrapped.cause = error
      wrapped.code = 'AI_UNAVAILABLE'
      throw wrapped
    }
  }
}

export const civicAiService = new CivicAiService()
