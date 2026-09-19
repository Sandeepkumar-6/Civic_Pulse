import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { Router } from 'express'
import { config } from '../config.js'
import { allowRoles, requireAuth } from '../lib/auth.js'
import { duplicateCheckSchema, mapQuerySchema, nearbyQuerySchema, reportSchema, statusSchema, validationError } from '../lib/validation.js'
import { uploadPhotos, validatePhotoContents } from '../middleware/upload.js'
import { Report } from '../models/Report.js'
import { User } from '../models/User.js'
import { findPossibleDuplicates, nearbyReports, reportsInBounds } from '../services/geospatial-service.js'

export const reportRouter = Router()

function referenceNumber() {
  return `CP-${new Date().getFullYear()}-${crypto.randomBytes(6).toString('hex').toUpperCase()}`
}

const MAX_REFERENCE_ATTEMPTS = 5

async function createReportWithUniqueReference(payload) {
  for (let attempt = 0; attempt < MAX_REFERENCE_ATTEMPTS; attempt += 1) {
    try {
      return await Report.create({ ...payload, reference: referenceNumber() })
    } catch (error) {
      const duplicateOnReference = error?.code === 11000
        && ('reference' in (error?.keyValue ?? {}) || String(error?.keyPattern ?? '').includes('reference'))
      if (!duplicateOnReference) throw error
    }
  }
  throw new Error('Could not allocate a unique reference number. Please try again.')
}

function canAccess(user, report) {
  if (user.role === 'citizen') return String(report.citizen?._id ?? report.citizen) === user.id
  if (user.role === 'admin') return true
  return Boolean(user.city && report.location?.city === user.city && (!user.ward || !report.ward || report.ward === user.ward))
}

function serializeReport(report) {
  const value = report.toObject ? report.toObject() : report
  return {
    ...value,
    id: String(value._id),
    citizen: value.citizen && value.citizen._id
      ? { id: String(value.citizen._id), name: value.citizen.name, email: value.citizen.email }
      : String(value.citizen),
    assignedTo: value.assignedTo && value.assignedTo._id
      ? { id: String(value.assignedTo._id), name: value.assignedTo.name, email: value.assignedTo.email }
      : value.assignedTo ? String(value.assignedTo) : undefined,
    photos: value.photos.map((photo) => ({ ...photo, url: `/api/reports/${value._id}/photos/${photo.filename}` })),
  }
}

function serializeMapReport(report) {
  const value = report.toObject ? report.toObject() : report
  return {
    id: String(value._id),
    reference: value.reference,
    category: value.category,
    description: value.description,
    status: value.status,
    priority: value.priority,
    ward: value.ward,
    location: value.location,
    distanceMetres: value.distanceMetres,
    createdAt: value.createdAt,
  }
}

async function removeUploadedFiles(files = []) {
  await Promise.all(files.map((file) => fs.unlink(file.path).catch(() => undefined)))
}

reportRouter.get('/public-summary', async (_req, res, next) => {
  try {
    const [total, resolved, wards, recent] = await Promise.all([
      Report.countDocuments(), Report.countDocuments({ status: { $in: ['Resolved', 'Closed'] } }),
      Report.distinct('ward'), Report.find().sort({ createdAt: -1 }).limit(8).select('reference category status location.city ward createdAt').lean(),
    ])
    res.json({ stats: [{ value: total, label: 'reports received' }, { value: resolved, label: 'reports resolved' }, { value: wards.filter(Boolean).length, label: 'wards represented' }], issues: recent.map((report) => ({ id: report.reference, category: report.category, title: report.category, location: `${report.ward || 'Municipal area'}, ${report.location.city}`, reported: report.createdAt, status: report.status })) })
  } catch (error) { next(error) }
})

reportRouter.use(requireAuth)

reportRouter.get('/map', async (req, res, next) => {
  try {
    const parsed = mapQuerySchema.safeParse(req.query)
    if (!parsed.success) return res.status(400).json(validationError(parsed.error))
    const reports = await reportsInBounds(parsed.data)
    res.json({ reports: reports.map(serializeMapReport), count: reports.length })
  } catch (error) {
    next(error)
  }
})

reportRouter.get('/nearby', async (req, res, next) => {
  try {
    const parsed = nearbyQuerySchema.safeParse(req.query)
    if (!parsed.success) return res.status(400).json(validationError(parsed.error))
    const reports = await nearbyReports(parsed.data)
    res.json({ reports: reports.map(serializeMapReport), radiusMetres: parsed.data.radius })
  } catch (error) {
    next(error)
  }
})

reportRouter.post('/duplicates/check', allowRoles('citizen'), async (req, res, next) => {
  try {
    const parsed = duplicateCheckSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json(validationError(parsed.error))
    const reports = await findPossibleDuplicates(parsed.data)
    res.json({ possibleDuplicates: reports.map(serializeMapReport), warningOnly: true })
  } catch (error) {
    next(error)
  }
})

