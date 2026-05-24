import supabase from '../config/supabase.js'

const getBusinessId = (req) => {
  const id = req.headers['x-business-id']
  if (!id) throw new Error('No active business selected')
  return id
}

// GET /api/customers
export const getCustomers = async (req, res) => {
  const business_id = getBusinessId(req)
  if (!business_id) return res.status(404).json({ error: 'Business not found' })

  try {
    const { data, error } = await supabase
  .from('customers')
  .update({ name, phone, email, status })
  .eq('id', id)
  .select()
  .maybeSingle()

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