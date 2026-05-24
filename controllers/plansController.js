import supabase from '../config/supabase.js'

const getBusinessId = (req) => {
  const id = req.headers['x-business-id']
  if (!id) throw new Error('No active business selected')
  return id
}

// GET /api/plans
export const getPlans = async (req, res) => {
 const business_id = getBusinessId(req)
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
      .maybeSingle()

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