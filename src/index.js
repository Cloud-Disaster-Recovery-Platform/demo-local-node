const config = require('./config');
const logger = require('./utils/logger');
const dbClient = require('./db/client');
const { startServer } = require('./server');

async function startApplication(options = {}) {
    const configInstance = options.configInstance || config;
    const dbClientInstance = options.dbClientInstance || dbClient;
    const loggerInstance = options.loggerInstance || logger;
    const startServerFn = options.startServerFn || startServer;
    const processRef = options.processRef || process;

    try {
        configInstance.logConfiguration(loggerInstance);

        await dbClientInstance.connect();
        await dbClientInstance.initializeSchema();

        return startServerFn({
            port: configInstance.port,
            loggerInstance,
            processRef,
            dbClientInstance,
            shutdownTimeout: configInstance.shutdownTimeout,
        });
    } catch (error) {
        loggerInstance.error('Failed to start application', error);
        processRef.exit(1);
        return null;
    }
}

if (require.main === module) {
    startApplication();
}

module.exports = {
    startApplication,
};
