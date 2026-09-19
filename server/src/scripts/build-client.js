import { spawnSync } from 'node:child_process'

// Force the React production runtime even when the local .env uses development.
const result = spawnSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build'], {
  stdio: 'inherit', env: { ...process.env, NODE_ENV: 'production' },
})
process.exit(result.status ?? 1)
