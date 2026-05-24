import express from 'express'
import { getPlans, createPlan, updatePlan, deletePlan } from '../controllers/plansController.js'
import protect from '../middleware/auth.js'

const router = express.Router()

router.get('/', protect, getPlans)
router.post('/', protect, createPlan)
router.put('/:id', protect, updatePlan)
router.delete('/:id', protect, deletePlan)

export default router