import express from 'express';
import { replaceText } from './replaceTextController.js';


const router = express.Router();
router.post('/', replaceText);


export default router;
