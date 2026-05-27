import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import rateLimit from 'express-rate-limit'

import authRoutes from './routes/auth.js'
import businessRoutes from './routes/business.js'
import customerRoutes from './routes/customers.js'
import planRoutes from './routes/plans.js'
import subscriptionRoutes from './routes/subscriptions.js'
import messageRoutes from './routes/messages.js'

dotenv.config()

const app = express()

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
})

app.use(cors({
  origin: [
    'http://localhost:4040',
    'https://cindycrm.vercel.app'
    
  ],
  credentials: true
}))
app.use(express.json())
app.use('/api/', limiter)
app.use(express.static('frontend'))

app.use('/api/auth', authRoutes)
app.use('/api/business', businessRoutes)
app.use('/api/customers', customerRoutes)
app.use('/api/plans', planRoutes)
app.use('/api/subscriptions', subscriptionRoutes)
app.use('/api/messages', messageRoutes)

app.get('/api/health', (req, res) => res.json({ status: 'Cindy is running' }))

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`Cindy running on port ${PORT}`))