import supabase from '../config/supabase.js'

const getBusinessId = (req) => {
  const id = req.headers['x-business-id']
  if (!id) throw new Error('No active business selected')
  return id
}

// GET /api/subscriptions
export const getSubscriptions = async (req, res) => {
  try {
    const business_id = getBusinessId(req)

    // First get all customer IDs belonging to this business
    const { data: customers, error: custError } = await supabase
      .from('customers')
      .select('id')
      .eq('business_id', business_id)

    if (custError) throw custError

    const customerIds = customers.map(c => c.id)

    if (customerIds.length === 0) return res.json([])

    const { data, error } = await supabase
      .from('subscriptions')
      .select(`
        *,
        customers (id, name, phone, email),
        plans (id, name, price, duration_days)
      `)
      .in('customer_id', customerIds)
      .order('end_date', { ascending: true })

    if (error) throw error
    res.json(data)
  } catch (err) {
    console.error('GET SUBSCRIPTIONS ERROR:', err)
    res.status(500).json({ error: err.message })
  }
}
// GET /api/subscriptions/expiring
export const getExpiringSubscriptions = async (req, res) => {
  try {
    const business_id = getBusinessId(req)

    const today = new Date().toISOString().split('T')[0]
    const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const { data: customers, error: custError } = await supabase
      .from('customers')
      .select('id')
      .eq('business_id', business_id)

    if (custError) throw custError

    const customerIds = customers.map(c => c.id)
    if (customerIds.length === 0) return res.json([])

    const { data, error } = await supabase
      .from('subscriptions')
      .select(`
        *,
        customers (id, name, phone, email),
        plans (id, name, price)
      `)
      .in('customer_id', customerIds)
      .gte('end_date', today)
      .lte('end_date', in7Days)

    if (error) throw error
    res.json(data)
  } catch (err) {
    console.error('GET EXPIRING ERROR:', err)
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
    console.error('CREATE SUBSCRIPTION ERROR:', err)
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
      .maybeSingle()

    if (error) throw error
    if (!data) return res.status(404).json({ error: 'Subscription not found' })
    res.json(data)
  } catch (err) {
    console.error('UPDATE SUBSCRIPTION ERROR:', err)
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
    console.error('DELETE SUBSCRIPTION ERROR:', err)
    res.status(500).json({ error: err.message })
  }
}