// Create mocks before requiring modules
const mockPoolInstance = {
    query: jest.fn(),
    end: jest.fn(),
};

const mockPool = jest.fn(() => mockPoolInstance);

jest.mock('pg', () => ({
    Pool: mockPool,
}));

jest.mock('../../src/utils/logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
}));

jest.mock('../../src/config', () => ({
    database: {
        host: 'localhost',
        port: 5432,
        name: 'test_db',
        user: 'test_user',
        password: 'test_pass',
        pool: {
            min: 2,
            max: 10,
        },
    },
}));

const logger = require('../../src/utils/logger');
const dbClient = require('../../src/db/client');

describe('DatabaseClient', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset the client's pool to null for each test
        dbClient.pool = null;
        // Reset all mock implementations
        mockPoolInstance.query.mockReset();
        mockPoolInstance.end.mockReset();
    });

    describe('connect()', () => {
        it('should initialize connection pool with correct configuration', async () => {
            mockPoolInstance.query.mockResolvedValue({ rows: [{ now: new Date() }] });

            await dbClient.connect();

            expect(mockPool).toHaveBeenCalledWith({
                host: 'localhost',
                port: 5432,
                database: 'test_db',
                user: 'test_user',
                password: 'test_pass',
                min: 2,
                max: 10,
            });
        });

        it('should verify connectivity with test query', async () => {
            mockPoolInstance.query.mockResolvedValue({ rows: [{ now: new Date() }] });

            await dbClient.connect();

            expect(mockPoolInstance.query).toHaveBeenCalledWith('SELECT NOW()');
            expect(logger.info).toHaveBeenCalledWith(
                'Database connection established',
                expect.objectContaining({
                    connectionTime: expect.stringMatching(/\d+ms/)
                })
            );
        });

        it('should throw error if connection fails', async () => {
            const error = new Error('Connection failed');
            mockPoolInstance.query.mockRejectedValue(error);

            await expect(dbClient.connect()).rejects.toThrow('Connection failed');
            expect(logger.error).toHaveBeenCalledWith(
                'Failed to connect to database',
                error
            );
        });
    });

    describe('query()', () => {
        beforeEach(async () => {
            mockPoolInstance.query.mockResolvedValue({ rows: [{ now: new Date() }] });
            await dbClient.connect();
            mockPoolInstance.query.mockClear();
        });

        it('should execute query successfully', async () => {
            const mockResult = { rows: [{ id: 1, name: 'Test' }], rowCount: 1 };
            mockPoolInstance.query.mockResolvedValue(mockResult);

            const result = await dbClient.query('SELECT * FROM tasks', []);

            expect(mockPoolInstance.query).toHaveBeenCalledWith('SELECT * FROM tasks', []);
            expect(result).toEqual(mockResult);
            expect(logger.info).toHaveBeenCalledWith(
                'Database query executed',
                expect.objectContaining({
                    duration: expect.stringMatching(/\d+ms/),
                    rows: 1,
                })
            );
        });

        it('should retry query on failure with exponential backoff', async () => {
            const error = new Error('Query failed');
            mockPoolInstance.query
                .mockRejectedValueOnce(error)
                .mockRejectedValueOnce(error)
                .mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const result = await dbClient.query('SELECT * FROM tasks', []);

            expect(mockPoolInstance.query).toHaveBeenCalledTimes(3);
            expect(logger.warn).toHaveBeenCalledTimes(2);
            expect(logger.warn).toHaveBeenNthCalledWith(
                1,
                'Database query failed, retrying',
                expect.objectContaining({
                    attempt: 1,
                    maxAttempts: 3,
                    backoffMs: 100,
                })
            );
            expect(logger.warn).toHaveBeenNthCalledWith(
                2,
                'Database query failed, retrying',
                expect.objectContaining({
                    attempt: 2,
                    maxAttempts: 3,
                    backoffMs: 200,
                })
            );
            expect(result.rowCount).toBe(0);
        }, 10000); // Increase timeout to allow for retries

        it('should throw error after max retries exceeded', async () => {
            const error = new Error('Query failed');
            mockPoolInstance.query.mockClear();
            mockPoolInstance.query.mockRejectedValue(error);

            await expect(dbClient.query('SELECT * FROM tasks', [])).rejects.toThrow('Query failed');

            expect(mockPoolInstance.query).toHaveBeenCalledTimes(3);
            expect(logger.error).toHaveBeenCalledWith(
                'Database query failed after all retries',
                error,
                expect.objectContaining({
                    attempts: 3,
                })
            );
        }, 10000); // Increase timeout to allow for retries

        it('should throw error if pool is not connected', async () => {
            dbClient.pool = null;

            await expect(dbClient.query('SELECT 1', [])).rejects.toThrow(
                'Database client not connected. Call connect() first.'
            );
        });

        it('should pass query parameters correctly', async () => {
            mockPoolInstance.query.mockResolvedValue({ rows: [], rowCount: 0 });

            await dbClient.query('INSERT INTO tasks (title) VALUES ($1)', ['Test Task']);

            expect(mockPoolInstance.query).toHaveBeenCalledWith(
                'INSERT INTO tasks (title) VALUES ($1)',
                ['Test Task']
            );
        });
    });

    describe('healthCheck()', () => {
        beforeEach(async () => {
            mockPoolInstance.query.mockResolvedValue({ rows: [{ now: new Date() }] });
            await dbClient.connect();
            mockPoolInstance.query.mockClear();
        });

        it('should return true when database is healthy', async () => {
            mockPoolInstance.query.mockResolvedValue({ rows: [{ result: 1 }] });

            const result = await dbClient.healthCheck();

            expect(result).toBe(true);
            expect(mockPoolInstance.query).toHaveBeenCalledWith('SELECT 1');
            expect(logger.info).toHaveBeenCalledWith(
                'Database health check passed',
                expect.objectContaining({
                    duration: expect.stringMatching(/\d+ms/),
                })
            );
        });

        it('should return false when database query fails', async () => {
            mockPoolInstance.query.mockRejectedValue(new Error('Connection lost'));

            const result = await dbClient.healthCheck();

            expect(result).toBe(false);
            expect(logger.error).toHaveBeenCalledWith(
                'Database health check failed',
                expect.any(Error),
                expect.objectContaining({
                    duration: expect.stringMatching(/\d+ms/),
                })
            );
        });

        it('should return false if pool is not connected', async () => {
            dbClient.pool = null;

            const result = await dbClient.healthCheck();

            expect(result).toBe(false);
            expect(logger.warn).toHaveBeenCalledWith(
                'Health check failed: database client not connected'
            );
        });
    });

    describe('initializeSchema()', () => {
        beforeEach(async () => {
            mockPoolInstance.query.mockResolvedValue({ rows: [{ now: new Date() }] });
            await dbClient.connect();
            mockPoolInstance.query.mockClear();
        });

        it('should create tasks table and index', async () => {
            mockPoolInstance.query.mockResolvedValue({ rows: [], rowCount: 0 });

            await dbClient.initializeSchema();

            expect(mockPoolInstance.query).toHaveBeenCalledTimes(2);
            
            // Check table creation query
            expect(mockPoolInstance.query).toHaveBeenNthCalledWith(
                1,
                expect.stringContaining('CREATE TABLE IF NOT EXISTS tasks'),
                []
            );
            
            // Check index creation query
            expect(mockPoolInstance.query).toHaveBeenNthCalledWith(
                2,
                expect.stringContaining('CREATE INDEX IF NOT EXISTS idx_tasks_status'),
                []
            );

            expect(logger.info).toHaveBeenCalledWith('Initializing database schema');
            expect(logger.info).toHaveBeenCalledWith('Tasks table verified/created');
            expect(logger.info).toHaveBeenCalledWith('Status column index verified/created');
            expect(logger.info).toHaveBeenCalledWith('Database schema initialization complete');
        });

        it('should throw error if table creation fails', async () => {
            const error = new Error('Table creation failed');
            mockPoolInstance.query.mockRejectedValue(error);

            await expect(dbClient.initializeSchema()).rejects.toThrow('Table creation failed');

            expect(logger.error).toHaveBeenCalledWith(
                'Schema initialization failed',
                error
            );
        });
    });

    describe('disconnect()', () => {
        beforeEach(async () => {
            mockPoolInstance.query.mockResolvedValue({ rows: [{ now: new Date() }] });
            await dbClient.connect();
            mockPoolInstance.end.mockClear();
        });

        it('should close all pool connections', async () => {
            mockPoolInstance.end.mockResolvedValue();

            await dbClient.disconnect();

            expect(mockPoolInstance.end).toHaveBeenCalled();
            expect(logger.info).toHaveBeenCalledWith('Database connections closed');
        });

        it('should set pool to null after disconnect', async () => {
            mockPoolInstance.end.mockResolvedValue();

            await dbClient.disconnect();

            expect(dbClient.pool).toBeNull();
        });

        it('should throw error if disconnect fails', async () => {
            const error = new Error('Disconnect failed');
            mockPoolInstance.end.mockRejectedValue(error);

            await expect(dbClient.disconnect()).rejects.toThrow('Disconnect failed');

            expect(logger.error).toHaveBeenCalledWith(
                'Error closing database connections',
                error
            );
        });

        it('should not throw if pool is already null', async () => {
            await dbClient.disconnect();
            mockPoolInstance.end.mockClear(); // Clear previous call
            dbClient.pool = null;

            await expect(dbClient.disconnect()).resolves.not.toThrow();
            expect(mockPoolInstance.end).not.toHaveBeenCalled();
        });
    });
});
