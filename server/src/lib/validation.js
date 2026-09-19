import { z } from 'zod'
import { REPORT_CATEGORIES, REPORT_STATUSES } from '../models/Report.js'

const indianPhone = /^\+91[6-9]\d{9}$/
const password = z.string().min(8, 'Use at least 8 characters.').max(72).regex(/[a-z]/, 'Add a lowercase letter.').regex(/[A-Z]/, 'Add an uppercase letter.').regex(/\d/, 'Add a number.')

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name.').max(80),
  email: z.email('Enter a valid email address.').max(160).transform((value) => value.toLowerCase()),
  phone: z.string().trim().regex(indianPhone, 'Use the format +91 followed by your 10-digit mobile number.'),
  password,
})

export const loginSchema = z.object({ email: z.email().transform((value) => value.toLowerCase()), password: z.string().min(1) })

export const profileSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name.').max(80),
  phone: z.string().trim().regex(indianPhone, 'Use the format +91 followed by your 10-digit mobile number.'),
  city: z.string().trim().min(2, 'Enter your city.').max(80),
  settings: z.object({
    emailStatusUpdates: z.boolean(),
    nearbyDigest: z.boolean(),
    compactDashboard: z.boolean(),
  }),
})

export const reportSchema = z.object({
  category: z.enum(REPORT_CATEGORIES),
  description: z.string().trim().min(20, 'Describe the issue in at least 20 characters.').max(2000),
  location: z.object({
    address: z.string().trim().min(8, 'Enter a complete street or area address.').max(220),
    landmark: z.string().trim().max(120).optional().default(''),
    city: z.string().trim().min(2, 'Enter the city.').max(80),
    state: z.string().trim().min(2, 'Enter the state.').max(80),
    pincode: z.string().regex(/^[1-9]\d{5}$/, 'Enter a valid 6-digit PIN code.'),
    coordinates: z.object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) }).optional(),
  }),
})

export const statusSchema = z.object({
  status: z.enum(REPORT_STATUSES),
  message: z.string().trim().min(8).max(500),
  ward: z.string().trim().max(80).optional(),
  assignedTo: z.string().trim().regex(/^[a-f\d]{24}$/i, 'Select a valid municipal officer.').optional().or(z.literal('')),
})

export const managementQuerySchema = z.object({
  search: z.string().trim().max(120).optional().default(''),
  category: z.string().trim().max(80).optional().default(''),
  status: z.string().trim().max(40).optional().default(''),
  ward: z.string().trim().max(80).optional().default(''),
})

const latitude = z.coerce.number().min(-90).max(90)
const longitude = z.coerce.number().min(-180).max(180)

export const nearbyQuerySchema = z.object({
  latitude,
  longitude,
  radius: z.coerce.number().min(100).max(50000).default(5000),
  category: z.string().optional(),
  status: z.string().optional(),
})

export const mapQuerySchema = z.object({
  west: longitude,
  south: latitude,
  east: longitude,
  north: latitude,
  category: z.string().optional(),
  status: z.string().optional(),
})

export const duplicateCheckSchema = z.object({
  category: z.enum(REPORT_CATEGORIES),
  description: z.string().trim().min(20).max(2000),
  latitude,
  longitude,
  radius: z.coerce.number().min(25).max(1000).default(200),
  hours: z.coerce.number().min(1).max(720).default(72),
})

export const aiAnalysisSchema = z.object({ description: z.string().trim().min(20).max(2000) })

export function validationError(error) {
  return {
    message: 'Please correct the highlighted information.',
    errors: error.issues.reduce((result, issue) => {
      result[issue.path.join('.')] = issue.message
      return result
    }, {}),
  }
}
