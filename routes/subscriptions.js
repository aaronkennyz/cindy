import express from 'express'
import {
  getSubscriptions,
  getExpiringSubscriptions,
  createSubscription,
  updateSubscription,
  deleteSubscription
} from '../controllers/subscriptionsController.js'
import protect from '../middleware/auth.js'

const router = express.Router()

router.get('/expiring', protect, getExpiringSubscriptions)
router.get('/', protect, getSubscriptions)
router.post('/', protect, createSubscription)
router.put('/:id', protect, updateSubscription)
router.delete('/:id', protect, deleteSubscription)

export default router