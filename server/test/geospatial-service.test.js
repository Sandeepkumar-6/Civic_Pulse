// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

const findMock = vi.fn()
const aggregateMock = vi.fn()

vi.mock('../src/models/Report.js', () => ({
  REPORT_CATEGORIES: ['Pothole', 'Garbage accumulation', 'Damaged streetlight', 'Blocked drainage', 'Road damage', 'Water infrastructure', 'Public sanitation', 'Signage issue'],
  REPORT_STATUSES: ['Submitted', 'Acknowledged', 'Assigned', 'In Progress', 'Resolved', 'Closed'],
  Report: {
    find: (...args) => {
      findMock(...args)
      return {
        sort: () => ({ limit: () => ({ lean: async () => [] }) }),
      }
    },
    aggregate: (...args) => aggregateMock(...args),
  },
}))

const { reportQueryFilters, reportsInBounds, findPossibleDuplicates } = await import('../src/services/geospatial-service.js')

beforeEach(() => {
  findMock.mockClear()
  aggregateMock.mockClear()
})

describe('reportQueryFilters', () => {
  it('accepts whitelisted category and status values', () => {
    expect(reportQueryFilters({ category: 'Pothole', status: 'Resolved' })).toEqual({
      category: 'Pothole',
      status: 'Resolved',
    })
  })

  it('drops values outside the whitelists instead of passing them to Mongo', () => {
    expect(reportQueryFilters({ category: "'; db.dropDatabase()", status: 'NotAStatus' })).toEqual({})
  })

  it('returns an empty query for missing or empty filters', () => {
    expect(reportQueryFilters()).toEqual({})
    expect(reportQueryFilters({ category: '', status: undefined })).toEqual({})
    expect(reportQueryFilters(null)).toEqual({})
  })

  it('ignores non-string values instead of passing them to Mongo', () => {
    expect(reportQueryFilters({ category: { $ne: 'Pothole' }, status: ['Resolved'] })).toEqual({})
    expect(reportQueryFilters({ category: 42, status: true })).toEqual({})
  })

  it('keeps a valid category even when the status is invalid, and vice versa', () => {
    expect(reportQueryFilters({ category: 'Pothole', status: 'Nope' })).toEqual({ category: 'Pothole' })
    expect(reportQueryFilters({ category: 'Nope', status: 'Resolved' })).toEqual({ status: 'Resolved' })
  })

  it('is case-sensitive: lowercase whitelist values are rejected', () => {
    expect(reportQueryFilters({ category: 'pothole', status: 'resolved' })).toEqual({})
  })
})

describe('reportsInBounds antimeridian handling', () => {
  it('builds a single polygon when west <= east', async () => {
    await reportsInBounds({ west: 73, south: 18, east: 74, north: 19 })
    const query = findMock.mock.calls[0][0]
    expect(query.geo.$geoWithin.$geometry.type).toBe('Polygon')
    expect(query.geo.$geoWithin.$geometry.coordinates[0][0]).toEqual([73, 18])
    expect(query.geo.$geoWithin.$geometry.coordinates[0][3]).toEqual([73, 19])
  })

  it('builds a multipolygon crossing the antimeridian when west > east', async () => {
    await reportsInBounds({ west: 178, south: 10, east: -178, north: 12 })
    const query = findMock.mock.calls[0][0]
    const geometry = query.geo.$geoWithin.$geometry
    expect(geometry.type).toBe('MultiPolygon')
    expect(geometry.coordinates).toHaveLength(2)
    const [eastern, western] = geometry.coordinates
    expect(eastern[0][0][0]).toBe(178)
    expect(eastern[0][1][0]).toBe(180)
    expect(western[0][0][0]).toBe(-180)
    expect(western[0][1][0]).toBe(-178)
  })

  it('keeps the western polygon on the far side of the antimeridian closed correctly', async () => {
    await reportsInBounds({ west: 179, south: -5, east: -179, north: 5 })
    const geometry = findMock.mock.calls[0][0].geo.$geoWithin.$geometry
    expect(geometry.type).toBe('MultiPolygon')
    // eastern shell ends exactly at +180, western shell starts exactly at -180
    expect(geometry.coordinates[0][0][1]).toEqual([180, -5])
    expect(geometry.coordinates[1][0][0]).toEqual([-180, -5])
  })

  it('treats west === east as a degenerate normal polygon, not an antimeridian split', async () => {
    await reportsInBounds({ west: 73, south: 0, east: 73, north: 1 })
    expect(findMock.mock.calls[0][0].geo.$geoWithin.$geometry.type).toBe('Polygon')
  })

  it('applies safe category and status filters together with the geo query', async () => {
    await reportsInBounds({ west: 0, south: 0, east: 1, north: 1, category: 'Pothole', status: 'Open Season' })
    const query = findMock.mock.calls[0][0]
    expect(query.category).toBe('Pothole')
    expect(query.status).toBeUndefined()
  })
})

