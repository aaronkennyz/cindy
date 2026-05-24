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