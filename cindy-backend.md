# Cindy — Full Backend Code

Create each file at the exact path shown. Don't skip any.

---

## `config/supabase.js`

```js
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
)

export default supabase
```

---

## `middleware/auth.js`

```js
import jwt from 'jsonwebtoken'

const protect = (req, res, next) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Not authorized, no token' })
  }

  const token = authHeader.split(' ')[1]

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.owner = decoded
    next()
  } catch (err) {
    return res.status(401).json({ error: 'Token invalid or expired' })
  }
}

export default protect
```

---

## `controllers/authController.js`

```js
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import supabase from '../config/supabase.js'

const generateToken = (owner) => {
  return jwt.sign(
    { id: owner.id, email: owner.email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  )
}

// POST /api/auth/register
export const register = async (req, res) => {
  const { name, email, phone, password } = req.body

  if (!name || !password || (!email && !phone)) {
    return res.status(400).json({ error: 'Name, password, and email or phone are required' })
  }

  try {
    // Check if owner already exists
    const { data: existing } = await supabase
      .from('owners')
      .select('id')
      .or(`email.eq.${email},phone.eq.${phone}`)
      .single()

    if (existing) {
      return res.status(409).json({ error: 'Account already exists with this email or phone' })
    }

    const password_hash = await bcrypt.hash(password, 10)

    const { data: owner, error } = await supabase
      .from('owners')
      .insert([{ name, email, phone, password_hash }])
      .select()
      .single()

    if (error) throw error

    const token = generateToken(owner)
    res.status(201).json({ token, owner: { id: owner.id, name: owner.name, email: owner.email } })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// POST /api/auth/login
export const login = async (req, res) => {
  const { email, phone, password } = req.body

  if (!password || (!email && !phone)) {
    return res.status(400).json({ error: 'Password and email or phone are required' })
  }

  try {
    let query = supabase.from('owners').select('*')
    if (email) query = query.eq('email', email)
    else query = query.eq('phone', phone)

    const { data: owner, error } = await query.single()

    if (error || !owner) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const match = await bcrypt.compare(password, owner.password_hash)
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const token = generateToken(owner)
    res.json({ token, owner: { id: owner.id, name: owner.name, email: owner.email } })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
```

---

## `controllers/businessController.js`

```js
import supabase from '../config/supabase.js'

// POST /api/business
export const createBusiness = async (req, res) => {
  const { name, type } = req.body
  const owner_id = req.owner.id

  if (!name || !type) {
    return res.status(400).json({ error: 'Business name and type are required' })
  }

  try {
    // Owner can only have one business for now
    const { data: existing } = await supabase
      .from('businesses')
      .select('id')
      .eq('owner_id', owner_id)
      .single()

    if (existing) {
      return res.status(409).json({ error: 'Business already exists for this owner' })
    }

    const { data, error } = await supabase
      .from('businesses')
      .insert([{ owner_id, name, type }])
      .select()
      .single()

    if (error) throw error
    res.status(201).json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// GET /api/business
export const getBusiness = async (req, res) => {
  const owner_id = req.owner.id

  try {
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('owner_id', owner_id)
      .single()

    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// PUT /api/business/:id
export const updateBusiness = async (req, res) => {
  const { id } = req.params
  const { name, type } = req.body
  const owner_id = req.owner.id

  try {
    const { data, error } = await supabase
      .from('businesses')
      .update({ name, type })
      .eq('id', id)
      .eq('owner_id', owner_id)
      .select()
      .single()

    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
```

---

## `controllers/customersController.js`

```js
import supabase from '../config/supabase.js'

const getBusinessId = async (owner_id) => {
  const { data } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', owner_id)
    .single()
  return data?.id
}

// GET /api/customers
export const getCustomers = async (req, res) => {
  const business_id = await getBusinessId(req.owner.id)
  if (!business_id) return res.status(404).json({ error: 'Business not found' })

  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('business_id', business_id)
      .order('joined_at', { ascending: false })

    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// POST /api/customers
export const addCustomer = async (req, res) => {
  const business_id = await getBusinessId(req.owner.id)
  if (!business_id) return res.status(404).json({ error: 'Business not found' })

  const { name, phone, email } = req.body
  if (!name) return res.status(400).json({ error: 'Customer name is required' })

  try {
    const { data, error } = await supabase
      .from('customers')
      .insert([{ business_id, name, phone, email }])
      .select()
      .single()

    if (error) throw error
    res.status(201).json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// PUT /api/customers/:id
export const updateCustomer = async (req, res) => {
  const { id } = req.params
  const { name, phone, email, status } = req.body

  try {
    const { data, error } = await supabase
      .from('customers')
      .update({ name, phone, email, status })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// DELETE /api/customers/:id
export const deleteCustomer = async (req, res) => {
  const { id } = req.params

  try {
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id)

    if (error) throw error
    res.json({ message: 'Customer removed' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
```

