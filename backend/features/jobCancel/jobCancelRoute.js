import express from 'express';
import { jobCancel } from './jobCancelController.js';


const router = express.Router();
router.post('/:jobId', jobCancel);


export default router;
