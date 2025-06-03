import { getJob, JobEvents } from '../../lib/jobManager.js';


/**
 * Handles job progress updates for a specific job identified by jobId.
 * It sets up an EventSource connection (SSE) to stream progress updates to the client.
 * 
 * @param {import('express').Request} req - The request object containing the parameters.
 * @param {import('express').Response} res - The response object to send back the result.
 */
export async function jobProgress(req, res) {
    const job = getJob(req.params.jobId);
    if (!job) {
        return res.status(404).send('Job not found.');
    }

    res.set({
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive'
    });

    // Flush the headers immediately to establish the SSE connection.
    res.flushHeaders?.();


    const sendProgress = (jobProgress) => {
        res.write(`event: progress\ndata: ${JSON.stringify(jobProgress)}\n\n`);
    };

    const sendComplete = (jobProgress) => {
        res.write(`event: complete\ndata: ${JSON.stringify(jobProgress)}\n\n`);
        res.end();
    };

    const sendError = (jobProgress) => {
        res.write(`event: error\ndata: ${JSON.stringify(jobProgress)}\n\n`);
        res.end();
    };

    const sendCleanup = () => {
        res.write(`event: cleanup\ndata: {}\n\n`);
        res.end();
    }

    // Immediately send the current state of the job's progress.
    sendProgress({ status: job.status, progress: job.progress });

    // Subscribe to the job's updates.
    job.emitter.on(JobEvents.Progress, sendProgress);
    job.emitter.once(JobEvents.Complete, sendComplete);
    job.emitter.once(JobEvents.Error, sendError);
    job.emitter.once(JobEvents.Cleanup, sendCleanup);

    
    // Handle client disconnection or errors.
    req.on('close', () => {
        job.emitter.removeListener(JobEvents.Progress, sendProgress);
    });
}
