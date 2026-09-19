import mongoose from 'mongoose'

export const REPORT_CATEGORIES = [
  'Pothole',
  'Garbage accumulation',
  'Damaged streetlight',
  'Blocked drainage',
  'Road damage',
  'Water infrastructure',
  'Public sanitation',
  'Signage issue',
]

export const REPORT_STATUSES = ['Submitted', 'Acknowledged', 'Assigned', 'In Progress', 'Resolved', 'Closed']

const photoSchema = new mongoose.Schema(
  {
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
  },
  { _id: false },
)

const updateSchema = new mongoose.Schema(
  {
    status: { type: String, enum: REPORT_STATUSES, required: true },
    message: { type: String, required: true, maxlength: 500 },
    actorRole: { type: String, enum: ['citizen', 'ward_officer', 'admin', 'system'], required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true },
)

const reportSchema = new mongoose.Schema(
  {
    reference: { type: String, required: true, unique: true, index: true },
    citizen: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    category: { type: String, enum: REPORT_CATEGORIES, required: true, index: true },
    description: { type: String, required: true, trim: true, minlength: 20, maxlength: 2000 },
    photos: { type: [photoSchema], validate: [(value) => value.length <= 4, 'A maximum of four photographs is allowed.'] },
    location: {
      address: { type: String, required: true, trim: true, maxlength: 220 },
      landmark: { type: String, trim: true, maxlength: 120 },
      city: { type: String, required: true, trim: true, maxlength: 80, index: true },
      state: { type: String, required: true, trim: true, maxlength: 80 },
      pincode: { type: String, required: true, match: /^[1-9]\d{5}$/ },
      coordinates: {
        latitude: { type: Number, min: -90, max: 90 },
        longitude: { type: Number, min: -180, max: 180 },
      },
    },
    geo: {
      type: { type: String, enum: ['Point'] },
      coordinates: {
        type: [Number],
        validate: {
          validator: (value) => !value?.length || (value.length === 2 && value[0] >= -180 && value[0] <= 180 && value[1] >= -90 && value[1] <= 90),
          message: 'Geospatial coordinates must contain longitude and latitude.',
        },
      },
    },
    status: { type: String, enum: REPORT_STATUSES, default: 'Submitted', index: true },
    priority: { type: String, enum: ['Routine', 'Important', 'Urgent'], default: 'Routine' },
    ward: { type: String, trim: true, maxlength: 80 },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    updates: { type: [updateSchema], default: [] },
  },
  { timestamps: true },
)

reportSchema.index({ citizen: 1, createdAt: -1 })
reportSchema.index({ geo: '2dsphere' })
reportSchema.index({ category: 1, status: 1, createdAt: -1 })

reportSchema.pre('validate', function syncGeoPoint() {
  const coordinates = this.location?.coordinates
  if (coordinates?.latitude !== undefined && coordinates?.longitude !== undefined) {
    this.geo = { type: 'Point', coordinates: [coordinates.longitude, coordinates.latitude] }
  }
})

export const Report = mongoose.model('Report', reportSchema)
