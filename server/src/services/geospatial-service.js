import { Report, REPORT_CATEGORIES, REPORT_STATUSES } from '../models/Report.js'

const OPEN_STATUSES = REPORT_STATUSES.filter((status) => status !== 'Closed')

function validFilter(value, allowed) {
  return value && allowed.includes(value) ? value : undefined
}

export function reportQueryFilters(filters = {}) {
  const { category, status } = filters ?? {}
  const query = {}
  const safeCategory = validFilter(category, REPORT_CATEGORIES)
  const safeStatus = validFilter(status, REPORT_STATUSES)
  if (safeCategory) query.category = safeCategory
  if (safeStatus) query.status = safeStatus
  return query
}

export async function reportsInBounds({ west, south, east, north, category, status, limit = 500 }) {
  const geoQuery = west <= east
    ? { $geometry: { type: 'Polygon', coordinates: [[[west, south], [east, south], [east, north], [west, north], [west, south]]] } }
    : { $geometry: { type: 'MultiPolygon', coordinates: [[[[west, south], [180, south], [180, north], [west, north], [west, south]]], [[[-180, south], [east, south], [east, north], [-180, north], [-180, south]]]] } }
  return Report.find({
    ...reportQueryFilters({ category, status }),
    geo: { $geoWithin: geoQuery },
  }).sort({ createdAt: -1 }).limit(limit).lean()
}

export async function nearbyReports({ latitude, longitude, radius, category, status, limit = 50 }) {
  return Report.aggregate([
    {
      $geoNear: {
        key: 'geo',
        near: { type: 'Point', coordinates: [longitude, latitude] },
        distanceField: 'distanceMetres',
        maxDistance: radius,
        spherical: true,
        query: reportQueryFilters({ category, status }),
      },
    },
    { $limit: limit },
  ])
}

function meaningfulTokens(value) {
  if (typeof value !== 'string') return new Set()
  const stop = new Set(['about', 'after', 'along', 'been', 'beside', 'from', 'have', 'into', 'near', 'road', 'that', 'the', 'this', 'with'])
  return new Set(value.toLowerCase().match(/[a-z]{3,}/g)?.filter((token) => !stop.has(token)) ?? [])
}

function similarity(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string') return 0
  const a = meaningfulTokens(left)
  const b = meaningfulTokens(right)
  if (!a.size || !b.size) return 0
  const intersection = [...a].filter((token) => b.has(token)).length
  return intersection / Math.max(1, new Set([...a, ...b]).size)
}

export async function findPossibleDuplicates({ category, description, latitude, longitude, radius = 200, hours = 72, limit = 8 } = {}) {
  if (!category || typeof description !== 'string' || !description.trim() || latitude === undefined || longitude === undefined) {
    return []
  }

  const createdAfter = new Date(Date.now() - hours * 60 * 60 * 1000)
  const nearby = await Report.aggregate([
    {
      $geoNear: {
        key: 'geo',
        near: { type: 'Point', coordinates: [longitude, latitude] },
        distanceField: 'distanceMetres',
        maxDistance: radius,
        spherical: true,
        query: { category, status: { $in: OPEN_STATUSES }, createdAt: { $gte: createdAfter } },
      },
    },
    { $limit: 25 },
  ])

  return nearby
    .map((report) => ({ ...report, similarity: similarity(description, report.description) }))
    .filter((report) => report.similarity >= 0.18 || report.distanceMetres <= Math.min(radius, 75))
    .slice(0, limit)
}
