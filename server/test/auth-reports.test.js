// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { MongoMemoryServer } from 'mongodb-memory-server'
import request from 'supertest'

let mongoServer
let app
let citizenAgent
let createdReportId

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create({ instance: { dbName: 'civicpulse_test' } })
  process.env.MONGODB_URI = mongoServer.getUri()
  process.env.JWT_SECRET = 'civicpulse-test-secret-with-more-than-thirty-two-characters'
  process.env.UPLOAD_DIR = 'test-results/api-uploads'
  const [{ createApp }, { connectDatabase }] = await Promise.all([import('../src/app.js'), import('../src/db.js')])
  await connectDatabase(process.env.MONGODB_URI)
  app = createApp()
  citizenAgent = request.agent(app)
}, 120000)

afterAll(async () => {
  const { disconnectDatabase } = await import('../src/db.js')
  await disconnectDatabase()
  await mongoServer.stop()
})

describe('authentication and citizen reports API', () => {
  it('registers a citizen and persists the authenticated session', async () => {
    const response = await citizenAgent.post('/api/auth/register').send({
      name: 'Meera Kulkarni',
      email: 'meera.kulkarni@civicpulse.local',
      phone: '+919812345678',
      password: 'CivicCity#42',
      role: 'admin',
    })
    expect(response.status).toBe(201)
    expect(response.body.user.role).toBe('citizen')
    const session = await citizenAgent.get('/api/auth/me')
    expect(session.status).toBe(200)
    expect(session.body.user.email).toBe('meera.kulkarni@civicpulse.local')
  })

  it('rejects invalid credentials without exposing account details', async () => {
    const response = await request(app).post('/api/auth/login').send({ email: 'meera.kulkarni@civicpulse.local', password: 'incorrect' })
    expect(response.status).toBe(401)
    expect(response.body.message).toBe('The email or password is incorrect.')
  })

  it('creates and retrieves a MongoDB-backed report with a photograph', async () => {
    const response = await citizenAgent
      .post('/api/reports')
      .field('category', 'Pothole')
      .field('description', 'A deep pothole is obstructing the cycle lane beside the neighbourhood bus shelter.')
      .field('location', JSON.stringify({ address: 'Aundh Road near Gaikwad Nagar', landmark: 'Beside the PMPML shelter', city: 'Pune', state: 'Maharashtra', pincode: '411007', coordinates: { latitude: 18.5588, longitude: 73.8075 } }))
      .attach('photos', Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZpDkAAAAASUVORK5CYII=', 'base64'), { filename: 'pothole.png', contentType: 'image/png' })
    expect(response.status).toBe(201)
    expect(response.body.report.reference).toMatch(/^CP-\d{4}-[A-F0-9]{12}$/)
    expect(response.body.report.photos).toHaveLength(1)
    createdReportId = response.body.report.id

    const photograph = await citizenAgent.get(response.body.report.photos[0].url)
    expect(photograph.status).toBe(200)
    expect(photograph.headers['content-type']).toContain('image/png')
    expect((await request(app).get(response.body.report.photos[0].url)).status).toBe(401)

    const list = await citizenAgent.get('/api/reports')
    expect(list.status).toBe(200)
    expect(list.body.reports[0].location.city).toBe('Pune')
  })

  it('prevents unauthenticated and cross-citizen report access', async () => {
    expect((await request(app).get('/api/reports')).status).toBe(401)
    const otherAgent = request.agent(app)
    await otherAgent.post('/api/auth/register').send({ name: 'Kabir Shah', email: 'kabir.shah@civicpulse.local', phone: '+919812345679', password: 'AnotherCity#7' })
    expect((await otherAgent.get(`/api/reports/${createdReportId}`)).status).toBe(403)
  })

  it('uses a 2dsphere index for bounded, nearby and filtered report queries', async () => {
    const { Report } = await import('../src/models/Report.js')
    await Report.syncIndexes()
    const indexes = await Report.collection.indexes()
    expect(indexes.some((index) => index.key?.geo === '2dsphere')).toBe(true)

    const bounds = await citizenAgent.get('/api/reports/map').query({ west: 73.79, south: 18.54, east: 73.83, north: 18.58 })
    expect(bounds.status).toBe(200)
    expect(bounds.body.reports.some((report) => report.id === createdReportId)).toBe(true)

    const nearby = await citizenAgent.get('/api/reports/nearby').query({ latitude: 18.5588, longitude: 73.8075, radius: 1000, category: 'Pothole' })
    expect(nearby.status).toBe(200)
    expect(nearby.body.reports[0].id).toBe(createdReportId)
    expect(nearby.body.reports[0].distanceMetres).toBeLessThan(5)

    const filteredOut = await citizenAgent.get('/api/reports/nearby').query({ latitude: 18.5588, longitude: 73.8075, radius: 1000, status: 'Resolved' })
    expect(filteredOut.status).toBe(200)
    expect(filteredOut.body.reports).toHaveLength(0)
  })

  it('warns about time-windowed nearby duplicates but still accepts a valid submission', async () => {
    const { Report } = await import('../src/models/Report.js')
    const { User } = await import('../src/models/User.js')
    const citizen = await User.findOne({ email: 'meera.kulkarni@civicpulse.local' })
    await Report.create({
      reference: 'CP-2026-OLD001', citizen: citizen.id, category: 'Pothole',
      description: 'An older pothole report beside the same neighbourhood bus shelter and cycle lane.',
      location: { address: 'Aundh Road near Gaikwad Nagar', city: 'Pune', state: 'Maharashtra', pincode: '411007', coordinates: { latitude: 18.55881, longitude: 73.80751 } },
      status: 'Submitted', createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    })
    const duplicatePayload = {
      category: 'Pothole',
      description: 'The deep pothole beside the neighbourhood bus shelter is obstructing the cycle lane.',
      latitude: 18.55882,
      longitude: 73.80752,
      radius: 200,
      hours: 72,
    }
    const warning = await citizenAgent.post('/api/reports/duplicates/check').send(duplicatePayload)
    expect(warning.status).toBe(200)
    expect(warning.body.warningOnly).toBe(true)
    expect(warning.body.possibleDuplicates[0].id).toBe(createdReportId)
    expect(warning.body.possibleDuplicates.some((report) => report.reference === 'CP-2026-OLD001')).toBe(false)

    const submitted = await citizenAgent
      .post('/api/reports')
      .field('category', duplicatePayload.category)
      .field('description', duplicatePayload.description)
      .field('location', JSON.stringify({ address: 'Aundh Road near Gaikwad Nagar', city: 'Pune', state: 'Maharashtra', pincode: '411007', coordinates: { latitude: duplicatePayload.latitude, longitude: duplicatePayload.longitude } }))
    expect(submitted.status).toBe(201)
    expect(submitted.body.warningOnly).toBe(true)
    expect(submitted.body.possibleDuplicates.length).toBeGreaterThan(0)
    expect(submitted.body.report.id).toBeTruthy()
  })

  it('returns server-side Civic Assist analysis and a usable provider failure state', async () => {
    const analysis = await citizenAgent.post('/api/ai/report-assist').send({ description: 'A broken streetlight leaves the pedestrian crossing dark and unsafe after sunset.' })
    expect(analysis.status).toBe(200)
    expect(analysis.body.analysis.suggestedCategory).toBe('Damaged streetlight')
    expect(analysis.body.analysis.suggestedPriority).toBe('Important')

    const failingApp = (await import('../src/app.js')).createApp({
      aiService: { analyzeReport: async () => { const error = new Error('provider failed'); error.code = 'AI_UNAVAILABLE'; throw error } },
    })
    const failingAgent = request.agent(failingApp)
    await failingAgent.post('/api/auth/login').send({ email: 'meera.kulkarni@civicpulse.local', password: 'CivicCity#42' })
    const failure = await failingAgent.post('/api/ai/report-assist').send({ description: 'A broken streetlight leaves the pedestrian crossing dark and unsafe after sunset.' })
    expect(failure.status).toBe(503)
    expect(failure.body.message).toMatch(/provider failed|unavailable/i)
  })

  it('allows an officer, but not a citizen, to update report status', async () => {
    const { User } = await import('../src/models/User.js')
    const { hashPassword } = await import('../src/lib/auth.js')
    const officer = await User.create({ name: 'Ward Services Officer', email: 'officer.api@civicpulse.local', phone: '+919812345680', passwordHash: await hashPassword('WardService#9'), role: 'ward_officer', city: 'Pune', ward: 'Aundh-Baner Ward' })

    const forbidden = await citizenAgent.patch(`/api/reports/${createdReportId}/status`).send({ status: 'Acknowledged', message: 'Acknowledged for review.' })
    expect(forbidden.status).toBe(403)

    const officerAgent = request.agent(app)
    await officerAgent.post('/api/auth/login').send({ email: 'officer.api@civicpulse.local', password: 'WardService#9' })
    const updated = await officerAgent.patch(`/api/reports/${createdReportId}/status`).send({ status: 'Assigned', message: 'Assigned to the road maintenance team.', ward: 'Aundh-Baner Ward', assignedTo: String(officer.id) })
    expect(updated.status).toBe(200)
    expect(updated.body.report.status).toBe('Assigned')
    expect(updated.body.report.assignedTo.name).toBe('Ward Services Officer')
    const scopedReports = await officerAgent.get('/api/reports')
    expect(scopedReports.status).toBe(200)
    expect(scopedReports.body.reports.every((report) => report.ward === 'Aundh-Baner Ward')).toBe(true)
  })

  it('returns field-level details when a persisted report fails validation', async () => {
    const { Report } = await import('../src/models/Report.js')
    const { User } = await import('../src/models/User.js')
    const citizen = await User.findOne({ email: 'meera.kulkarni@civicpulse.local' })
    const inserted = await Report.collection.insertOne({
      reference: 'CP-2026-INVALID', citizen: citizen.id, category: 'Pothole',
      description: 'A persisted report with an incomplete status history.',
      location: { address: 'Aundh Road crossing', city: 'Pune', state: 'Maharashtra', pincode: '411007' },
      status: 'Submitted', photos: [], updates: [{ status: 'Submitted' }],
      createdAt: new Date(), updatedAt: new Date(),
    })
    const officerAgent = request.agent(app)
    await officerAgent.post('/api/auth/login').send({ email: 'officer.api@civicpulse.local', password: 'WardService#9' })

    const response = await officerAgent.patch(`/api/reports/${inserted.insertedId}/status`).send({ status: 'Acknowledged', message: 'Queued for review.' })

    expect(response.status).toBe(400)
    expect(response.body.message).toBe('Please check the supplied information.')
    expect(response.body.errors['updates.0.message']).toBe('Path `message` is required.')
    expect(response.body.errors['updates.0.actorRole']).toBe('Path `actorRole` is required.')
  })

  it('returns citizen dashboard data from owned reports and persists profile settings', async () => {
    const dashboard = await citizenAgent.get('/api/dashboard/citizen')
    expect(dashboard.status).toBe(200)
    expect(dashboard.body.summary.total).toBe(dashboard.body.reports.length)
    expect(dashboard.body.summary.active).toBe(dashboard.body.reports.filter((report) => !['Resolved', 'Closed'].includes(report.status)).length)
    expect(dashboard.body.notifications.some((item) => item.status === 'Assigned')).toBe(true)

    const profile = await citizenAgent.patch('/api/auth/profile').send({
      name: 'Meera Kulkarni', phone: '+919812345678', city: 'Pune',
      settings: { emailStatusUpdates: true, nearbyDigest: true, compactDashboard: true },
    })
    expect(profile.status).toBe(200)
    expect(profile.body.user.settings.compactDashboard).toBe(true)
    expect((await citizenAgent.get('/api/auth/me')).body.user.city).toBe('Pune')
  })

  it('enforces municipal authorization and derives filtered analytics from report data', async () => {
    expect((await citizenAgent.get('/api/dashboard/municipal')).status).toBe(403)
    const { User } = await import('../src/models/User.js')
    const { Report } = await import('../src/models/Report.js')
    const { hashPassword } = await import('../src/lib/auth.js')
    const admin = await User.create({ name: 'City Administrator', email: 'admin.api@civicpulse.local', phone: '+919812345681', passwordHash: await hashPassword('AdminService#9'), role: 'admin', city: 'Pune' })
    const adminAgent = request.agent(app)
    await adminAgent.post('/api/auth/login').send({ email: admin.email, password: 'AdminService#9' })

    const dashboard = await adminAgent.get('/api/dashboard/municipal')
    expect(dashboard.status).toBe(200)
    expect(dashboard.body.analytics.total).toBe(await Report.countDocuments())
    expect(dashboard.body.analytics.byStatus.reduce((sum, item) => sum + item.count, 0)).toBe(dashboard.body.analytics.total)

    const filtered = await adminAgent.get('/api/dashboard/municipal').query({ search: 'Gaikwad', category: 'Pothole', status: 'Assigned', ward: 'Aundh-Baner Ward' })
    expect(filtered.status).toBe(200)
    expect(filtered.body.reports).toHaveLength(1)
    expect(filtered.body.reports[0].id).toBe(createdReportId)
  })

  it('rejects forged photographs and cross-origin writes', async () => {
    const photo = await citizenAgent.post('/api/reports').field('category', 'Pothole')
      .attach('photos', Buffer.from('<script>invalid image</script>'), { filename: 'pothole.png', contentType: 'image/png' })
    expect(photo.status).toBe(400)
    expect(photo.body.message).toMatch(/contents/)
    expect((await citizenAgent.post('/api/auth/logout').set('Origin', 'https://untrusted.invalid')).status).toBe(403)
    expect((await citizenAgent.post('/api/auth/login').set('Content-Type', 'application/json').send('{broken')).status).toBe(400)
  })

  it('blocks ward-filter overrides, cross-ward transfers and self-service jurisdiction changes', async () => {
    const { User } = await import('../src/models/User.js')
    const { Report } = await import('../src/models/Report.js')
    const owner = await User.findOne({ email: 'meera.kulkarni@civicpulse.local' })
    const foreign = await Report.create({ reference: 'CP-2026-PRIVATE', citizen: owner.id, category: 'Pothole', description: 'A damaged road surface needs inspection at the municipal crossing.', ward: 'Other Ward', location: { address: 'Market Road crossing', city: 'Indore', state: 'Madhya Pradesh', pincode: '452010', coordinates: { latitude: 22.75, longitude: 75.89 } } })
    const officer = request.agent(app)
    await officer.post('/api/auth/login').send({ email: 'officer.api@civicpulse.local', password: 'WardService#9' })
    const overridden = await officer.get('/api/dashboard/municipal').query({ ward: 'Other Ward' })
    expect(overridden.status).toBe(200)
    expect(overridden.body.reports).toHaveLength(0)
    expect(overridden.body.filters.wards).not.toContain('Other Ward')
    expect((await officer.get(`/api/reports/${foreign.id}`)).status).toBe(403)
    foreign.ward = 'Aundh-Baner Ward'
    await foreign.save()
    expect((await officer.get(`/api/reports/${foreign.id}`)).status).toBe(403)
    expect((await officer.patch(`/api/reports/${foreign.id}/status`).send({ status: 'Assigned', message: 'Attempt a cross-city update.' })).status).toBe(403)
    const scoped = await officer.get('/api/dashboard/municipal')
    expect(scoped.body.reports.every((report) => report.location.city === 'Pune')).toBe(true)
    expect((await officer.get('/api/reports')).body.reports.every((report) => report.location.city === 'Pune')).toBe(true)
    expect((await officer.patch(`/api/reports/${createdReportId}/status`).send({ status: 'Assigned', ward: 'Other Ward', message: 'Transfer to another municipal area.' })).status).toBe(403)
    const profile = await officer.patch('/api/auth/profile').send({ name: 'Ward Services Officer', phone: '+919812345680', city: 'Indore', settings: { emailStatusUpdates: true, nearbyDigest: true, compactDashboard: false } })
    expect(profile.status).toBe(200)
    expect(profile.body.user.city).toBe('Pune')
  })

  it('seeds the required accounts safely, preserves reports and creates geo indexes', async () => {
    const { seedDevelopmentData } = await import('../src/scripts/seed-data.js')
    const { Report } = await import('../src/models/Report.js')
    const first = await seedDevelopmentData()
    const count = await Report.countDocuments()
    const second = await seedDevelopmentData()
    expect(await Report.countDocuments()).toBe(count)
    expect(await Report.findById(createdReportId)).toBeTruthy()
    expect(first.reports.every((report) => report.geo.coordinates.length === 2)).toBe(true)
    expect(second.users.citizen.id).toBe(first.users.citizen.id)
    for (const email of ['citizen@civicpulse.local', 'citizen2@civicpulse.local', 'admin@civicpulse.local']) {
      expect((await request(app).post('/api/auth/login').send({ email, password: 'CivicPulse@123' })).status).toBe(200)
    }
    const publicSummary = await request(app).get('/api/reports/public-summary')
    expect(publicSummary.body.stats[0].value).toBe(count)
    expect(publicSummary.body.issues[0]).not.toHaveProperty('citizen')
    expect(publicSummary.body.issues[0]).not.toHaveProperty('description')
  })

  it('logs out and invalidates the browser session', async () => {
    expect((await citizenAgent.post('/api/auth/logout')).status).toBe(204)
    const session = await citizenAgent.get('/api/auth/me')
    expect(session.status).toBe(200)
    expect(session.body.user).toBeNull()
  })
})
