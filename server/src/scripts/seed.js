import { pathToFileURL } from 'node:url'
import { connectDatabase, disconnectDatabase } from '../db.js'
import { seedDevelopmentData } from './seed-data.js'

async function run() {
  if (process.env.NODE_ENV === 'production') throw new Error('Development seeding is disabled in production.')
  await connectDatabase()
  try {
    const result = await seedDevelopmentData({ reset: process.argv.includes('--reset') })
    console.log(`Seeded ${Object.keys(result.users).length} users and ${result.reports.length} civic reports.`)
  } finally {
    await disconnectDatabase()
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run().catch((error) => {
    console.error('Seed failed:', error.message)
    process.exit(1)
  })
}
