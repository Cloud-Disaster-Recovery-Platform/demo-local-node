const request = require('supertest');
const express = require('express');

// Mock dependencies
const mockCreateTask = jest.fn();
const mockGetAllTasks = jest.fn();
const mockGetTaskById = jest.fn();
const mockUpdateTask = jest.fn();
const mockDeleteTask = jest.fn();

jest.mock('../../src/services/taskService', () => ({
    createTask: mockCreateTask,
    getAllTasks: mockGetAllTasks,
    getTaskById: mockGetTaskById,
    updateTask: mockUpdateTask,
    deleteTask: mockDeleteTask,
}));

jest.mock('../../src/utils/logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
}));

const logger = require('../../src/utils/logger');
const tasksRouter = require('../../src/routes/tasks');

describe('Tasks Routes', () => {
    let app;

    beforeEach(() => {
        jest.clearAllMocks();
        mockCreateTask.mockReset();
        mockGetAllTasks.mockReset();
        mockGetTaskById.mockReset();
        mockUpdateTask.mockReset();
        mockDeleteTask.mockReset();

        // Create a fresh Express app for each test
        app = express();
        app.use(express.json());
        app.use('/tasks', tasksRouter);
    });

    describe('POST /tasks', () => {
        it('should create a task with valid data and return 201', async () => {
            const requestData = {
                title: 'Test Task',
                description: 'Test Description',
                status: 'pending',
            };

            const createdTask = {
                id: '123e4567-e89b-12d3-a456-426614174000',
                title: 'Test Task',
                description: 'Test Description',
                status: 'pending',
                created_at: new Date(),
                updated_at: new Date(),
            };

            mockCreateTask.mockResolvedValue(createdTask);

            const response = await request(app)
                .post('/tasks')
                .send(requestData)
                .expect(201)
                .expect('Content-Type', /json/);

            expect(response.body).toEqual(expect.objectContaining({
                id: createdTask.id,
                title: 'Test Task',
                description: 'Test Description',
                status: 'pending',
            }));

            expect(mockCreateTask).toHaveBeenCalledWith(requestData);
            expect(logger.info).toHaveBeenCalledWith(
                'Task created via API',
                { taskId: createdTask.id }
            );
        });

        it('should create a task with only title and return 201', async () => {
            const requestData = { title: 'Test Task' };

            const createdTask = {
                id: '123e4567-e89b-12d3-a456-426614174001',
                title: 'Test Task',
                description: null,
                status: 'pending',
                created_at: new Date(),
                updated_at: new Date(),
            };

            mockCreateTask.mockResolvedValue(createdTask);

            const response = await request(app)
                .post('/tasks')
                .send(requestData)
                .expect(201);

            expect(response.body.title).toBe('Test Task');
            expect(mockCreateTask).toHaveBeenCalledWith(requestData);
        });

        it('should return 400 when title is missing', async () => {
            const requestData = { description: 'Test Description' };

            const response = await request(app)
                .post('/tasks')
                .send(requestData)
                .expect(400)
                .expect('Content-Type', /json/);

            expect(response.body).toEqual({
                error: 'Validation failed',
                details: expect.arrayContaining(['Title is required']),
            });

            expect(mockCreateTask).not.toHaveBeenCalled();
            expect(logger.warn).toHaveBeenCalledWith(
                'Task creation validation failed',
                expect.objectContaining({
                    errors: expect.arrayContaining(['Title is required']),
                })
            );
        });

        it('should return 400 when title is empty', async () => {
            const requestData = { title: '   ' };

            const response = await request(app)
                .post('/tasks')
                .send(requestData)
                .expect(400);

            expect(response.body).toEqual({
                error: 'Validation failed',
                details: expect.arrayContaining(['Title cannot be empty']),
            });

            expect(mockCreateTask).not.toHaveBeenCalled();
        });

        it('should return 400 when title is not a string', async () => {
            const requestData = { title: 123 };

            const response = await request(app)
                .post('/tasks')
                .send(requestData)
                .expect(400);

            expect(response.body.error).toBe('Validation failed');
            expect(response.body.details).toContain('Title must be a string');
        });

        it('should return 500 when database error occurs', async () => {
            const requestData = { title: 'Test Task' };
            const error = new Error('Database connection failed');

            mockCreateTask.mockRejectedValue(error);

            const response = await request(app)
                .post('/tasks')
                .send(requestData)
                .expect(500);

            expect(response.body).toEqual({
                error: 'Internal server error',
                message: 'Database connection failed',
            });

            expect(logger.error).toHaveBeenCalledWith(
                'Error creating task via API',
                error
            );
        });
    });

    describe('GET /tasks', () => {
        it('should retrieve all tasks and return 200', async () => {
            const tasks = [
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

            mockGetAllTasks.mockResolvedValue(tasks);

            const response = await request(app)
                .get('/tasks')
                .expect(200)
                .expect('Content-Type', /json/);

            expect(response.body).toHaveLength(2);
            expect(response.body[0].title).toBe('Task 1');
            expect(response.body[1].title).toBe('Task 2');

            expect(mockGetAllTasks).toHaveBeenCalled();
            expect(logger.info).toHaveBeenCalledWith(
                'Tasks retrieved via API',
                { count: 2 }
            );
        });

        it('should return empty array when no tasks exist', async () => {
            mockGetAllTasks.mockResolvedValue([]);

            const response = await request(app)
                .get('/tasks')
                .expect(200);

            expect(response.body).toEqual([]);
            expect(logger.info).toHaveBeenCalledWith(
                'Tasks retrieved via API',
                { count: 0 }
            );
        });

        it('should return 500 when database error occurs', async () => {
            const error = new Error('Database error');
            mockGetAllTasks.mockRejectedValue(error);

            const response = await request(app)
                .get('/tasks')
                .expect(500);

            expect(response.body).toEqual({
                error: 'Internal server error',
                message: 'Database error',
            });

            expect(logger.error).toHaveBeenCalledWith(
                'Error retrieving tasks via API',
                error
            );
        });
    });

    describe('GET /tasks/:id', () => {
        it('should retrieve a task by id and return 200', async () => {
            const task = {
                id: '123e4567-e89b-12d3-a456-426614174000',
                title: 'Test Task',
                description: 'Test Description',
                status: 'pending',
                created_at: new Date(),
                updated_at: new Date(),
            };

            mockGetTaskById.mockResolvedValue(task);

            const response = await request(app)
                .get('/tasks/123e4567-e89b-12d3-a456-426614174000')
                .expect(200)
                .expect('Content-Type', /json/);

            expect(response.body).toEqual(expect.objectContaining({
                id: task.id,
                title: 'Test Task',
            }));

            expect(mockGetTaskById).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174000');
            expect(logger.info).toHaveBeenCalledWith(
                'Task retrieved via API',
                { taskId: task.id }
            );
        });

        it('should return 404 when task is not found', async () => {
            mockGetTaskById.mockResolvedValue(null);

            const response = await request(app)
                .get('/tasks/non-existent-id')
                .expect(404);

            expect(response.body).toEqual({
                error: 'Task not found',
                message: 'Task with id non-existent-id does not exist',
            });

            expect(logger.info).toHaveBeenCalledWith(
                'Task not found via API',
                { taskId: 'non-existent-id' }
            );
        });

        it('should return 500 when database error occurs', async () => {
            const error = new Error('Database error');
            mockGetTaskById.mockRejectedValue(error);

            const response = await request(app)
                .get('/tasks/some-id')
                .expect(500);

            expect(response.body).toEqual({
                error: 'Internal server error',
                message: 'Database error',
            });

            expect(logger.error).toHaveBeenCalledWith(
                'Error retrieving task via API',
                error,
                { taskId: 'some-id' }
            );
        });
    });

    describe('PUT /tasks/:id', () => {
        it('should update a task and return 200', async () => {
            const updateData = {
                title: 'Updated Title',
                description: 'Updated Description',
                status: 'completed',
            };

            const updatedTask = {
                id: '123e4567-e89b-12d3-a456-426614174000',
                title: 'Updated Title',
                description: 'Updated Description',
                status: 'completed',
                created_at: new Date(),
                updated_at: new Date(),
            };

            mockUpdateTask.mockResolvedValue(updatedTask);

            const response = await request(app)
                .put('/tasks/123e4567-e89b-12d3-a456-426614174000')
                .send(updateData)
                .expect(200)
                .expect('Content-Type', /json/);

            expect(response.body).toEqual(expect.objectContaining({
                title: 'Updated Title',
                description: 'Updated Description',
                status: 'completed',
            }));

            expect(mockUpdateTask).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174000', updateData);
            expect(logger.info).toHaveBeenCalledWith(
                'Task updated via API',
                { taskId: updatedTask.id }
            );
        });

        it('should update only title and return 200', async () => {
            const updateData = { title: 'Updated Title' };

            const updatedTask = {
                id: '123e4567-e89b-12d3-a456-426614174000',
                title: 'Updated Title',
                description: 'Original Description',
                status: 'pending',
                created_at: new Date(),
                updated_at: new Date(),
            };

            mockUpdateTask.mockResolvedValue(updatedTask);

            await request(app)
                .put('/tasks/123e4567-e89b-12d3-a456-426614174000')
                .send(updateData)
                .expect(200);

            expect(mockUpdateTask).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174000', updateData);
        });

        it('should return 400 when validation fails', async () => {
            const updateData = { title: '   ' };

            const response = await request(app)
                .put('/tasks/some-id')
                .send(updateData)
                .expect(400);

            expect(response.body).toEqual({
                error: 'Validation failed',
                details: expect.arrayContaining(['Title cannot be empty']),
            });

            expect(mockUpdateTask).not.toHaveBeenCalled();
        });

        it('should return 404 when task is not found', async () => {
            mockUpdateTask.mockResolvedValue(null);

            const response = await request(app)
                .put('/tasks/non-existent-id')
                .send({ title: 'Updated Title' })
                .expect(404);

            expect(response.body).toEqual({
                error: 'Task not found',
                message: 'Task with id non-existent-id does not exist',
            });

            expect(logger.info).toHaveBeenCalledWith(
                'Task not found for update via API',
                { taskId: 'non-existent-id' }
            );
        });

        it('should return 500 when database error occurs', async () => {
            const error = new Error('Database error');
            mockUpdateTask.mockRejectedValue(error);

            const response = await request(app)
                .put('/tasks/some-id')
                .send({ title: 'Updated Title' })
                .expect(500);

            expect(response.body).toEqual({
                error: 'Internal server error',
                message: 'Database error',
            });

            expect(logger.error).toHaveBeenCalledWith(
                'Error updating task via API',
                error,
                { taskId: 'some-id' }
            );
        });
    });

    describe('DELETE /tasks/:id', () => {
        it('should delete a task and return 204', async () => {
            mockDeleteTask.mockResolvedValue(true);

            const response = await request(app)
                .delete('/tasks/123e4567-e89b-12d3-a456-426614174000')
                .expect(204);

            expect(response.body).toEqual({});

            expect(mockDeleteTask).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174000');
            expect(logger.info).toHaveBeenCalledWith(
                'Task deleted via API',
                { taskId: '123e4567-e89b-12d3-a456-426614174000' }
            );
        });

        it('should return 404 when task is not found', async () => {
            mockDeleteTask.mockResolvedValue(false);

            const response = await request(app)
                .delete('/tasks/non-existent-id')
                .expect(404);

            expect(response.body).toEqual({
                error: 'Task not found',
                message: 'Task with id non-existent-id does not exist',
            });

            expect(logger.info).toHaveBeenCalledWith(
                'Task not found for deletion via API',
                { taskId: 'non-existent-id' }
            );
        });

        it('should return 500 when database error occurs', async () => {
            const error = new Error('Database error');
            mockDeleteTask.mockRejectedValue(error);

            const response = await request(app)
                .delete('/tasks/some-id')
                .expect(500);

            expect(response.body).toEqual({
                error: 'Internal server error',
                message: 'Database error',
            });

            expect(logger.error).toHaveBeenCalledWith(
                'Error deleting task via API',
                error,
                { taskId: 'some-id' }
            );
        });
    });
});
