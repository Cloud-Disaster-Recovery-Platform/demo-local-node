class Logger {
    constructor() {
        this.formatLog = (level, message, meta = {}) => {
            const timestamp = new Date().toISOString();
            const logEntry = {
                timestamp,
                level,
                message,
                ...meta,
            };
            return JSON.stringify(logEntry);
        };
    }

    info(message, meta = {}) {
        console.log(this.formatLog('INFO', message, meta));
    }

    warn(message, meta = {}) {
        console.warn(this.formatLog('WARN', message, meta));
    }

    error(message, error = null, meta = {}) {
        const errorMeta = error ? {
            error: error.message || error,
            stack: error.stack
        } : {};
        
        console.error(this.formatLog('ERROR', message, { ...meta, ...errorMeta }));
    }
}

const logger = new Logger();

module.exports = logger;
