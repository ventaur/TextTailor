import express from 'express';
import { setupDataForTest } from './setupDataForTestController.js';


const router = express.Router();
router.post('/', setupDataForTest);


export default router;
