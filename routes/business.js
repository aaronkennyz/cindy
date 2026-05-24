import express from 'express'
import { createBusiness, getBusiness, updateBusiness } from '../controllers/businessController.js'
import protect from '../middleware/auth.js'

const router = express.Router()

router.post('/', protect, createBusiness)
router.get('/', protect, getBusiness)
router.put('/:id', protect, updateBusiness)

export default router