import { Router } from 'express';
import { 
  scheduleEmails, getScheduledEmails, getSentEmails, 
  sendNow, getAllEmails, saveDraft, 
  toggleStar, toggleArchive, deleteEmail 
} from '../controllers/emailController';
import { authMiddleware } from '../middleware/auth';

import multer from 'multer';

const router = Router();
const upload = multer({ dest: 'uploads/' });

router.use(authMiddleware);

router.get('/', getAllEmails);
router.post('/send', upload.array('attachments', 10), sendNow);
router.post('/draft', upload.array('attachments', 10), saveDraft);
router.post('/schedule', upload.array('attachments', 10), scheduleEmails);
router.get('/scheduled', getScheduledEmails);
router.get('/sent', getSentEmails);

// Action routes
router.put('/:id/star', toggleStar);
router.put('/:id/archive', toggleArchive);
router.delete('/:id', deleteEmail);

export default router;
