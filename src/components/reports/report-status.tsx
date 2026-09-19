import { Badge } from '@/components/ui/badge'
import type { ReportStatus } from '@/types'

const statusVariant: Record<ReportStatus, 'default' | 'secondary' | 'success' | 'warning' | 'outline'> = {
  Submitted: 'outline',
  Acknowledged: 'default',
  Assigned: 'secondary',
  'In Progress': 'warning',
  Resolved: 'success',
  Closed: 'success',
}

export function ReportStatusBadge({ status }: { status: ReportStatus }) {
  return <Badge variant={statusVariant[status]}>{status}</Badge>
}
