const request = require('supertest');
const express = require('express');

// Mock dependencies
const mockHealthCheck = jest.fn();

jest.mock('../../src/db/client', () => ({
    healthCheck: mockHealthCheck,
}));

jest.mock('../../src/utils/logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
}));

const logger = require('../../src/utils/logger');
const healthRouter = require('../../src/routes/health');

describe('Health Route', () => {
    let app;

    beforeEach(() => {
        jest.clearAllMocks();
        mockHealthCheck.mockReset();
        
        // Create a fresh Express app for each test
        app = express();
        app.use('/health', healthRouter);
    });

    describe('GET /health', () => {
        it('should return 200 with healthy status when database is connected', async () => {
            mockHealthCheck.mockResolvedValue(true);

            const response = await request(app)
                .get('/health')
                .expect(200)
                .expect('Content-Type', /json/);

            expect(response.body).toEqual({
                status: 'healthy',
                database: 'connected',
            });

            expect(mockHealthCheck).toHaveBeenCalled();
            expect(logger.info).toHaveBeenCalledWith(
                'Health check successful',
                expect.objectContaining({
                    duration: expect.stringMatching(/\d+ms/),
                })
            );
        });

        it('should return 503 with unhealthy status when database is disconnected', async () => {
            mockHealthCheck.mockResolvedValue(false);

            const response = await request(app)
                .get('/health')
                .expect(503)
                .expect('Content-Type', /json/);

            expect(response.body).toEqual({
                status: 'unhealthy',
                database: 'disconnected',
            });

            expect(mockHealthCheck).toHaveBeenCalled();
            expect(logger.warn).toHaveBeenCalledWith(
                'Health check failed - database not connected',
                expect.objectContaining({
                    duration: expect.stringMatching(/\d+ms/),
                })
            );
        });

        it('should return 503 when health check throws an error', async () => {
            const error = new Error('Database connection failed');
            mockHealthCheck.mockRejectedValue(error);

            const response = await request(app)
                .get('/health')
                .expect(503)
                .expect('Content-Type', /json/);

            expect(response.body).toEqual({
                status: 'unhealthy',
                database: 'disconnected',
            });

            expect(logger.error).toHaveBeenCalledWith(
                'Health check error',
                error,
                expect.objectContaining({
                    duration: expect.stringMatching(/\d+ms/),
                })
            );
        });

        it('should timeout after 5 seconds and return 503', async () => {
            // Mock a health check that takes longer than 5 seconds
            mockHealthCheck.mockImplementation(() => {
                return new Promise((resolve) => {
                    setTimeout(() => resolve(true), 6000);
                });
            });

            const response = await request(app)
                .get('/health')
                .expect(503)
                .expect('Content-Type', /json/);

            expect(response.body).toEqual({
                status: 'unhealthy',
                database: 'disconnected',
            });

            expect(logger.error).toHaveBeenCalledWith(
                'Health check error',
                expect.objectContaining({
                    message: 'Health check timeout after 5 seconds',
                }),
                expect.objectContaining({
                    duration: expect.stringMatching(/\d+ms/),
                })
            );
        }, 10000); // Increase test timeout to 10 seconds

        it('should complete health check within 5 seconds when successful', async () => {
            mockHealthCheck.mockResolvedValue(true);

            const startTime = Date.now();
            await request(app).get('/health').expect(200);
            const duration = Date.now() - startTime;

            // Should complete well within 5 seconds
            expect(duration).toBeLessThan(5000);
        });

        it('should handle multiple concurrent requests', async () => {
            mockHealthCheck.mockResolvedValue(true);

            const requests = [
                request(app).get('/health'),
                request(app).get('/health'),
                request(app).get('/health'),
            ];

            const responses = await Promise.all(requests);

            responses.forEach(response => {
                expect(response.status).toBe(200);
                expect(response.body).toEqual({
                    status: 'healthy',
                    database: 'connected',
                });
            });

            expect(mockHealthCheck).toHaveBeenCalledTimes(3);
        });

        it('should log duration for successful checks', async () => {
            mockHealthCheck.mockResolvedValue(true);

            await request(app).get('/health').expect(200);

            expect(logger.info).toHaveBeenCalledWith(
                'Health check successful',
                expect.objectContaining({
                    duration: expect.stringMatching(/^\d+ms$/),
                })
            );
        });

        it('should log duration for failed checks', async () => {
            mockHealthCheck.mockResolvedValue(false);

            await request(app).get('/health').expect(503);

            expect(logger.warn).toHaveBeenCalledWith(
                'Health check failed - database not connected',
                expect.objectContaining({
                    duration: expect.stringMatching(/^\d+ms$/),
                })
            );
        });

        it('should log duration for error cases', async () => {
            mockHealthCheck.mockRejectedValue(new Error('Test error'));

            await request(app).get('/health').expect(503);

            expect(logger.error).toHaveBeenCalledWith(
                'Health check error',
                expect.any(Error),
                expect.objectContaining({
                    duration: expect.stringMatching(/^\d+ms$/),
                })
            );
        });
    });
});