reportRouter.post('/', allowRoles('citizen'), uploadPhotos.array('photos', 4), async (req, res, next) => {
  try {
    if (!(await validatePhotoContents(req.files))) {
      await removeUploadedFiles(req.files)
      return res.status(400).json({ message: 'Photograph contents must match JPEG, PNG or WebP format.' })
    }
    let location
    try {
      location = JSON.parse(req.body.location ?? '{}')
    } catch {
      await removeUploadedFiles(req.files)
      return res.status(400).json({ message: 'The location information could not be read. Please confirm it again.' })
    }
    const parsed = reportSchema.safeParse({ category: req.body.category, description: req.body.description, location })
    if (!parsed.success) {
      await removeUploadedFiles(req.files)
      return res.status(400).json(validationError(parsed.error))
    }
    const possibleDuplicates = parsed.data.location.coordinates
      ? await findPossibleDuplicates({ category: parsed.data.category, description: parsed.data.description, ...parsed.data.location.coordinates })
      : []
    const photos = (req.files ?? []).map((file) => ({ filename: file.filename, originalName: file.originalname, mimeType: file.mimetype, size: file.size }))
    const report = await createReportWithUniqueReference({
      citizen: req.user.id,
      ...parsed.data,
      photos,
      status: 'Submitted',
      updates: [{ status: 'Submitted', message: 'Report received and queued for municipal review.', actorRole: 'system' }],
    })
    res.status(201).json({ report: serializeReport(report), possibleDuplicates: possibleDuplicates.map(serializeMapReport), warningOnly: true })
  } catch (error) {
    await removeUploadedFiles(req.files)
    next(error)
  }
})

reportRouter.get('/', async (req, res, next) => {
  try {
    const filter = req.user.role === 'citizen'
      ? { citizen: req.user.id }
      : req.user.role === 'ward_officer'
        ? req.user.city ? { 'location.city': req.user.city, ...(req.user.ward ? { ward: req.user.ward } : {}) } : { _id: null }
        : {}
    const reports = await Report.find(filter).sort({ createdAt: -1 }).populate('citizen', 'name email').populate('assignedTo', 'name email').lean()
    res.json({ reports: reports.map(serializeReport) })
  } catch (error) {
    next(error)
  }
})

reportRouter.get('/:id', async (req, res, next) => {
  try {
    const report = await Report.findById(req.params.id).populate('citizen', 'name email').populate('assignedTo', 'name email')
    if (!report) return res.status(404).json({ message: 'Report not found.' })
    if (!canAccess(req.user, report)) return res.status(403).json({ message: 'You do not have permission to view this report.' })
    res.json({ report: serializeReport(report) })
  } catch (error) {
    next(error)
  }
})

reportRouter.get('/:id/photos/:filename', async (req, res, next) => {
  try {
    const report = await Report.findById(req.params.id)
    if (!report) return res.status(404).json({ message: 'Report not found.' })
    if (!canAccess(req.user, report)) return res.status(403).json({ message: 'You do not have permission to view this photograph.' })
    const photo = report.photos.find((item) => item.filename === req.params.filename)
    if (!photo) return res.status(404).json({ message: 'Photograph not found.' })
    res.type(photo.mimeType).sendFile(path.join(config.uploadDir, photo.filename))
  } catch (error) {
    next(error)
  }
})

reportRouter.patch('/:id/status', allowRoles('ward_officer', 'admin'), async (req, res, next) => {
  try {
    const parsed = statusSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json(validationError(parsed.error))
    const report = await Report.findById(req.params.id)
    if (!report) return res.status(404).json({ message: 'Report not found.' })
    if (req.user.role === 'ward_officer') {
      const withinScope = canAccess(req.user, report)
      if (!withinScope) return res.status(403).json({ message: 'This report is outside your municipal area.' })
      if (parsed.data.ward && req.user.ward && parsed.data.ward !== req.user.ward) return res.status(403).json({ message: 'Only an administrator can transfer reports to another ward.' })
    }
    if (Object.hasOwn(parsed.data, 'assignedTo')) {
      if (parsed.data.assignedTo) {
        const assignee = await User.findOne({ _id: parsed.data.assignedTo, role: { $in: ['ward_officer', 'admin'] }, isActive: true })
        if (!assignee) return res.status(400).json({ message: 'Select an active municipal officer.' })
        if (assignee.role === 'ward_officer' && (assignee.city !== report.location.city || (assignee.ward && assignee.ward !== (parsed.data.ward || report.ward)))) return res.status(400).json({ message: 'Select an officer responsible for this city and ward.' })
        report.assignedTo = assignee.id
      } else {
        report.assignedTo = undefined
      }
    }
    report.status = parsed.data.status
    if (parsed.data.ward) report.ward = parsed.data.ward
    report.updates.push({ status: parsed.data.status, message: parsed.data.message, actorRole: req.user.role })
    await report.save()
    await report.populate('citizen', 'name email')
    await report.populate('assignedTo', 'name email')
    res.json({ report: serializeReport(report) })
  } catch (error) {
    next(error)
  }
})
