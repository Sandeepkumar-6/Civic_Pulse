import { createApp } from './app.js'
import { config } from './config.js'
import { connectDatabase, disconnectDatabase } from './db.js'

async function start() {
  await connectDatabase()
  const server = createApp().listen(config.port, () => console.log(`CivicPulse API listening on port ${config.port}`))
  const shutdown = async () => {
    server.close(async () => {
      await disconnectDatabase()
      process.exit(0)
    })
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

start().catch((error) => {
  console.error('Unable to start CivicPulse API:', error.message)
  process.exit(1)
})
