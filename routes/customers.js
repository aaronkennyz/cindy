import express from 'express'
import { getCustomers, addCustomer, updateCustomer, deleteCustomer } from '../controllers/customersController.js'
import protect from '../middleware/auth.js'

const router = express.Router()

router.get('/', protect, getCustomers)
router.post('/', protect, addCustomer)
router.put('/:id', protect, updateCustomer)
router.delete('/:id', protect, deleteCustomer)

export default router