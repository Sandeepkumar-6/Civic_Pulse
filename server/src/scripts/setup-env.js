import fs from 'node:fs'
import path from 'node:path'

const rootDir = process.cwd()
const envPath = path.join(rootDir, '.env')
const envExamplePath = path.join(rootDir, '.env.example')

if (fs.existsSync(envPath)) {
  console.log('Using existing .env file.')
  process.exit(0)
}

if (!fs.existsSync(envExamplePath)) {
  console.error('Missing .env.example template. Please restore it before running local setup.')
  process.exit(1)
}

fs.copyFileSync(envExamplePath, envPath)
console.log('Created .env from .env.example for local development.')
