const express = require('express');
const router = express.Router();
const taskService = require('../services/taskService');
const { validateTaskCreate, validateTaskUpdate } = require('../validators/taskValidator');
const logger = require('../utils/logger');

/**
 * POST /tasks
 * Create a new task
 */
router.post('/', async (req, res) => {
    try {
        // Validate request body
        const validation = validateTaskCreate(req.body);
        
        if (!validation.isValid) {
            logger.warn('Task creation validation failed', { errors: validation.errors });
            return res.status(400).json({
                error: 'Validation failed',
                details: validation.errors,
            });
        }

        // Create task
        const task = await taskService.createTask(req.body);

        logger.info('Task created via API', { taskId: task.id });

        return res.status(201).json(task);
    } catch (error) {
        logger.error('Error creating task via API', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: error.message,
        });
    }
});

/**
 * GET /tasks
 * Retrieve all tasks
 */
router.get('/', async (req, res) => {
    try {
        const tasks = await taskService.getAllTasks();

        logger.info('Tasks retrieved via API', { count: tasks.length });

        return res.status(200).json(tasks);
    } catch (error) {
        logger.error('Error retrieving tasks via API', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: error.message,
        });
    }
});

/**
 * GET /tasks/:id
 * Retrieve a specific task by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const task = await taskService.getTaskById(id);

        if (!task) {
            logger.info('Task not found via API', { taskId: id });
            return res.status(404).json({
                error: 'Task not found',
                message: `Task with id ${id} does not exist`,
            });
        }

        logger.info('Task retrieved via API', { taskId: id });

        return res.status(200).json(task);
    } catch (error) {
        logger.error('Error retrieving task via API', error, { taskId: req.params.id });
        return res.status(500).json({
            error: 'Internal server error',
            message: error.message,
        });
    }
});

/**
 * PUT /tasks/:id
 * Update an existing task
 */
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Validate request body
        const validation = validateTaskUpdate(req.body);
        
        if (!validation.isValid) {
            logger.warn('Task update validation failed', { taskId: id, errors: validation.errors });
            return res.status(400).json({
                error: 'Validation failed',
                details: validation.errors,
            });
        }

        // Update task
        const task = await taskService.updateTask(id, req.body);

        if (!task) {
            logger.info('Task not found for update via API', { taskId: id });
            return res.status(404).json({
                error: 'Task not found',
                message: `Task with id ${id} does not exist`,
            });
        }

        logger.info('Task updated via API', { taskId: id });

        return res.status(200).json(task);
    } catch (error) {
        logger.error('Error updating task via API', error, { taskId: req.params.id });
        return res.status(500).json({
            error: 'Internal server error',
            message: error.message,
        });
    }
});

/**
 * DELETE /tasks/:id
 * Delete a task
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await taskService.deleteTask(id);

        if (!deleted) {
            logger.info('Task not found for deletion via API', { taskId: id });
            return res.status(404).json({
                error: 'Task not found',
                message: `Task with id ${id} does not exist`,
            });
        }

        logger.info('Task deleted via API', { taskId: id });

        return res.status(204).send();
    } catch (error) {
        logger.error('Error deleting task via API', error, { taskId: req.params.id });
        return res.status(500).json({
            error: 'Internal server error',
            message: error.message,
        });
    }
});

module.exports = router;
