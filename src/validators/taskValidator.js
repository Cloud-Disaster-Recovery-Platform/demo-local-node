/**
 * Task Validator Module
 * Provides validation functions for task creation and updates
 */

/**
 * Validate task creation data
 * @param {Object} data - Task data to validate
 * @returns {Object} Validation result with isValid boolean and errors array
 */
function validateTaskCreate(data) {
    const errors = [];

    // Check if data exists
    if (!data || typeof data !== 'object') {
        errors.push('Request body must be a valid object');
        return { isValid: false, errors };
    }

    // Validate title - required, non-empty string
    if (!data.title) {
        errors.push('Title is required');
    } else if (typeof data.title !== 'string') {
        errors.push('Title must be a string');
    } else if (data.title.trim().length === 0) {
        errors.push('Title cannot be empty');
    }

    // Validate description - optional, but if provided must be a string
    if (data.description !== undefined && data.description !== null) {
        if (typeof data.description !== 'string') {
            errors.push('Description must be a string');
        }
    }

    // Validate status - optional, but if provided must be a string
    if (data.status !== undefined && data.status !== null) {
        if (typeof data.status !== 'string') {
            errors.push('Status must be a string');
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
}

/**
 * Validate task update data
 * @param {Object} data - Task data to validate
 * @returns {Object} Validation result with isValid boolean and errors array
 */
function validateTaskUpdate(data) {
    const errors = [];

    // Check if data exists
    if (!data || typeof data !== 'object') {
        errors.push('Request body must be a valid object');
        return { isValid: false, errors };
    }

    // For updates, all fields are optional
    // But if provided, they must be valid

    // Validate title - optional, but if provided must be non-empty string
    if (data.title !== undefined && data.title !== null) {
        if (typeof data.title !== 'string') {
            errors.push('Title must be a string');
        } else if (data.title.trim().length === 0) {
            errors.push('Title cannot be empty');
        }
    }

    // Validate description - optional, but if provided must be a string
    if (data.description !== undefined && data.description !== null) {
        if (typeof data.description !== 'string') {
            errors.push('Description must be a string');
        }
    }

    // Validate status - optional, but if provided must be a string
    if (data.status !== undefined && data.status !== null) {
        if (typeof data.status !== 'string') {
            errors.push('Status must be a string');
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
}

module.exports = {
    validateTaskCreate,
    validateTaskUpdate,
};
