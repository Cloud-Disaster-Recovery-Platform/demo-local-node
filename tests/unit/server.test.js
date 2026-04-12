const request = require('supertest');
const { createApp, setupGracefulShutdown, startServer } = require('../../src/server');

describe('Server module', () => {
    describe('createApp()', () => {
        it('returns 400 JSON response for invalid JSON body', async () => {
            const app = createApp();

            const response = await request(app)
                .post('/tasks')
                .set('Content-Type', 'application/json')
                .send('{invalid-json')
                .expect(400)
                .expect('Content-Type', /json/);

            expect(response.body).toEqual({ error: 'Invalid JSON' });
        });
    });

    describe('setupGracefulShutdown()', () => {
        it('gracefully closes server and database on SIGTERM', async () => {
            const handlers = {};
            const processRef = {
                on: jest.fn((signal, handler) => {
                    handlers[signal] = handler;
                }),
                exit: jest.fn(),
            };
            const loggerInstance = {
                info: jest.fn(),
                warn: jest.fn(),
                error: jest.fn(),
            };
            const dbClientInstance = {
                disconnect: jest.fn().mockResolvedValue(),
            };
            const server = {
                close: jest.fn((callback) => callback()),
            };

            setupGracefulShutdown(server, {
                shutdownTimeout: 1000,
                processRef,
                loggerInstance,
                dbClientInstance,
            });

            handlers.SIGTERM();
            await new Promise(process.nextTick);

            expect(server.close).toHaveBeenCalled();
            expect(dbClientInstance.disconnect).toHaveBeenCalled();
            expect(loggerInstance.info).toHaveBeenCalledWith('Shutting down gracefully', { signal: 'SIGTERM' });
            expect(loggerInstance.info).toHaveBeenCalledWith('Shutdown complete');
            expect(processRef.exit).toHaveBeenCalledWith(0);
        });

        it('forces exit when shutdown timeout is reached', () => {
            jest.useFakeTimers();

            const handlers = {};
            const processRef = {
                on: jest.fn((signal, handler) => {
                    handlers[signal] = handler;
                }),
                exit: jest.fn(),
            };
            const loggerInstance = {
                info: jest.fn(),
                warn: jest.fn(),
                error: jest.fn(),
            };
            const dbClientInstance = {
                disconnect: jest.fn().mockResolvedValue(),
            };
            const server = {
                close: jest.fn(),
            };

            setupGracefulShutdown(server, {
                shutdownTimeout: 500,
                processRef,
                loggerInstance,
                dbClientInstance,
            });

            handlers.SIGINT();
            jest.advanceTimersByTime(500);

            expect(processRef.exit).toHaveBeenCalledWith(0);
            expect(loggerInstance.warn).toHaveBeenCalledWith('Shutdown timeout reached, forcing exit');

            jest.useRealTimers();
        });
    });

    describe('startServer()', () => {
        it('logs startup and exits with code 1 when port is in use', () => {
            const loggerInstance = {
                info: jest.fn(),
                warn: jest.fn(),
                error: jest.fn(),
            };
            const processRef = {
                on: jest.fn(),
                exit: jest.fn(),
            };
            const server = {
                on: jest.fn(),
                close: jest.fn(),
            };
            const app = {
                listen: jest.fn((port, callback) => {
                    callback();
                    return server;
                }),
            };

            startServer({
                app,
                port: 3456,
                loggerInstance,
                processRef,
                shutdownTimeout: 1000,
                dbClientInstance: { disconnect: jest.fn() },
            });

            expect(loggerInstance.info).toHaveBeenCalledWith('Server started', { port: 3456 });

            const errorHandler = server.on.mock.calls.find(([event]) => event === 'error')[1];
            errorHandler({ code: 'EADDRINUSE', message: 'in use' });

            expect(loggerInstance.error).toHaveBeenCalledWith(
                'Port 3456 is already in use',
                expect.objectContaining({ code: 'EADDRINUSE' })
            );
            expect(processRef.exit).toHaveBeenCalledWith(1);
            expect(processRef.on).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
            expect(processRef.on).toHaveBeenCalledWith('SIGINT', expect.any(Function));
        });
    });
});
