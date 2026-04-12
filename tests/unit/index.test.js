const { startApplication } = require('../../src/index');

describe('Application entrypoint', () => {
    it('runs startup sequence and starts server', async () => {
        const configInstance = {
            port: 3000,
            shutdownTimeout: 10000,
            logConfiguration: jest.fn(),
        };
        const dbClientInstance = {
            connect: jest.fn().mockResolvedValue(),
            initializeSchema: jest.fn().mockResolvedValue(),
        };
        const loggerInstance = {
            error: jest.fn(),
        };
        const startServerFn = jest.fn().mockReturnValue({ server: {} });
        const processRef = {
            exit: jest.fn(),
        };

        const result = await startApplication({
            configInstance,
            dbClientInstance,
            loggerInstance,
            startServerFn,
            processRef,
        });

        expect(configInstance.logConfiguration).toHaveBeenCalledWith(loggerInstance);
        expect(dbClientInstance.connect).toHaveBeenCalled();
        expect(dbClientInstance.initializeSchema).toHaveBeenCalled();
        expect(startServerFn).toHaveBeenCalledWith({
            port: 3000,
            loggerInstance,
            processRef,
            dbClientInstance,
            shutdownTimeout: 10000,
        });
        expect(result).toEqual({ server: {} });
        expect(processRef.exit).not.toHaveBeenCalled();
    });

    it('exits with code 1 when database connection fails', async () => {
        const startupError = new Error('Connection failed');
        const configInstance = {
            port: 3000,
            shutdownTimeout: 10000,
            logConfiguration: jest.fn(),
        };
        const dbClientInstance = {
            connect: jest.fn().mockRejectedValue(startupError),
            initializeSchema: jest.fn(),
        };
        const loggerInstance = {
            error: jest.fn(),
        };
        const startServerFn = jest.fn();
        const processRef = {
            exit: jest.fn(),
        };

        const result = await startApplication({
            configInstance,
            dbClientInstance,
            loggerInstance,
            startServerFn,
            processRef,
        });

        expect(startServerFn).not.toHaveBeenCalled();
        expect(loggerInstance.error).toHaveBeenCalledWith('Failed to start application', startupError);
        expect(processRef.exit).toHaveBeenCalledWith(1);
        expect(result).toBeNull();
    });

    it('exits with code 1 when schema initialization fails', async () => {
        const startupError = new Error('Schema failed');
        const configInstance = {
            port: 3000,
            shutdownTimeout: 10000,
            logConfiguration: jest.fn(),
        };
        const dbClientInstance = {
            connect: jest.fn().mockResolvedValue(),
            initializeSchema: jest.fn().mockRejectedValue(startupError),
        };
        const loggerInstance = {
            error: jest.fn(),
        };
        const startServerFn = jest.fn();
        const processRef = {
            exit: jest.fn(),
        };

        const result = await startApplication({
            configInstance,
            dbClientInstance,
            loggerInstance,
            startServerFn,
            processRef,
        });

        expect(startServerFn).not.toHaveBeenCalled();
        expect(loggerInstance.error).toHaveBeenCalledWith('Failed to start application', startupError);
        expect(processRef.exit).toHaveBeenCalledWith(1);
        expect(result).toBeNull();
    });
});
