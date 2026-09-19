import mongoose from 'mongoose'
import { config } from './config.js'

export async function connectDatabase(uri = config.mongoUri) {
  mongoose.set('strictQuery', true)
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 })
}

export async function disconnectDatabase() {
  await mongoose.disconnect()
}
