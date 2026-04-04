// Mock dependencies
const mockQuery = jest.fn();
const mockRandomUUID = jest.fn();

jest.mock('../../src/db/client', () => ({
    query: mockQuery,
}));

jest.mock('crypto', () => ({
    randomUUID: mockRandomUUID,
}));

jest.mock('../../src/utils/logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
}));

const dbClient = require('../../src/db/client');
const logger = require('../../src/utils/logger');
const taskService = require('../../src/services/taskService');

describe('TaskService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockQuery.mockReset();
        mockRandomUUID.mockReset();
    });

    describe('createTask()', () => {
        it('should create a task with all fields', async () => {
            const mockUuid = '123e4567-e89b-12d3-a456-426614174000';
            mockRandomUUID.mockReturnValue(mockUuid);

            const taskData = {
                title: 'Test Task',
                description: 'Test Description',
                status: 'in_progress',
            };

            const mockCreatedTask = {
                id: mockUuid,
                title: 'Test Task',
                description: 'Test Description',
                status: 'in_progress',
                created_at: expect.any(Date),
                updated_at: expect.any(Date),
            };

            mockQuery.mockResolvedValue({
                rows: [mockCreatedTask],
            });

            const result = await taskService.createTask(taskData);

            expect(mockRandomUUID).toHaveBeenCalled();
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO tasks'),
                expect.arrayContaining([
                    mockUuid,
                    'Test Task',
                    'Test Description',
                    'in_progress',
                    expect.any(Date),
                    expect.any(Date),
                ])
            );
            expect(result).toEqual(mockCreatedTask);
            expect(logger.info).toHaveBeenCalledWith(
                'Task created',
                { taskId: mockUuid, title: 'Test Task' }
            );
        });

        it('should create a task with default status pending', async () => {
            const mockUuid = '123e4567-e89b-12d3-a456-426614174001';
            mockRandomUUID.mockReturnValue(mockUuid);

            const taskData = {
                title: 'Test Task',
            };

            const mockCreatedTask = {
                id: mockUuid,
                title: 'Test Task',
                description: null,
                status: 'pending',
                created_at: expect.any(Date),
                updated_at: expect.any(Date),
            };

            mockQuery.mockResolvedValue({
                rows: [mockCreatedTask],
            });

            const result = await taskService.createTask(taskData);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO tasks'),
                expect.arrayContaining([
                    mockUuid,
                    'Test Task',
                    null,
                    'pending',
                    expect.any(Date),
                    expect.any(Date),
                ])
            );
            expect(result.status).toBe('pending');
        });

        it('should set description to null if not provided', async () => {
            const mockUuid = '123e4567-e89b-12d3-a456-426614174002';
            mockRandomUUID.mockReturnValue(mockUuid);

            const taskData = {
                title: 'Test Task',
                status: 'pending',
            };

            mockQuery.mockResolvedValue({
                rows: [{
                    id: mockUuid,
                    title: 'Test Task',
                    description: null,
                    status: 'pending',
                    created_at: new Date(),
                    updated_at: new Date(),
                }],
            });

            await taskService.createTask(taskData);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO tasks'),
                expect.arrayContaining([
                    mockUuid,
                    'Test Task',
                    null,
                    'pending',
                    expect.any(Date),
                    expect.any(Date),
                ])
            );
        });

        it('should throw error if database query fails', async () => {
            const mockUuid = '123e4567-e89b-12d3-a456-426614174003';
            mockRandomUUID.mockReturnValue(mockUuid);

            const taskData = { title: 'Test Task' };
            const error = new Error('Database error');
            mockQuery.mockRejectedValue(error);

            await expect(taskService.createTask(taskData)).rejects.toThrow('Database error');

            expect(logger.error).toHaveBeenCalledWith(
                'Failed to create task',
                error,
                { taskData }
            );
        });
    });

    describe('getAllTasks()', () => {
        it('should retrieve all tasks', async () => {
            const mockTasks = [
                {
                    id: '123e4567-e89b-12d3-a456-426614174001',
                    title: 'Task 1',
                    description: 'Description 1',
                    status: 'pending',
                    created_at: new Date(),
                    updated_at: new Date(),
                },
                {
                    id: '123e4567-e89b-12d3-a456-426614174002',
                    title: 'Task 2',
                    description: 'Description 2',
                    status: 'completed',
                    created_at: new Date(),
                    updated_at: new Date(),
                },
            ];

            mockQuery.mockResolvedValue({ rows: mockTasks });

            const result = await taskService.getAllTasks();

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining('SELECT * FROM tasks ORDER BY created_at DESC')
            );
            expect(result).toEqual(mockTasks);
            expect(logger.info).toHaveBeenCalledWith(
                'Retrieved all tasks',
                { count: 2 }
            );
        });

        it('should return empty array if no tasks exist', async () => {
            mockQuery.mockResolvedValue({ rows: [] });

            const result = await taskService.getAllTasks();

            expect(result).toEqual([]);
            expect(logger.info).toHaveBeenCalledWith(
                'Retrieved all tasks',
                { count: 0 }
            );
        });

        it('should throw error if database query fails', async () => {
            const error = new Error('Database error');
            mockQuery.mockRejectedValue(error);

            await expect(taskService.getAllTasks()).rejects.toThrow('Database error');

            expect(logger.error).toHaveBeenCalledWith(
                'Failed to retrieve tasks',
                error
            );
        });
    });

    describe('getTaskById()', () => {
        it('should retrieve a task by id', async () => {
            const mockTask = {
                id: '123e4567-e89b-12d3-a456-426614174000',
                title: 'Test Task',
                description: 'Test Description',
                status: 'pending',
                created_at: new Date(),
                updated_at: new Date(),
            };

            mockQuery.mockResolvedValue({ rows: [mockTask] });

            const result = await taskService.getTaskById(mockTask.id);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining('SELECT * FROM tasks WHERE id = $1'),
                [mockTask.id]
            );
            expect(result).toEqual(mockTask);
            expect(logger.info).toHaveBeenCalledWith(
                'Task retrieved',
                { taskId: mockTask.id }
            );
        });

        it('should return null if task not found', async () => {
            mockQuery.mockResolvedValue({ rows: [] });

            const result = await taskService.getTaskById('non-existent-id');

            expect(result).toBeNull();
            expect(logger.info).toHaveBeenCalledWith(
                'Task not found',
                { taskId: 'non-existent-id' }
            );
        });

        it('should throw error if database query fails', async () => {
            const error = new Error('Database error');
            mockQuery.mockRejectedValue(error);

            await expect(taskService.getTaskById('some-id')).rejects.toThrow('Database error');

            expect(logger.error).toHaveBeenCalledWith(
                'Failed to retrieve task',
                error,
                { taskId: 'some-id' }
            );
        });
    });

    describe('updateTask()', () => {
        it('should update all fields of a task', async () => {
            const taskId = '123e4567-e89b-12d3-a456-426614174000';
            const updates = {
                title: 'Updated Title',
                description: 'Updated Description',
                status: 'completed',
            };

            const mockUpdatedTask = {
                id: taskId,
                title: 'Updated Title',
                description: 'Updated Description',
                status: 'completed',
                created_at: new Date(),
                updated_at: new Date(),
            };

            mockQuery.mockResolvedValue({ rows: [mockUpdatedTask] });

            const result = await taskService.updateTask(taskId, updates);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE tasks'),
                expect.arrayContaining([
                    'Updated Title',
                    'Updated Description',
                    'completed',
                    expect.any(Date),
                    taskId,
                ])
            );
            expect(result).toEqual(mockUpdatedTask);
            expect(logger.info).toHaveBeenCalledWith(
                'Task updated',
                { taskId, updates }
            );
        });

        it('should update only title', async () => {
            const taskId = '123e4567-e89b-12d3-a456-426614174001';
            const updates = { title: 'New Title' };

            const mockUpdatedTask = {
                id: taskId,
                title: 'New Title',
                description: 'Old Description',
                status: 'pending',
                created_at: new Date(),
                updated_at: new Date(),
            };

            mockQuery.mockResolvedValue({ rows: [mockUpdatedTask] });

            const result = await taskService.updateTask(taskId, updates);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE tasks'),
                expect.arrayContaining(['New Title', expect.any(Date), taskId])
            );
            expect(result).toEqual(mockUpdatedTask);
        });

        it('should update only description', async () => {
            const taskId = '123e4567-e89b-12d3-a456-426614174002';
            const updates = { description: 'New Description' };

            mockQuery.mockResolvedValue({
                rows: [{
                    id: taskId,
                    title: 'Old Title',
                    description: 'New Description',
                    status: 'pending',
                    created_at: new Date(),
                    updated_at: new Date(),
                }],
            });

            await taskService.updateTask(taskId, updates);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE tasks'),
                expect.arrayContaining(['New Description', expect.any(Date), taskId])
            );
        });

        it('should update only status', async () => {
            const taskId = '123e4567-e89b-12d3-a456-426614174003';
            const updates = { status: 'in_progress' };

            mockQuery.mockResolvedValue({
                rows: [{
                    id: taskId,
                    title: 'Old Title',
                    description: 'Old Description',
                    status: 'in_progress',
                    created_at: new Date(),
                    updated_at: new Date(),
                }],
            });

            await taskService.updateTask(taskId, updates);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE tasks'),
                expect.arrayContaining(['in_progress', expect.any(Date), taskId])
            );
        });

        it('should always update updated_at timestamp', async () => {
            const taskId = '123e4567-e89b-12d3-a456-426614174004';
            const updates = { title: 'New Title' };

            mockQuery.mockResolvedValue({
                rows: [{
                    id: taskId,
                    title: 'New Title',
                    description: null,
                    status: 'pending',
                    created_at: new Date('2024-01-01'),
                    updated_at: new Date(),
                }],
            });

            await taskService.updateTask(taskId, updates);

            const callArgs = mockQuery.mock.calls[0];
            const values = callArgs[1];
            
            // Second value should be the updated_at timestamp
            expect(values[1]).toBeInstanceOf(Date);
        });

        it('should return null if task not found', async () => {
            mockQuery.mockResolvedValue({ rows: [] });

            const result = await taskService.updateTask('non-existent-id', { title: 'New' });

            expect(result).toBeNull();
            expect(logger.info).toHaveBeenCalledWith(
                'Task not found for update',
                { taskId: 'non-existent-id' }
            );
        });

        it('should throw error if database query fails', async () => {
            const error = new Error('Database error');
            mockQuery.mockRejectedValue(error);

            await expect(
                taskService.updateTask('some-id', { title: 'New' })
            ).rejects.toThrow('Database error');

            expect(logger.error).toHaveBeenCalledWith(
                'Failed to update task',
                error,
                { taskId: 'some-id', updates: { title: 'New' } }
            );
        });
    });

    describe('deleteTask()', () => {
        it('should delete a task', async () => {
            const taskId = '123e4567-e89b-12d3-a456-426614174000';

            mockQuery.mockResolvedValue({
                rows: [{ id: taskId }],
            });

            const result = await taskService.deleteTask(taskId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining('DELETE FROM tasks WHERE id = $1 RETURNING id'),
                [taskId]
            );
            expect(result).toBe(true);
            expect(logger.info).toHaveBeenCalledWith(
                'Task deleted',
                { taskId }
            );
        });

        it('should return false if task not found', async () => {
            mockQuery.mockResolvedValue({ rows: [] });

            const result = await taskService.deleteTask('non-existent-id');

            expect(result).toBe(false);
            expect(logger.info).toHaveBeenCalledWith(
                'Task not found for deletion',
                { taskId: 'non-existent-id' }
            );
        });

        it('should throw error if database query fails', async () => {
            const error = new Error('Database error');
            mockQuery.mockRejectedValue(error);

            await expect(taskService.deleteTask('some-id')).rejects.toThrow('Database error');

            expect(logger.error).toHaveBeenCalledWith(
                'Failed to delete task',
                error,
                { taskId: 'some-id' }
            );
        });
    });
});
