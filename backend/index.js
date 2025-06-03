import express from 'express';
import replaceTextRoute from './features/replaceText/replaceTextRoute.js';
import jobProgressRoute from './features/jobProgress/jobProgressRoute.js';
import jobCancelRoute from './features/jobCancel/jobCancelRoute.js';
import setupDataForTestRoute from './features/setupDataForTest/setupDataForTestRoute.js';


const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());


// Endpoints
app.get('/', (req, res) => {
    res.send('Welcome to the Text Tailor API! Nothing to see here.');
});

app.use('/replace-text', replaceTextRoute);
app.use('/job-progress', jobProgressRoute);
app.use('/cancel-job', jobCancelRoute);

if (process.env.NODE_ENV === 'development') {
    app.use('/setup-data-for-test', setupDataForTestRoute);
    console.log('Running in development mode. Setup data route is enabled.');
}


// Start the server.
const server = app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});


// Handle sginals for graceful shutdown.
function shutdown(signal) {
    console.log(`\nReceived ${signal}. Closing server gracefully...`);
    server.close(() => {
        console.log('HTTP server closed.');
        // TODO: Close any other resources like database connections, etc.

        process.exit(0);
    });

    // Force shutdown if it takes too long
    setTimeout(() => {
        console.error('Forced shutdown.');
        process.exit(1);
    }, 10000); // 10 seconds timeout
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    shutdown('SIGTERM');
});
