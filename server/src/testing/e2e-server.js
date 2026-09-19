import { MongoMemoryServer } from 'mongodb-memory-server'

const mongoServer = await MongoMemoryServer.create({ instance: { dbName: 'civicpulse_e2e' } })
process.env.NODE_ENV = 'test'
process.env.MONGODB_URI = mongoServer.getUri()
process.env.JWT_SECRET = 'civicpulse-e2e-secret-with-more-than-thirty-two-characters'
process.env.CLIENT_ORIGIN = 'http://127.0.0.1:4173'
process.env.UPLOAD_DIR = 'test-results/e2e-uploads'
process.env.PORT = '4100'

const [{ createApp }, { connectDatabase, disconnectDatabase }, { seedDevelopmentData }] = await Promise.all([
  import('../app.js'),
  import('../db.js'),
  import('../scripts/seed-data.js'),
])

await connectDatabase()
await seedDevelopmentData()
const server = createApp().listen(4100, () => console.log('CivicPulse E2E API listening on port 4100'))

async function shutdown() {
  await new Promise((resolve) => server.close(resolve))
  await disconnectDatabase()
  await mongoServer.stop()
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
