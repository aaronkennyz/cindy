import supabase from '../config/supabase.js'

// POST /api/business
export const createBusiness = async (req, res) => {
  const { name, type } = req.body
  const owner_id = req.owner.id

  if (!name || !type) {
    return res.status(400).json({ error: 'Business name and type are required' })
  }

  try {
    const { data, error } = await supabase
      .from('businesses')
      .insert([{ owner_id, name, type }])
      .select()
      .single()

    if (error) throw error
    res.status(201).json(data)
  } catch (err) {
    console.error('CREATE BUSINESS ERROR:', err)
    res.status(500).json({ error: err.message })
  }
}

// GET /api/business
// Returns all businesses for the logged in owner
export const getBusiness = async (req, res) => {
  const owner_id = req.owner.id

  try {
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('owner_id', owner_id)
      .order('created_at', { ascending: true })

    if (error) throw error
    res.json(data)
  } catch (err) {
    console.error('GET BUSINESS ERROR:', err)
    res.status(500).json({ error: err.message })
  }
}

// GET /api/business/:id
// Returns a single business by id (must belong to the logged in owner)
export const getBusinessById = async (req, res) => {
  const { id } = req.params
  const owner_id = req.owner.id

  try {
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', id)
      .eq('owner_id', owner_id)
      .maybeSingle()

    if (error) throw error
    if (!data) return res.status(404).json({ error: 'Business not found' })
    res.json(data)
  } catch (err) {
    console.error('GET BUSINESS BY ID ERROR:', err)
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
      .maybeSingle()

    if (error) throw error
    if (!data) return res.status(404).json({ error: 'Business not found' })
    res.json(data)
  } catch (err) {
    console.error('UPDATE BUSINESS ERROR:', err)
    res.status(500).json({ error: err.message })
  }
}

// DELETE /api/business/:id
export const deleteBusiness = async (req, res) => {
  const { id } = req.params
  const owner_id = req.owner.id

  try {
    const { error } = await supabase
      .from('businesses')
      .delete()
      .eq('id', id)
      .eq('owner_id', owner_id)

    if (error) throw error
    res.json({ message: 'Business deleted' })
  } catch (err) {
    console.error('DELETE BUSINESS ERROR:', err)
    res.status(500).json({ error: err.message })
  }
}