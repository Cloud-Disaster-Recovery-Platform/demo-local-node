const express = require('express');
const router = express.Router();
const dbClient = require('../db/client');
const logger = require('../utils/logger');

/**
 * Health check endpoint
 * GET /health
 * Returns database connectivity status
 */
router.get('/', async (req, res) => {
    const startTime = Date.now();
    
    try {
        // Create a promise that will timeout after 5 seconds
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error('Health check timeout after 5 seconds'));
            }, 5000);
        });

        // Race between the health check and the timeout
        const healthCheckPromise = dbClient.healthCheck();
        const isHealthy = await Promise.race([healthCheckPromise, timeoutPromise]);

        const duration = Date.now() - startTime;

        if (isHealthy) {
            logger.info('Health check successful', { duration: `${duration}ms` });
            return res.status(200).json({
                status: 'healthy',
                database: 'connected',
            });
        } else {
            logger.warn('Health check failed - database not connected', { duration: `${duration}ms` });
            return res.status(503).json({
                status: 'unhealthy',
                database: 'disconnected',
            });
        }
    } catch (error) {
        const duration = Date.now() - startTime;
        logger.error('Health check error', error, { duration: `${duration}ms` });
        
        return res.status(503).json({
            status: 'unhealthy',
            database: 'disconnected',
        });
    }
});

module.exports = router;
