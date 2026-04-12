const express = require('express');
const config = require('./config');
const logger = require('./utils/logger');
const requestLogger = require('./utils/requestLogger');
const healthRouter = require('./routes/health');
const tasksRouter = require('./routes/tasks');
const dbClient = require('./db/client');

function createApp() {
    const app = express();

    app.use(express.json());
    app.use(requestLogger);

    app.use('/health', healthRouter);
    app.use('/tasks', tasksRouter);

    app.use((error, req, res, next) => {
        if (error instanceof SyntaxError && error.status === 400 && Object.prototype.hasOwnProperty.call(error, 'body')) {
            logger.warn('Invalid JSON received', {
                method: req.method,
                path: req.originalUrl,
            });
            return res.status(400).json({ error: 'Invalid JSON' });
        }

        return next(error);
    });

    return app;
}

function setupGracefulShutdown(server, options = {}) {
    const shutdownTimeout = options.shutdownTimeout || config.shutdownTimeout;
    const dbClientInstance = options.dbClientInstance || dbClient;
    const loggerInstance = options.loggerInstance || logger;
    const processRef = options.processRef || process;

    let shuttingDown = false;

    const shutdown = (signal) => {
        if (shuttingDown) {
            return;
        }

        shuttingDown = true;
        loggerInstance.info('Shutting down gracefully', { signal });

        const forceExitTimer = setTimeout(() => {
            loggerInstance.warn('Shutdown timeout reached, forcing exit');
            processRef.exit(0);
        }, shutdownTimeout);

        if (typeof forceExitTimer.unref === 'function') {
            forceExitTimer.unref();
        }

        server.close(async (error) => {
            if (error) {
                loggerInstance.error('Error while closing server', error);
            }

            try {
                await dbClientInstance.disconnect();
            } catch (disconnectError) {
                loggerInstance.warn('Error closing database connections during shutdown', {
                    error: disconnectError.message,
                });
            }

            clearTimeout(forceExitTimer);
            loggerInstance.info('Shutdown complete');
            processRef.exit(0);
        });
    };

    processRef.on('SIGTERM', () => shutdown('SIGTERM'));
    processRef.on('SIGINT', () => shutdown('SIGINT'));

    return shutdown;
}

function startServer(options = {}) {
    const app = options.app || createApp();
    const port = options.port || config.port;
    const loggerInstance = options.loggerInstance || logger;
    const processRef = options.processRef || process;
    const shutdownTimeout = options.shutdownTimeout || config.shutdownTimeout;
    const dbClientInstance = options.dbClientInstance || dbClient;

    const server = app.listen(port, () => {
        loggerInstance.info('Server started', { port });
    });

    server.on('error', (error) => {
        if (error.code === 'EADDRINUSE') {
            loggerInstance.error(`Port ${port} is already in use`, error);
            processRef.exit(1);
            return;
        }

        loggerInstance.error('Server encountered an error', error);
    });

    setupGracefulShutdown(server, {
        shutdownTimeout,
        dbClientInstance,
        loggerInstance,
        processRef,
    });

    return { app, server };
}

module.exports = {
    createApp,
    setupGracefulShutdown,
    startServer,
};
