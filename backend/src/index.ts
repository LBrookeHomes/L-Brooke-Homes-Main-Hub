import 'dotenv/config'
import express from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'

import authRoutes from './routes/auth'
import projectRoutes from './routes/projects'
import milestoneRoutes from './routes/milestones'
import decisionRoutes from './routes/decisions'
import workOrderRoutes from './routes/workorders'
import contractorRoutes from './routes/contractors'
import clientRoutes from './routes/clients'
import documentRoutes from './routes/documents'
import notificationRoutes from './routes/notifications'
import publicRoutes from './routes/public'

const app = express()
const PORT = process.env.PORT || 3001

// APP_URL can be a comma-separated list for multi-origin support
const allowedOrigins = (process.env.APP_URL || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (server-to-server, curl, Postman)
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true)
    cb(new Error(`CORS: ${origin} not allowed`))
  },
  credentials: true,
}))
app.use(express.json({ limit: '10mb' }))
app.use(cookieParser())

app.use('/api/auth', authRoutes)
app.use('/api/projects', projectRoutes)
app.use('/api/milestones', milestoneRoutes)
app.use('/api/decisions', decisionRoutes)
app.use('/api/work-orders', workOrderRoutes)
app.use('/api/contractors', contractorRoutes)
app.use('/api/clients', clientRoutes)
app.use('/api/documents', documentRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/public', publicRoutes)

app.get('/health', (_req, res) => res.json({ ok: true }))

app.listen(PORT, () => {
  console.log(`Weebrook API running on port ${PORT}`)
})

export default app
