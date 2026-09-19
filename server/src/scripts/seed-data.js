import { hashPassword } from '../lib/auth.js'
import { Report } from '../models/Report.js'
import { User } from '../models/User.js'

const developmentReports = [
  { reference: 'CP-2026-PUN481', category: 'Pothole', description: 'A deep pothole is obstructing the left lane beside the Aundh Gaon bus stop and becomes difficult to see after rain.', location: { address: 'Aundh Road near Aundh Gaon bus stop', landmark: 'Opposite the public library', city: 'Pune', state: 'Maharashtra', pincode: '411007', coordinates: { latitude: 18.5588, longitude: 73.8075 } }, status: 'In Progress', ward: 'Aundh-Baner Ward', priority: 'Important' },
  { reference: 'CP-2026-PUN512', category: 'Pothole', description: 'A wide pothole beside the Baner Road bus bay is forcing scooters to move abruptly into the centre lane.', location: { address: 'Baner Road near Abhimanshree Society', landmark: 'Beside the PMPML bus bay', city: 'Pune', state: 'Maharashtra', pincode: '411045', coordinates: { latitude: 18.5595, longitude: 73.8038 } }, status: 'Acknowledged', ward: 'Aundh-Baner Ward', priority: 'Important' },
  { reference: 'CP-2026-PUN533', category: 'Blocked drainage', description: 'The stormwater drain is blocked with leaves and silt, causing water to collect across the pedestrian crossing.', location: { address: 'DP Road, Aundh', landmark: 'Near Parihar Chowk', city: 'Pune', state: 'Maharashtra', pincode: '411007', coordinates: { latitude: 18.5612, longitude: 73.8104 } }, status: 'Assigned', ward: 'Aundh-Baner Ward', priority: 'Important' },
  { reference: 'CP-2026-PUN548', category: 'Damaged streetlight', description: 'Two streetlights are not working on the approach to the public garden, leaving the footpath dark after sunset.', location: { address: 'ITI Road, Aundh', landmark: 'Near the public garden gate', city: 'Pune', state: 'Maharashtra', pincode: '411007', coordinates: { latitude: 18.5571, longitude: 73.8142 } }, status: 'Submitted', ward: 'Aundh-Baner Ward', priority: 'Routine' },
  { reference: 'CP-2026-PUN566', category: 'Garbage accumulation', description: 'Uncollected household waste is overflowing from the community bin and narrowing the footpath.', location: { address: 'Balewadi High Street service lane', landmark: 'Near the cycle stand', city: 'Pune', state: 'Maharashtra', pincode: '411045', coordinates: { latitude: 18.5708, longitude: 73.7743 } }, status: 'In Progress', ward: 'Aundh-Baner Ward', priority: 'Routine' },
  { reference: 'CP-2026-IDR174', category: 'Damaged streetlight', description: 'Three consecutive streetlights are not working along the service road, leaving the pedestrian stretch poorly lit after sunset.', location: { address: 'Scheme No. 54 service road, Vijay Nagar', landmark: 'Near Meghdoot Garden gate', city: 'Indore', state: 'Madhya Pradesh', pincode: '452010', coordinates: { latitude: 22.7533, longitude: 75.8937 } }, status: 'Assigned', ward: 'Zone 7', priority: 'Important' },
  { reference: 'CP-2026-MYS839', category: 'Garbage accumulation', description: 'Household waste has accumulated beside the community bin after two missed collections and is obstructing the footpath.', location: { address: 'Double Road, Kuvempunagar', landmark: 'Beside the community hall', city: 'Mysuru', state: 'Karnataka', pincode: '570023', coordinates: { latitude: 12.2958, longitude: 76.6394 } }, status: 'Resolved', ward: 'Ward 59', priority: 'Routine' },
  { reference: 'CP-2026-SUR942', category: 'Water infrastructure', description: 'A pipeline leak is sending clean water across the footpath throughout the day and has made the walking surface slippery.', location: { address: 'LP Savani Road, Adajan', landmark: 'Near the vegetable market entrance', city: 'Surat', state: 'Gujarat', pincode: '395009', coordinates: { latitude: 21.1959, longitude: 72.7933 } }, status: 'In Progress', ward: 'West Zone', priority: 'Urgent' },
  { reference: 'CP-2026-KOC318', category: 'Blocked drainage', description: 'The roadside storm-water drain is blocked with silt and overflows across the junction during moderate rainfall.', location: { address: 'Subhash Chandra Bose Road, Kadavanthra', landmark: 'Near the metro approach road', city: 'Kochi', state: 'Kerala', pincode: '682020' }, status: 'Acknowledged', ward: 'Kadavanthra Division', priority: 'Important' },
  { reference: 'CP-2026-BBI655', category: 'Public sanitation', description: 'The public toilet block requires cleaning and one wash basin has been unusable since the beginning of the week.', location: { address: 'Master Canteen Square', landmark: 'Beside the city bus bay', city: 'Bhubaneswar', state: 'Odisha', pincode: '751001', coordinates: { latitude: 20.2677, longitude: 85.8435 } }, status: 'Submitted', ward: 'Ward 41', priority: 'Routine' },
  { reference: 'CP-2026-JAI727', category: 'Signage issue', description: 'The directional sign for the government hospital is damaged and is no longer readable from the main carriageway.', location: { address: 'Tonk Road near Gandhi Nagar turn', landmark: 'Before the railway underpass', city: 'Jaipur', state: 'Rajasthan', pincode: '302015', coordinates: { latitude: 26.8851, longitude: 75.8063 } }, status: 'Assigned', ward: 'Ward 135', priority: 'Routine' },
  { reference: 'CP-2026-GHY590', category: 'Road damage', description: 'The road edge has broken away near the curve, creating a hazardous drop for two-wheelers during evening traffic.', location: { address: 'RG Baruah Road, Zoo Tiniali', landmark: 'Near the eastern bus shelter', city: 'Guwahati', state: 'Assam', pincode: '781024' }, status: 'Acknowledged', ward: 'Ward 20', priority: 'Urgent' },
]

