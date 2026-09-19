export type UserRole = 'citizen' | 'ward_officer' | 'admin'

export type User = {
  id: string
  name: string
  email: string
  phone?: string
  role: UserRole
  city?: string
  ward?: string
  settings?: {
    emailStatusUpdates: boolean
    nearbyDigest: boolean
    compactDashboard: boolean
  }
}

export type ReportStatus = 'Submitted' | 'Acknowledged' | 'Assigned' | 'In Progress' | 'Resolved' | 'Closed'

export type CivicReport = {
  id: string
  reference: string
  category: string
  description: string
  status: ReportStatus
  priority: 'Routine' | 'Important' | 'Urgent'
  ward?: string
  citizen: string | { id: string; name: string; email: string }
  assignedTo?: string | { id: string; name: string; email: string }
  location: {
    address: string
    landmark?: string
    city: string
    state: string
    pincode: string
    coordinates?: { latitude: number; longitude: number }
  }
  photos: Array<{ filename: string; originalName: string; mimeType: string; size: number; url: string }>
  updates: Array<{ _id: string; status: ReportStatus; message: string; actorRole: string; createdAt: string }>
  createdAt: string
  updatedAt: string
}

export type CitizenDashboard = {
  summary: { total: number; active: number; resolved: number; awaitingAction: number }
  reports: CivicReport[]
  recentReports: CivicReport[]
  notifications: Array<{ id: string; reportId: string; reference: string; category: string; status: ReportStatus; message: string; createdAt: string }>
  nearby: MapReport[]
}

export type MunicipalDashboard = {
  reports: CivicReport[]
  analytics: {
    total: number; active: number; resolved: number; resolutionRate: number; urgent: number
    byStatus: Array<{ label: string; count: number }>
    byCategory: Array<{ label: string; count: number }>
    byWard: Array<{ label: string; count: number }>
  }
  filters: { categories: string[]; statuses: string[]; wards: string[] }
  assignees: User[]
  scope: string
}

export type MapReport = Pick<CivicReport, 'id' | 'reference' | 'category' | 'description' | 'status' | 'priority' | 'ward' | 'location' | 'createdAt'> & {
  distanceMetres?: number
}

export type AiReportAnalysis = {
  available: boolean
  provider: string
  suggestedCategory: string | null
  confidence: number
  suggestedPriority: 'Routine' | 'Important' | 'Urgent'
  summary: string
  guidance: string
}
