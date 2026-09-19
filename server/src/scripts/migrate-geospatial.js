import { connectDatabase, disconnectDatabase } from '../db.js'
import { Report } from '../models/Report.js'

await connectDatabase()
const reports = await Report.find({ geo: { $exists: false }, 'location.coordinates.latitude': { $exists: true }, 'location.coordinates.longitude': { $exists: true } })
for (const report of reports) {
  report.geo = {
    type: 'Point',
    coordinates: [report.location.coordinates.longitude, report.location.coordinates.latitude],
  }
  await report.save()
}
console.log(`Geospatial points created for ${reports.length} report(s).`)
await Report.syncIndexes()
await disconnectDatabase()
