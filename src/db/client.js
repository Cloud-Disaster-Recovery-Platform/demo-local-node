const { Pool } = require('pg');
const logger = require('../utils/logger');
const config = require('../config');

class DatabaseClient {
    constructor() {
        this.pool = null;
    }

    /**
     * Initialize and verify PostgreSQL connection pool
     */
    async connect() {
        try {
            logger.info('Initializing database connection pool', {
                host: config.database.host,
                port: config.database.port,
                database: config.database.name,
                user: config.database.user,
                poolMin: config.database.pool.min,
                poolMax: config.database.pool.max,
            });

            this.pool = new Pool({
                host: config.database.host,
                port: config.database.port,
                database: config.database.name,
                user: config.database.user,
                password: config.database.password,
                min: config.database.pool.min,
                max: config.database.pool.max,
            });

            // Verify connectivity with test query
            const startTime = Date.now();
            await this.pool.query('SELECT NOW()');
            const duration = Date.now() - startTime;

            logger.info('Database connection established', { 
                connectionTime: `${duration}ms`
            });
        } catch (error) {
            logger.error('Failed to connect to database', error);
            throw error;
        }
    }

    /**
     * Execute a query with automatic retry logic
     * @param {string} text - SQL query text
     * @param {Array} params - Query parameters
     * @param {number} attempt - Current retry attempt (internal)
     * @returns {Promise<Object>} Query result
     */
    async query(text, params = [], attempt = 1) {
        const maxAttempts = 3;
        const startTime = Date.now();

        try {
            if (!this.pool) {
                throw new Error('Database client not connected. Call connect() first.');
            }

            const result = await this.pool.query(text, params);
            const duration = Date.now() - startTime;

            logger.info('Database query executed', {
                duration: `${duration}ms`,
                rows: result.rowCount,
                attempt: attempt > 1 ? attempt : undefined,
            });

            return result;
        } catch (error) {
            const duration = Date.now() - startTime;
            
            if (attempt < maxAttempts) {
                // Exponential backoff: 100ms, 200ms, 400ms
                const backoffMs = 100 * Math.pow(2, attempt - 1);
                
                logger.warn('Database query failed, retrying', {
                    attempt,
                    maxAttempts,
                    backoffMs,
                    duration: `${duration}ms`,
                    error: error.message,
                });

                // Wait for backoff period
                await new Promise(resolve => setTimeout(resolve, backoffMs));
                
                // Retry with incremented attempt counter
                return this.query(text, params, attempt + 1);
            }

            // Max retries exceeded
            logger.error('Database query failed after all retries', error, {
                attempts: maxAttempts,
                duration: `${duration}ms`,
            });
            
            throw error;
        }
    }

    /**
     * Check database connectivity
     * @returns {Promise<boolean>} True if database is healthy
     */
    async healthCheck() {
        const startTime = Date.now();
        
        try {
            if (!this.pool) {
                logger.warn('Health check failed: database client not connected');
                return false;
            }

            await this.pool.query('SELECT 1');
            const duration = Date.now() - startTime;

            logger.info('Database health check passed', {
                duration: `${duration}ms`,
            });

            return true;
        } catch (error) {
            const duration = Date.now() - startTime;
            
            logger.error('Database health check failed', error, {
                duration: `${duration}ms`,
            });

            return false;
        }
    }

    /**
     * Initialize database schema
     * Creates tasks table if it doesn't exist and adds necessary indexes
     */
    async initializeSchema() {
        try {
            logger.info('Initializing database schema');

            // Create tasks table if it doesn't exist
            const createTableQuery = `
                CREATE TABLE IF NOT EXISTS tasks (
                    id UUID PRIMARY KEY,
                    title TEXT NOT NULL,
                    description TEXT,
                    status TEXT NOT NULL DEFAULT 'pending',
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
            `;

            await this.query(createTableQuery);
            logger.info('Tasks table verified/created');

            // Create index on status column if it doesn't exist
            const createIndexQuery = `
                CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)
            `;

            await this.query(createIndexQuery);
            logger.info('Status column index verified/created');

            logger.info('Database schema initialization complete');
        } catch (error) {
            logger.error('Schema initialization failed', error);
            throw error;
        }
    }

    /**
     * Close all database connections
     */
    async disconnect() {
        try {
            if (this.pool) {
                await this.pool.end();
                logger.info('Database connections closed');
                this.pool = null;
            }
        } catch (error) {
            logger.error('Error closing database connections', error);
            throw error;
        }
    }
}

// Export singleton instance
const dbClient = new DatabaseClient();
module.exports = dbClient;
