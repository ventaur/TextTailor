import express from 'express';
import { jobProgress } from './jobProgressController.js';


const router = express.Router();
router.get('/:jobId', jobProgress);


export default router;
