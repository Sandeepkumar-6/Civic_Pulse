import mongoose from 'mongoose'

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 160 },
    phone: { type: String, trim: true, match: /^\+91[6-9]\d{9}$/ },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['citizen', 'ward_officer', 'admin'], default: 'citizen', index: true },
    city: { type: String, trim: true, maxlength: 80 },
    ward: { type: String, trim: true, maxlength: 80 },
    settings: {
      emailStatusUpdates: { type: Boolean, default: true },
      nearbyDigest: { type: Boolean, default: true },
      compactDashboard: { type: Boolean, default: false },
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
)

export const User = mongoose.model('User', userSchema)
