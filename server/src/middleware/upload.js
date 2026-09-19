import fs from 'node:fs'
import crypto from 'node:crypto'
import multer from 'multer'
import { config } from '../config.js'

fs.mkdirSync(config.uploadDir, { recursive: true })

const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])

const storage = multer.diskStorage({
  destination: config.uploadDir,
  filename: (_req, file, callback) => {
    const extension = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' }[file.mimetype]
    callback(null, `${crypto.randomUUID()}${extension}`)
  },
})

export async function validatePhotoContents(files = []) {
  for (const file of files) {
    const handle = await fs.promises.open(file.path, 'r')
    const bytes = Buffer.alloc(12)
    try { await handle.read(bytes, 0, 12, 0) } finally { await handle.close() }
    const valid = file.mimetype === 'image/png' ? bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))
      : file.mimetype === 'image/jpeg' ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
        : bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP'
    if (!valid) return false
  }
  return true
}

export const uploadPhotos = multer({
  storage,
  limits: { files: 4, fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => callback(allowedTypes.has(file.mimetype) ? null : new Error('Only JPEG, PNG and WebP photographs are accepted.'), allowedTypes.has(file.mimetype)),
})
