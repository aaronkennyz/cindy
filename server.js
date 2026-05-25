import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

import authRoutes from './routes/auth.js'
import businessRoutes from './routes/business.js'
import customerRoutes from './routes/customers.js'
import planRoutes from './routes/plans.js'
import subscriptionRoutes from './routes/subscriptions.js'
import messageRoutes from './routes/messages.js'

dotenv.config()

const app = express()

app.use(cors({
  origin: [
    'http://localhost:4040',
    'https://your-netlify-url.netlify.app'
  ],
  credentials: true
}))
app.use(express.json())
app.use(express.static('frontend'))

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/business', businessRoutes)
app.use('/api/customers', customerRoutes)
app.use('/api/plans', planRoutes)
app.use('/api/subscriptions', subscriptionRoutes)
app.use('/api/messages', messageRoutes)

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'Cindy is running' }))

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`Cindy running on port ${PORT}`))