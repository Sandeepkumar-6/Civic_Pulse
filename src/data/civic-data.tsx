import {
  CircleAlert,
  Droplets,
  Lightbulb,
  MapPinned,
  ShieldCheck,
  Sparkles,
  Trash2,
  TreePine,
  Users,
  Wrench,
  Zap,
} from 'lucide-react'


export const issueCategories = [
  { name: 'Roads & potholes', description: 'Damaged surfaces, open manholes and unsafe footpaths', icon: Wrench, tone: 'bg-orange-100 text-orange-800 dark:bg-orange-400/15 dark:text-orange-200' },
  { name: 'Waste & sanitation', description: 'Missed collection, dumping spots and public cleanliness', icon: Trash2, tone: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-200' },
  { name: 'Water supply', description: 'Leakages, low pressure and irregular neighbourhood supply', icon: Droplets, tone: 'bg-sky-100 text-sky-800 dark:bg-sky-400/15 dark:text-sky-200' },
  { name: 'Street lighting', description: 'Non-working lights and poorly lit public spaces', icon: Lightbulb, tone: 'bg-amber-100 text-amber-900 dark:bg-amber-400/15 dark:text-amber-100' },
  { name: 'Parks & trees', description: 'Park upkeep, fallen branches and damaged green spaces', icon: TreePine, tone: 'bg-lime-100 text-lime-900 dark:bg-lime-400/15 dark:text-lime-100' },
  { name: 'Public safety', description: 'Hazards needing prompt municipal attention', icon: ShieldCheck, tone: 'bg-rose-100 text-rose-800 dark:bg-rose-400/15 dark:text-rose-200' },
]

export type IssueStatus = 'Submitted' | 'Acknowledged' | 'Assigned' | 'In Progress' | 'Resolved' | 'Closed'

export const features = [
  { title: 'Pinpoint the location', description: 'Add a landmark, ward or map pin so the right field team can find the issue quickly.', icon: MapPinned },
  { title: 'Follow every update', description: 'See acknowledgement, assignment and resolution updates in one clear timeline.', icon: Zap },
  { title: 'Built around trust', description: 'Transparent status labels and reference numbers keep every report accountable.', icon: ShieldCheck },
]

export const workflow = [
  { step: '01', title: 'Report what you see', description: 'Choose a category, describe the issue and add its exact location.', icon: CircleAlert },
  { step: '02', title: 'The right team responds', description: 'Your report is routed to the relevant municipal ward and service team.', icon: Users },
  { step: '03', title: 'Track it to resolution', description: 'Receive clear progress updates and confirm when the work is complete.', icon: Sparkles },
]

export const reportCategories = issueCategories.map((category) => category.name)
