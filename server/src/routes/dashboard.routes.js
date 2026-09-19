import { Router } from 'express'
import mongoose from 'mongoose'
import { allowRoles, requireAuth } from '../lib/auth.js'
import { managementQuerySchema, validationError } from '../lib/validation.js'
import { Report, REPORT_CATEGORIES, REPORT_STATUSES } from '../models/Report.js'
import { User } from '../models/User.js'

export const dashboardRouter = Router()

dashboardRouter.use(requireAuth)

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function publicReport(report) {
  const value = report.toObject ? report.toObject() : report
  return {
    ...value,
    id: String(value._id),
    citizen: value.citizen?._id
      ? { id: String(value.citizen._id), name: value.citizen.name, email: value.citizen.email }
      : String(value.citizen),
    assignedTo: value.assignedTo?._id
      ? { id: String(value.assignedTo._id), name: value.assignedTo.name, email: value.assignedTo.email }
      : value.assignedTo ? String(value.assignedTo) : undefined,
    photos: (value.photos ?? []).map((photo) => ({ ...photo, url: `/api/reports/${value._id}/photos/${photo.filename}` })),
  }
}

function mapReport(report) {
  return {
    id: String(report._id), reference: report.reference, category: report.category,
    description: report.description, status: report.status, priority: report.priority,
    ward: report.ward, location: report.location, distanceMetres: report.distanceMetres,
    createdAt: report.createdAt,
  }
}

dashboardRouter.get('/citizen', allowRoles('citizen'), async (req, res, next) => {
  try {
    const citizen = new mongoose.Types.ObjectId(req.user.id)
    const [reports, statusCounts] = await Promise.all([
      Report.find({ citizen }).sort({ createdAt: -1 }).populate('citizen', 'name email').populate('assignedTo', 'name email').lean(),
      Report.aggregate([{ $match: { citizen } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    ])
    const countsByStatus = Object.fromEntries(statusCounts.map((item) => [item._id, item.count]))
    const notifications = req.user.settings?.emailStatusUpdates === false ? [] : reports
      .flatMap((report) => report.updates.map((update) => ({
        id: String(update._id), reportId: String(report._id), reference: report.reference,
        category: report.category, status: update.status, message: update.message, createdAt: update.createdAt,
      })))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 8)

    let nearby = []
    const coordinates = reports.find((report) => report.geo?.coordinates?.length === 2)?.geo?.coordinates
    if (coordinates && req.user.settings?.nearbyDigest !== false) {
      nearby = await Report.aggregate([
        { $geoNear: { key: 'geo', near: { type: 'Point', coordinates }, distanceField: 'distanceMetres', maxDistance: 5000, spherical: true, query: { citizen: { $ne: citizen }, status: { $nin: ['Resolved', 'Closed'] } } } },
        { $limit: 6 },
      ])
    }

    res.json({
      summary: {
        total: reports.length,
        active: reports.filter((report) => !['Resolved', 'Closed'].includes(report.status)).length,
        resolved: (countsByStatus.Resolved ?? 0) + (countsByStatus.Closed ?? 0),
        awaitingAction: (countsByStatus.Submitted ?? 0) + (countsByStatus.Acknowledged ?? 0),
      },
      reports: reports.map(publicReport),
      recentReports: reports.slice(0, 4).map(publicReport),
      notifications,
      nearby: nearby.map(mapReport),
    })
  } catch (error) {
    next(error)
  }
})

dashboardRouter.get('/municipal', allowRoles('ward_officer', 'admin'), async (req, res, next) => {
  try {
    const parsed = managementQuerySchema.safeParse(req.query)
    if (!parsed.success) return res.status(400).json(validationError(parsed.error))
    const scope = req.user.role === 'ward_officer'
      ? req.user.city ? { 'location.city': req.user.city, ...(req.user.ward ? { ward: req.user.ward } : {}) } : { _id: null }
      : {}
    const filter = { $and: [scope] }
    if (parsed.data.category && REPORT_CATEGORIES.includes(parsed.data.category)) filter.category = parsed.data.category
    if (parsed.data.status && REPORT_STATUSES.includes(parsed.data.status)) filter.status = parsed.data.status
    if (parsed.data.ward) filter.ward = parsed.data.ward
    if (parsed.data.search) {
      const pattern = new RegExp(escapeRegex(parsed.data.search), 'i')
      filter.$or = [{ reference: pattern }, { description: pattern }, { 'location.address': pattern }, { 'location.city': pattern }]
    }

    const assigneeScope = req.user.role === 'ward_officer'
      ? { city: req.user.city, ...(req.user.ward ? { ward: req.user.ward } : {}) }
      : {}
    const [reports, statusCounts, categoryCounts, wardCounts, assignees] = await Promise.all([
      Report.find(filter).sort({ updatedAt: -1 }).limit(200).populate('citizen', 'name email').populate('assignedTo', 'name email').lean(),
      Report.aggregate([{ $match: scope }, { $group: { _id: '$status', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      Report.aggregate([{ $match: scope }, { $group: { _id: '$category', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      Report.aggregate([{ $match: { $and: [scope, { ward: { $type: 'string', $ne: '' } }] } }, { $group: { _id: '$ward', count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
      User.find({ role: { $in: ['ward_officer', 'admin'] }, isActive: true, ...assigneeScope }).select('name email role city ward').sort({ name: 1 }).lean(),
    ])
    const total = statusCounts.reduce((sum, item) => sum + item.count, 0)
    const resolved = statusCounts.filter((item) => ['Resolved', 'Closed'].includes(item._id)).reduce((sum, item) => sum + item.count, 0)
    const urgent = await Report.countDocuments({ ...scope, priority: 'Urgent', status: { $nin: ['Resolved', 'Closed'] } })

    res.json({
      reports: reports.map(publicReport),
      analytics: {
        total,
        active: total - resolved,
        resolved,
        resolutionRate: total ? Math.round((resolved / total) * 100) : 0,
        urgent,
        byStatus: statusCounts.map((item) => ({ label: item._id, count: item.count })),
        byCategory: categoryCounts.map((item) => ({ label: item._id, count: item.count })),
        byWard: wardCounts.map((item) => ({ label: item._id, count: item.count })),
      },
      filters: { categories: REPORT_CATEGORIES, statuses: REPORT_STATUSES, wards: wardCounts.map((item) => item._id) },
      assignees: assignees.map((user) => ({ id: String(user._id), name: user.name, email: user.email, role: user.role, city: user.city, ward: user.ward })),
      scope: req.user.role === 'admin' ? 'All municipal areas' : req.user.ward || req.user.city,
    })
  } catch (error) {
    next(error)
  }
})
