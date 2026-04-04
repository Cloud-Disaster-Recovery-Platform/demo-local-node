const { randomUUID } = require('crypto');
const dbClient = require('../db/client');
const logger = require('../utils/logger');

/**
 * Task Service
 * Business logic layer for task management operations
 */

/**
 * Create a new task
 * @param {Object} taskData - Task data (title, description, status)
 * @returns {Promise<Object>} Created task with id, timestamps
 */
async function createTask(taskData) {
    try {
        const id = randomUUID();
        const title = taskData.title;
        const description = taskData.description || null;
        const status = taskData.status || 'pending';
        const created_at = new Date();
        const updated_at = new Date();

        const query = `
            INSERT INTO tasks (id, title, description, status, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;

        const values = [id, title, description, status, created_at, updated_at];
        const result = await dbClient.query(query, values);

        logger.info('Task created', { taskId: id, title });

        return result.rows[0];
    } catch (error) {
        logger.error('Failed to create task', error, { taskData });
        throw error;
    }
}

/**
 * Get all tasks
 * @returns {Promise<Array>} Array of all tasks
 */
async function getAllTasks() {
    try {
        const query = 'SELECT * FROM tasks ORDER BY created_at DESC';
        const result = await dbClient.query(query);

        logger.info('Retrieved all tasks', { count: result.rows.length });

        return result.rows;
    } catch (error) {
        logger.error('Failed to retrieve tasks', error);
        throw error;
    }
}

/**
 * Get a task by ID
 * @param {string} id - Task UUID
 * @returns {Promise<Object|null>} Task object or null if not found
 */
async function getTaskById(id) {
    try {
        const query = 'SELECT * FROM tasks WHERE id = $1';
        const result = await dbClient.query(query, [id]);

        if (result.rows.length === 0) {
            logger.info('Task not found', { taskId: id });
            return null;
        }

        logger.info('Task retrieved', { taskId: id });

        return result.rows[0];
    } catch (error) {
        logger.error('Failed to retrieve task', error, { taskId: id });
        throw error;
    }
}

/**
 * Update a task
 * @param {string} id - Task UUID
 * @param {Object} updates - Fields to update (title, description, status)
 * @returns {Promise<Object|null>} Updated task or null if not found
 */
async function updateTask(id, updates) {
    try {
        // Build dynamic update query based on provided fields
        const fields = [];
        const values = [];
        let paramIndex = 1;

        if (updates.title !== undefined) {
            fields.push(`title = $${paramIndex++}`);
            values.push(updates.title);
        }

        if (updates.description !== undefined) {
            fields.push(`description = $${paramIndex++}`);
            values.push(updates.description);
        }

        if (updates.status !== undefined) {
            fields.push(`status = $${paramIndex++}`);
            values.push(updates.status);
        }

        // Always update the updated_at timestamp
        fields.push(`updated_at = $${paramIndex++}`);
        values.push(new Date());

        // Add the id as the last parameter
        values.push(id);

        const query = `
            UPDATE tasks
            SET ${fields.join(', ')}
            WHERE id = $${paramIndex}
            RETURNING *
        `;

        const result = await dbClient.query(query, values);

        if (result.rows.length === 0) {
            logger.info('Task not found for update', { taskId: id });
            return null;
        }

        logger.info('Task updated', { taskId: id, updates });

        return result.rows[0];
    } catch (error) {
        logger.error('Failed to update task', error, { taskId: id, updates });
        throw error;
    }
}

/**
 * Delete a task
 * @param {string} id - Task UUID
 * @returns {Promise<boolean>} True if deleted, false if not found
 */
async function deleteTask(id) {
    try {
        const query = 'DELETE FROM tasks WHERE id = $1 RETURNING id';
        const result = await dbClient.query(query, [id]);

        if (result.rows.length === 0) {
            logger.info('Task not found for deletion', { taskId: id });
            return false;
        }

        logger.info('Task deleted', { taskId: id });

        return true;
    } catch (error) {
        logger.error('Failed to delete task', error, { taskId: id });
        throw error;
    }
}

module.exports = {
    createTask,
    getAllTasks,
    getTaskById,
    updateTask,
    deleteTask,
};
