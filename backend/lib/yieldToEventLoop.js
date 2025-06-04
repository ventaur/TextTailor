/**
 * This function yields control back to the event loop,
 * 
 * @returns {Promise<void>} A promise that resolves in the next event loop iteration.
 */
export default async function yieldToEventLoop() {
    return new Promise(resolve => setImmediate(resolve));
}
