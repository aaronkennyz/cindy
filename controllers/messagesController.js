import supabase from '../config/supabase.js'
const getBusinessId = (req) => {
  const id = req.headers['x-business-id']
  if (!id) throw new Error('No active business selected')
  return id
}

// GET /api/messages
export const getMessages = async (req, res) => {
 const business_id = getBusinessId(req)
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