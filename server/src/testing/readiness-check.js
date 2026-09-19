import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { once } from 'node:events'
import { setTimeout as delay } from 'node:timers/promises'
import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'

// Always isolated: this check never uses the owner's configured database.
const mongo = await MongoMemoryServer.create({ instance: { dbName: 'civicpulse_readiness' } })
const environment = {
  ...process.env, MONGODB_URI: mongo.getUri(), NODE_ENV: 'development',
  JWT_SECRET: randomBytes(48).toString('hex'), CLIENT_ORIGIN: 'http://127.0.0.1:4101',
  PORT: '4101', COOKIE_SAME_SITE: 'lax', TRUST_PROXY: '0',
  UPLOAD_DIR: 'test-results/readiness-uploads',
}
let server
async function seed(nodeEnv = 'development') {
  const child = spawn(process.execPath, ['server/src/scripts/seed.js'], { env: { ...environment, NODE_ENV: nodeEnv }, stdio: 'pipe', windowsHide: true })
  let output = ''
  child.stdout.on('data', (chunk) => { output += chunk })
  child.stderr.on('data', (chunk) => { output += chunk })
  const [code] = await once(child, 'exit')
  assert.equal(code, nodeEnv === 'production' ? 1 : 0, output)
}
async function stopServer() {
  if (!server || server.exitCode !== null || server.signalCode !== null) return
  const stopped = once(server, 'exit')
  server.kill()
  await stopped
}
async function startServer(nodeEnv) {
  server = spawn(process.execPath, ['server/src/server.js'], { env: { ...environment, NODE_ENV: nodeEnv }, stdio: 'pipe', windowsHide: true })
  let errors = ''
  server.stderr.on('data', (chunk) => { errors += chunk })
  server.stdout.resume()
  for (let attempt = 0; attempt < 60; attempt++) {
    assert.equal(server.exitCode, null, errors)
    try {
      const response = await fetch('http://127.0.0.1:4101/api/health')
      if (response.ok) {
        assert.equal((await response.json()).database, 'connected')
        return
      }
    } catch { /* Startup may still be connecting. */ }
    await delay(250)
  }
  throw new Error(`Server startup timed out: ${errors}`)
}
try {
  await seed()
  await mongoose.connect(environment.MONGODB_URI)
  const database = mongoose.connection.db
  const count = await database.collection('reports').countDocuments()
  assert.ok(count >= 12)
  await seed()
  assert.equal(await database.collection('reports').countDocuments(), count)
  await seed('production')
  assert.equal(await database.collection('reports').countDocuments(), count)
  const indexes = await database.collection('reports').indexes()
  assert.ok(indexes.some((index) => index.key.geo === '2dsphere'))
  console.log('PASS: actual seed command, repeat-safe records, production seed guard and 2dsphere index')
  for (const nodeEnv of ['development', 'production']) {
    await startServer(nodeEnv)
    for (const email of ['citizen@civicpulse.local', 'citizen2@civicpulse.local', 'admin@civicpulse.local']) {
      const response = await fetch('http://127.0.0.1:4101/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Origin: environment.CLIENT_ORIGIN },
        body: JSON.stringify({ email, password: 'CivicPulse@123' }),
      })
      assert.equal(response.status, 200)
      const cookie = response.headers.get('set-cookie')
      assert.match(cookie, /HttpOnly/i)
      if (nodeEnv === 'production') assert.match(cookie, /; Secure/i)
      const headers = { Cookie: cookie.split(';')[0] }
      assert.equal((await fetch('http://127.0.0.1:4101/api/auth/me', { headers })).status, 200)
      const reports = await fetch('http://127.0.0.1:4101/api/reports', { headers })
      assert.equal(reports.status, 200)
      assert.ok((await reports.json()).reports.length > 0)
    }
    console.log(`PASS: ${nodeEnv} server entry point, MongoDB health and all required account sessions`)
    await stopServer()
  }
} finally {
  await stopServer()
  await mongoose.disconnect()
  await mongo.stop()
}
