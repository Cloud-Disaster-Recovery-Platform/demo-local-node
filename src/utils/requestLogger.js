const logger = require('./logger');

function requestLogger(req, res, next) {
    const start = Date.now();
    const { method, originalUrl: url } = req;
    
    res.on('finish', () => {
        const duration = Date.now() - start;
        const statusCode = res.statusCode;
        
        logger.info(`HTTP ${method} ${url}`, {
            method,
            path: url,
            statusCode,
            responseTime: duration,
        });
    });

    next();
}

module.exports = requestLogger;
