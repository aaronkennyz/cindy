import express from 'express'
import { getMessages, logMessage } from '../controllers/messagesController.js'
import protect from '../middleware/auth.js'

const router = express.Router()

router.get('/', protect, getMessages)
router.post('/', protect, logMessage)

export default router