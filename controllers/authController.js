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
    // Check existing by email
    if (email) {
      const { data: byEmail } = await supabase
        .from('owners')
        .select('id')
        .eq('email', email)
        .maybeSingle()
      if (byEmail) return res.status(409).json({ error: 'Account already exists with this email' })
    }

    // Check existing by phone
    if (phone) {
      const { data: byPhone } = await supabase
        .from('owners')
        .select('id')
        .eq('phone', phone)
        .maybeSingle()
      if (byPhone) return res.status(409).json({ error: 'Account already exists with this phone' })
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
    console.error('REGISTER ERROR:', err)
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

// GET /api/auth/profile
export const getProfile = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('owners')
      .select('id, name, email, phone, created_at')
      .eq('id', req.owner.id)
      .maybeSingle()

    if (error) throw error
    if (!data) return res.status(404).json({ error: 'Owner not found' })
    res.json(data)
  } catch (err) {
    console.error('GET PROFILE ERROR:', err)
    res.status(500).json({ error: err.message })
  }
}

// PUT /api/auth/profile
export const updateProfile = async (req, res) => {
  const { name, email, phone, password } = req.body

  try {
    const updates = {}
    if (name) updates.name = name
    if (email) updates.email = email
    if (phone) updates.phone = phone
    if (password) updates.password_hash = await bcrypt.hash(password, 10)

    const { data, error } = await supabase
      .from('owners')
      .update(updates)
      .eq('id', req.owner.id)
      .select('id, name, email, phone')
      .maybeSingle()

    if (error) throw error
    res.json(data)
  } catch (err) {
    console.error('UPDATE PROFILE ERROR:', err)
    res.status(500).json({ error: err.message })
  }
}