export async function seedDevelopmentData({ reset = false } = {}) {
  if (process.env.NODE_ENV === 'production') throw new Error('Development seeding is disabled in production.')
  if (reset) {
    await Promise.all([Report.deleteMany({}), User.deleteMany({})])
  }
  const passwordHash = await hashPassword('CivicPulse@123')
  const [citizen, neighbour, officer, admin] = await Promise.all([
    { name: 'Ananya Rao', email: 'citizen@civicpulse.local', phone: '+919876543210', passwordHash, role: 'citizen', city: 'Pune' },
    { name: 'Kavya Deshmukh', email: 'citizen2@civicpulse.local', phone: '+919876543213', passwordHash, role: 'citizen', city: 'Pune' },
    { name: 'Ward Services Officer', email: 'officer@civicpulse.local', phone: '+919876543211', passwordHash, role: 'ward_officer', city: 'Pune', ward: 'Aundh-Baner Ward' },
    { name: 'CivicPulse Administrator', email: 'admin@civicpulse.local', phone: '+919876543212', passwordHash, role: 'admin', city: 'Pune' },
  ].map(async (record) => {
    const existing = await User.findOne({ email: record.email })
    if (existing) { existing.passwordHash = passwordHash; await existing.save(); return existing }
    return User.create(record)
  }))
  const reports = await Promise.all(developmentReports.map(async (report, index) => {
    const existing = await Report.findOne({ reference: report.reference })
    if (existing) return existing
    const createdAt = new Date(Date.now() - (index + 1) * 3 * 60 * 60 * 1000)
    const coordinates = report.location.coordinates ?? (report.location.city === 'Kochi' ? { latitude: 9.9669, longitude: 76.3011 } : { latitude: 26.161, longitude: 91.782 })
    return Report.create({
    ...report,
    location: { ...report.location, coordinates },
    createdAt,
    citizen: ['CP-2026-PUN566', 'CP-2026-PUN512'].includes(report.reference) ? neighbour.id : citizen.id,
    photos: [],
    updates: [
      { status: 'Submitted', message: 'Report received and queued for municipal review.', actorRole: 'system', createdAt },
      ...(report.status === 'Submitted' ? [] : [{ status: report.status, message: `Municipal team updated this report to ${report.status.toLowerCase()}.`, actorRole: 'ward_officer', createdAt: new Date(createdAt.getTime() + 60 * 60 * 1000) }]),
    ],
    assignedTo: report.location.city === 'Pune' ? officer.id : undefined,
  })
  }))
  await Promise.all([User.createIndexes(), Report.createIndexes()])
  return { users: { citizen, neighbour, officer, admin }, reports }
}