describe('findPossibleDuplicates', () => {
  function geoNearStage(call) {
    return call[0][0].$geoNear
  }

  it('filters nearby reports to open statuses inside the time window', async () => {
    aggregateMock.mockResolvedValueOnce([])
    await findPossibleDuplicates({ category: 'Pothole', description: 'deep pothole', latitude: 18.55, longitude: 73.8 })
    const near = geoNearStage(aggregateMock.mock.calls[0])
    expect(near.query.category).toBe('Pothole')
    expect(near.query.status.$in).not.toContain('Closed')
    expect(new Date(near.query.createdAt.$gte).getTime()).toBeLessThanOrEqual(Date.now())
    expect(near.maxDistance).toBe(200)
  })

  it('keeps reports above the similarity threshold', async () => {
    aggregateMock.mockResolvedValueOnce([
      { _id: 'similar', description: 'a deep pothole obstructing the cycle lane', distanceMetres: 180 },
      { _id: 'unrelated', description: 'streetlight completely dark near the park gate', distanceMetres: 180 },
    ])
    const results = await findPossibleDuplicates({ category: 'Pothole', description: 'a deep pothole blocking the cycle lane', latitude: 18.55, longitude: 73.8 })
    expect(results.map((report) => report._id)).toEqual(['similar'])
    expect(results[0].similarity).toBeGreaterThanOrEqual(0.18)
  })

  it('keeps very close reports even when similarity is zero', async () => {
    aggregateMock.mockResolvedValueOnce([
      { _id: 'close', description: 'something entirely unrelated', distanceMetres: 60 },
    ])
    const results = await findPossibleDuplicates({ category: 'Pothole', description: 'pothole near the bus shelter', latitude: 18.55, longitude: 73.8 })
    expect(results.map((report) => report._id)).toEqual(['close'])
  })

  it('drops reports that are neither similar nor close', async () => {
    aggregateMock.mockResolvedValueOnce([
      { _id: 'far-and-different', description: 'streetlight dark near the park', distanceMetres: 190 },
    ])
    const results = await findPossibleDuplicates({ category: 'Pothole', description: 'pothole near the bus shelter', latitude: 18.55, longitude: 73.8 })
    expect(results).toEqual([])
  })

  it('includes borderline reports exactly at the 0.18 similarity threshold', async () => {
    // "pothole near the bus shelter" vs "pothole in the bus shelter" share one token
    // of {pothole, bus, shelter} against a union of 5 -> similarity 0.2 >= 0.18
    aggregateMock.mockResolvedValueOnce([
      { _id: 'borderline', description: 'pothole in the bus shelter', distanceMetres: 180 },
    ])
    const results = await findPossibleDuplicates({ category: 'Pothole', description: 'pothole near the bus shelter', latitude: 18.55, longitude: 73.8 })
    expect(results).toHaveLength(1)
    expect(results[0].similarity).toBeGreaterThanOrEqual(0.18)
  })

  it('ignores stop words and short tokens when scoring similarity', async () => {
    // only the meaningful token "pothole" is shared; "near"/"the" are stop words
    aggregateMock.mockResolvedValueOnce([
      { _id: 'stopword-only', description: 'pothole', distanceMetres: 180 },
    ])
    const results = await findPossibleDuplicates({ category: 'Pothole', description: 'pothole near the bus shelter', latitude: 18.55, longitude: 73.8 })
    expect(results.map((report) => report._id)).toEqual(['stopword-only'])
  })

  it('returns no duplicates for a blank description', async () => {
    await findPossibleDuplicates({ category: 'Pothole', description: '   ', latitude: 18.55, longitude: 73.8 })
    expect(aggregateMock).not.toHaveBeenCalled()
  })

  it('honours the limit on returned duplicates', async () => {
    aggregateMock.mockResolvedValueOnce([
      { _id: 'a', description: 'pothole near the bus shelter', distanceMetres: 180 },
      { _id: 'b', description: 'pothole near the bus shelter', distanceMetres: 180 },
      { _id: 'c', description: 'pothole near the bus shelter', distanceMetres: 180 },
    ])
    const results = await findPossibleDuplicates({ category: 'Pothole', description: 'pothole near the bus shelter', latitude: 18.55, longitude: 73.8, limit: 2 })
    expect(results).toHaveLength(2)
  })
})
