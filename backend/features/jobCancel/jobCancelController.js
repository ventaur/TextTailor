import { cancelJob } from '../../lib/jobManager.js';


/**
 * Handles the cancellation of a job.
 * 
 * @param {import('express').Request} req - The request object containing the parameters.
 * @param {import('express').Response} res - The response object to send back the result.
 */
export async function jobCancel(req, res) {
    const wasSuccessful = cancelJob(req.params.jobId);
    if (!wasSuccessful) {
        return res.status(404).send('Job not found or already completed.');
    }

    res.status(200).send('Job cancelled successfully.');
}