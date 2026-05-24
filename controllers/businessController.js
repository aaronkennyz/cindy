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