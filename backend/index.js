import express from 'express';
import cors from 'cors';

import replaceTextRoute from './features/replaceText/replaceTextRoute.js';
import jobProgressRoute from './features/jobProgress/jobProgressRoute.js';
import jobCancelRoute from './features/jobCancel/jobCancelRoute.js';
import setupDataForTestRoute from './features/setupDataForTest/setupDataForTestRoute.js';

import logger from './lib/logger.js';



const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(cors({
    origin: '*',
    methods: ['POST', 'GET', 'OPTIONS'],
    allowedHeaders: ['Content-Type']
}));


// Endpoints
app.get('/', (req, res) => {
    res.send('Welcome to the Text Tailor API! Nothing to see here.');
});

app.use('/replace-text', replaceTextRoute);
app.use('/job-progress', jobProgressRoute);
app.use('/cancel-job', jobCancelRoute);

if (process.env.NODE_ENV === 'development') {
    app.use('/setup-data-for-test', setupDataForTestRoute);
    logger.info('Running in development mode. Setup data route is enabled.');
}


// Start the server.
const server = app.listen(port, () => {
    logger.info(`Server is running on port ${port}`);
});


// Handle sginals for graceful shutdown.
function shutdown(signal) {
    logger.info(`\nReceived ${signal}. Closing server gracefully...`);
    server.close(() => {
        logger.info('HTTP server closed.');
        // TODO: Close any other resources like database connections, etc.

        process.exit(0);
    });

    // Force shutdown if it takes too long
    setTimeout(() => {
        logger.error('Forced shutdown.');
        process.exit(1);
    }, 10000); // 10 seconds timeout
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception:', err);
    shutdown('SIGTERM');
});
