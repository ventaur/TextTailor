import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

import logger from './logger.js';


/**
 * In-memory storage for jobs.
 * @type {Object<string, Job>}
 */
const jobs = {};
const JobCleanupDelayInMs = 5 * 60 * 1000; // 5 minutes


/**
 * Enum for job statuses.
 * @readonly
 * @enum {string}
 */
export const JobStatus = {
    InProgress: 'in-progress',
    Complete: 'complete',
    Cancelled: 'cancelled',
    Failed: 'failed'
};

/**
 * Enum for job events.
 * @readonly
 * @enum {string}
 */
export const JobEvents = {
    Progress: 'progress',
    Complete: 'complete',
    Error: 'error',
    Cancel: 'cancel',
    Cleanup: 'cleanup'
};

export const JobEventForStatus = {};
JobEventForStatus[`${JobStatus.InProgress}`] = JobEvents.Progress;
JobEventForStatus[`${JobStatus.Complete}`] = JobEvents.Complete;
JobEventForStatus[`${JobStatus.Cancelled}`] = JobEvents.Cancel;
JobEventForStatus[`${JobStatus.Failed}`] = JobEvents.Error;


/**
 * @typedef {Object} Job
 * @property {JobStatus} status - The current status of the job.
 * @property {number} progress - The progress percentage of the job (0-100).
 * @property {Object} stats - The stats of the completed job.
 * @property {string|null} message - The error message if the job failed, otherwise null.
 * @property {EventEmitter} emitter - Event emitter for job events.
 * @property {AbortController} controller - Controller to manage job cancellation.
 * @property {Date} createdAt - The timestamp when the job was created.
 */

/**
 * @typedef {Object} JobProgress
 * @property {JobStatus} status - The current status of the job.
 * @property {number} progress - The progress percentage of the job (0-100).
 * @property [{string}] message - Any message.
 * @property [{Object}] data - Additional data related to the job, if any.
 */

/**
 * @typedef {Object} JobControl
 * @property {string} jobId - Unique identifier for the job.
 * @property {{(progress: number): void}} emitProgress - Function to emit progress updates (0-100).
 * @property {{(stats: Object): void}} emitComplete - Function to emit job completion.
 * @property {{(error: Error): void}} emitFailure - Function to emit job failure with an error.
 * @property {AbortSignal} [abortSignal] - Optional abort signal to cancel the job.
 */


/**
 * @param {function(...args: any[], jobControl: JobControl): Promise<void>} task - The task to be executed as a job.
 * @returns {Promise<string>} jobId - Unique identifier for the job.
 */
export function createJob(task, ...args) {
    const id = uuidv4();
    const emitter = new EventEmitter();
    const controller = new AbortController();

    /**
     * @type {Job}
     */
    const job = {
        status: JobStatus.InProgress,
        progress: 0,
        stats: null,
        message: null,
        emitter,
        controller,
        createdAt: Date.now()
    };

    jobs[id] = job;

    // Provide the task with control hooks for its progress.
    const emitProgress = (progress) => {
        if (job.status !== JobStatus.InProgress) return;
        job.progress = progress;
        emitter.emit(JobEvents.Progress, { status: job.status, progress });
    };

    const emitComplete = (stats) => {
        if (job.status !== JobStatus.InProgress) return;
        job.status = JobStatus.Complete;
        job.progress = 100;
        job.stats = stats;
        emitter.emit(JobEvents.Complete, { status: job.status, progress: 100, stats });
        
        scheduleCleanup(id, JobCleanupDelayInMs);
    };

    const emitFailure = (error) => {
        if (job.status !== JobStatus.InProgress) return;
        job.status = JobStatus.Failed;
        job.message = error instanceof Error ? error.message : String(error);
        emitter.emit(JobEvents.Error, { status: job.status, progress: job.progress, message: job.message });

        scheduleCleanup(id, JobCleanupDelayInMs);
    };

    /**
     * @type {JobControl}
    */
    const jobControl = {
        jobId: id,
        emitProgress,
        emitComplete,
        emitFailure,
        abortSignal: controller.signal
    };

    // Execute the task asynchronously with the control hooks.
    // NOTE: Don't await the task here, as it should run independently.
    // NOTE: Just in case the task isn't a Promise, we wrap it in one.
    try {
        Promise.resolve(
            task(...args, jobControl)
        ).catch(emitFailure);
    } catch (error) {
        emitFailure(error);
    }

    return id;
}

/**
 * Cancels a job by its ID.
 * @param {string} jobId - The unique identifier of the job to cancel.
 * @returns {boolean} - Returns true if the job was successfully cancelled, false otherwise.
 */
export function cancelJob(jobId) {
    const job = jobs[jobId];
    if (!job || job.status !== JobStatus.InProgress) return false;

    job.controller.abort();
    job.status = JobStatus.Cancelled;
    job.message = 'Job was cancelled.';
    job.emitter.emit(JobEvents.Cancel, { status: job.status, progress: job.progress, message: job.message });
    
    scheduleCleanup(jobId, JobCleanupDelayInMs);

    return true;
}

/**
 * Retrieves a job by its ID.
 * @param {string} id - The unique identifier of the job.
 * @returns {Job|null} - Returns the job if found, otherwise null.
 */
export function getJob(id) {
    return jobs[id];
}


/**
 * Schedules a cleanup of the job after a specified delay.
 * @param {string} jobId - The unique identifier of the job to clean up.
 * @param {number} delayInMs - The delay in milliseconds before cleaning up the job.
 */
function scheduleCleanup(jobId, delayInMs) {
    setTimeout(() => {
        const job = jobs[jobId];
        if (!job) {
            logger.warn(`Job ${jobId} not found for cleanup.`);
            return;
        }

        logger.debug('Job IDs in memory before cleanup:', Object.keys(jobs));
        
        // Emit a cleanup event if needed, for any listeners to handle.
        job.emitter.emit(JobEvents.Cleanup);

        delete jobs[jobId];
        logger.info(`Cleaned up job ${jobId}.`);

        logger.debug('Job IDs in memory after cleanup:', Object.keys(jobs));
    }, delayInMs);
}