---

## `controllers/plansController.js`

```js
import supabase from '../config/supabase.js'

const getBusinessId = async (owner_id) => {
  const { data } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', owner_id)
    .single()
  return data?.id
}

// GET /api/plans
export const getPlans = async (req, res) => {
  const business_id = await getBusinessId(req.owner.id)
  if (!business_id) return res.status(404).json({ error: 'Business not found' })

  try {
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .eq('business_id', business_id)

    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// POST /api/plans
export const createPlan = async (req, res) => {
  const business_id = await getBusinessId(req.owner.id)
  if (!business_id) return res.status(404).json({ error: 'Business not found' })

  const { name, price, duration_days } = req.body
  if (!name || !price || !duration_days) {
    return res.status(400).json({ error: 'Name, price, and duration are required' })
  }

  try {
    const { data, error } = await supabase
      .from('plans')
      .insert([{ business_id, name, price, duration_days }])
      .select()
      .single()

    if (error) throw error
    res.status(201).json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// PUT /api/plans/:id
export const updatePlan = async (req, res) => {
  const { id } = req.params
  const { name, price, duration_days } = req.body

  try {
    const { data, error } = await supabase
      .from('plans')
      .update({ name, price, duration_days })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// DELETE /api/plans/:id
export const deletePlan = async (req, res) => {
  const { id } = req.params

  try {
    const { error } = await supabase
      .from('plans')
      .delete()
      .eq('id', id)

    if (error) throw error
    res.json({ message: 'Plan deleted' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
```

---

## `controllers/subscriptionsController.js`

```js
import supabase from '../config/supabase.js'

const getBusinessId = async (owner_id) => {
  const { data } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', owner_id)
    .single()
  return data?.id
}

// GET /api/subscriptions
export const getSubscriptions = async (req, res) => {
  const business_id = await getBusinessId(req.owner.id)
  if (!business_id) return res.status(404).json({ error: 'Business not found' })

  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select(`
        *,
        customers (id, name, phone, email),
        plans (id, name, price, duration_days)
      `)
      .eq('customers.business_id', business_id)
      .order('end_date', { ascending: true })

    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// GET /api/subscriptions/expiring
// Returns subscriptions expiring in the next 7 days
export const getExpiringSubscriptions = async (req, res) => {
  const business_id = await getBusinessId(req.owner.id)
  if (!business_id) return res.status(404).json({ error: 'Business not found' })

  const today = new Date().toISOString().split('T')[0]
  const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select(`
        *,
        customers (id, name, phone, email, business_id),
        plans (id, name, price)
      `)
      .gte('end_date', today)
      .lte('end_date', in7Days)

    if (error) throw error

    // Filter by business
    const filtered = data.filter(s => s.customers?.business_id === business_id)
    res.json(filtered)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// POST /api/subscriptions
export const createSubscription = async (req, res) => {
  const { customer_id, plan_id, start_date } = req.body

  if (!customer_id || !plan_id || !start_date) {
    return res.status(400).json({ error: 'customer_id, plan_id, and start_date are required' })
  }

  try {
    // Get plan to calculate end date
    const { data: plan, error: planError } = await supabase
      .from('plans')
      .select('duration_days')
      .eq('id', plan_id)
      .single()

    if (planError || !plan) return res.status(404).json({ error: 'Plan not found' })

    const start = new Date(start_date)
    const end = new Date(start)
    end.setDate(end.getDate() + plan.duration_days)
    const end_date = end.toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('subscriptions')
      .insert([{ customer_id, plan_id, start_date, end_date, payment_status: 'paid' }])
      .select()
      .single()

    if (error) throw error
    res.status(201).json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// PUT /api/subscriptions/:id
export const updateSubscription = async (req, res) => {
  const { id } = req.params
  const { payment_status, end_date } = req.body

  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .update({ payment_status, end_date })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// DELETE /api/subscriptions/:id
export const deleteSubscription = async (req, res) => {
  const { id } = req.params

  try {
    const { error } = await supabase
      .from('subscriptions')
      .delete()
      .eq('id', id)

    if (error) throw error
    res.json({ message: 'Subscription removed' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
```

---

## `controllers/messagesController.js`

