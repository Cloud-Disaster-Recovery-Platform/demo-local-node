const dotenv = require('dotenv');

dotenv.config();

const DEFAULT_PORT = 3000;
const DEFAULT_DB_HOST = 'localhost';
const DEFAULT_DB_PORT = 5432;
const DEFAULT_DB_NAME = 'demo_app';
const DEFAULT_DB_USER = 'postgres';
const DEFAULT_DB_POOL_MIN = 2;
const DEFAULT_DB_POOL_MAX = 10;
const DEFAULT_SHUTDOWN_TIMEOUT = 10000;

function parseInteger(value, fallback) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
}

const config = {
    port: parseInteger(process.env.PORT, DEFAULT_PORT),
    database: {
        host: process.env.DB_HOST || DEFAULT_DB_HOST,
        port: parseInteger(process.env.DB_PORT, DEFAULT_DB_PORT),
        name: process.env.DB_NAME || DEFAULT_DB_NAME,
        user: process.env.DB_USER || DEFAULT_DB_USER,
        password: process.env.DB_PASSWORD || '',
        pool: {
            min: parseInteger(process.env.DB_POOL_MIN, DEFAULT_DB_POOL_MIN),
            max: parseInteger(process.env.DB_POOL_MAX, DEFAULT_DB_POOL_MAX),
        },
    },
    shutdownTimeout: parseInteger(process.env.SHUTDOWN_TIMEOUT, DEFAULT_SHUTDOWN_TIMEOUT),
};

function logConfiguration(logger = console) {
    const configToLog = {
        port: config.port,
        database: {
            host: config.database.host,
            port: config.database.port,
            name: config.database.name,
            user: config.database.user,
            pool: config.database.pool,
        },
        shutdownTimeout: config.shutdownTimeout,
    };

    const infoLog = logger.info ? logger.info.bind(logger) : logger.log.bind(logger);
    infoLog('Application configuration:', configToLog);

    if (!config.database.password) {
        const warnLog = logger.warn ? logger.warn.bind(logger) : logger.log.bind(logger);
        warnLog('Warning: DB_PASSWORD is not set. Attempting connection without password.');
    }
}

module.exports = {
    ...config,
    logConfiguration,
};