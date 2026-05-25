import supabase from '../config/supabase.js'

const getBusinessId = (req) => {
  const id = req.headers['x-business-id']
  if (!id) throw new Error('No active business selected')
  return id
}

// GET /api/customers
export const getCustomers = async (req, res) => {
  try {
    const business_id = getBusinessId(req)

    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('business_id', business_id)
      .order('joined_at', { ascending: false })

    if (error) throw error
    res.json(data)
  } catch (err) {
    console.error('GET CUSTOMERS ERROR:', err)
    res.status(500).json({ error: err.message })
  }
}

// POST /api/customers
export const addCustomer = async (req, res) => {
  try {
    const business_id = getBusinessId(req)
    const { name, phone, email } = req.body

    if (!name) return res.status(400).json({ error: 'Customer name is required' })

    const { data, error } = await supabase
      .from('customers')
      .insert([{ business_id, name, phone, email }])
      .select()
      .single()

    if (error) throw error
    res.status(201).json(data)
  } catch (err) {
    console.error('ADD CUSTOMER ERROR:', err)
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
      .maybeSingle()

    if (error) throw error
    if (!data) return res.status(404).json({ error: 'Customer not found' })
    res.json(data)
  } catch (err) {
    console.error('UPDATE CUSTOMER ERROR:', err)
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
    console.error('DELETE CUSTOMER ERROR:', err)
    res.status(500).json({ error: err.message })
  }
}