```js
import supabase from '../config/supabase.js'

const getBusinessId = async (owner_id) => {
  const { data } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', owner_id)
    .single()
  return data?.id
}

// GET /api/messages
export const getMessages = async (req, res) => {
  const business_id = await getBusinessId(req.owner.id)
  if (!business_id) return res.status(404).json({ error: 'Business not found' })

  try {
    const { data, error } = await supabase
      .from('messages')
      .select(`*, customers (name, phone)`)
      .eq('business_id', business_id)
      .order('sent_at', { ascending: false })

    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// POST /api/messages
// Logs a message that was sent via WhatsApp
export const logMessage = async (req, res) => {
  const business_id = await getBusinessId(req.owner.id)
  if (!business_id) return res.status(404).json({ error: 'Business not found' })

  const { customer_id, message_body } = req.body
  if (!customer_id || !message_body) {
    return res.status(400).json({ error: 'customer_id and message_body are required' })
  }

  try {
    const { data, error } = await supabase
      .from('messages')
      .insert([{ business_id, customer_id, message_body }])
      .select()
      .single()

    if (error) throw error
    res.status(201).json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
```

---

## `routes/auth.js`

```js
import express from 'express'
import { register, login } from '../controllers/authController.js'

const router = express.Router()

router.post('/register', register)
router.post('/login', login)

export default router
```

---

## `routes/business.js`

```js
import express from 'express'
import { createBusiness, getBusiness, updateBusiness } from '../controllers/businessController.js'
import protect from '../middleware/auth.js'

const router = express.Router()

router.post('/', protect, createBusiness)
router.get('/', protect, getBusiness)
router.put('/:id', protect, updateBusiness)

export default router
```

---

## `routes/customers.js`

```js
import express from 'express'
import { getCustomers, addCustomer, updateCustomer, deleteCustomer } from '../controllers/customersController.js'
import protect from '../middleware/auth.js'

const router = express.Router()

router.get('/', protect, getCustomers)
router.post('/', protect, addCustomer)
router.put('/:id', protect, updateCustomer)
router.delete('/:id', protect, deleteCustomer)

export default router
```

---

## `routes/plans.js`

```js
import express from 'express'
import { getPlans, createPlan, updatePlan, deletePlan } from '../controllers/plansController.js'
import protect from '../middleware/auth.js'

const router = express.Router()

router.get('/', protect, getPlans)
router.post('/', protect, createPlan)
router.put('/:id', protect, updatePlan)
router.delete('/:id', protect, deletePlan)

export default router
```

---

## `routes/subscriptions.js`

```js
import express from 'express'
import {
  getSubscriptions,
  getExpiringSubscriptions,
  createSubscription,
  updateSubscription,
  deleteSubscription
} from '../controllers/subscriptionsController.js'
import protect from '../middleware/auth.js'

const router = express.Router()

router.get('/expiring', protect, getExpiringSubscriptions)
router.get('/', protect, getSubscriptions)
router.post('/', protect, createSubscription)
router.put('/:id', protect, updateSubscription)
router.delete('/:id', protect, deleteSubscription)

export default router
```

---

## `routes/messages.js`

```js
import express from 'express'
import { getMessages, logMessage } from '../controllers/messagesController.js'
import protect from '../middleware/auth.js'

const router = express.Router()

router.get('/', protect, getMessages)
router.post('/', protect, logMessage)

export default router
```

---

## `server.js`

```js
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

app.use(cors())
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
```

---

## `package.json` — update yours to match

```json
{
  "name": "cindy",
  "version": "1.0.0",
  "type": "module",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.0.0",
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "dotenv": "^16.0.0",
    "express": "^4.18.0",
    "jsonwebtoken": "^9.0.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.0"
  }
}
```

---

## Complete API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/auth/register | No | Create owner account |
| POST | /api/auth/login | No | Login, get token |
| GET | /api/business | Yes | Get owner's business |
| POST | /api/business | Yes | Create business |
| PUT | /api/business/:id | Yes | Update business |
| GET | /api/customers | Yes | Get all customers |
| POST | /api/customers | Yes | Add customer |
| PUT | /api/customers/:id | Yes | Update customer |
| DELETE | /api/customers/:id | Yes | Remove customer |
| GET | /api/plans | Yes | Get all plans |
| POST | /api/plans | Yes | Create plan |
| PUT | /api/plans/:id | Yes | Update plan |
| DELETE | /api/plans/:id | Yes | Delete plan |
| GET | /api/subscriptions | Yes | Get all subscriptions |
| GET | /api/subscriptions/expiring | Yes | Expiring in 7 days |
| POST | /api/subscriptions | Yes | Assign plan to customer |
| PUT | /api/subscriptions/:id | Yes | Update subscription |
| DELETE | /api/subscriptions/:id | Yes | Remove subscription |
| GET | /api/messages | Yes | Get message log |
| POST | /api/messages | Yes | Log a sent message |
