import express from 'express';
import { cancelJob as jobCancel } from './jobCancelController.js';


const router = express.Router();
router.get('/:jobId', jobCancel);


export default router;
