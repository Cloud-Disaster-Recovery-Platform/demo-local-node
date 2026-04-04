const { validateTaskCreate, validateTaskUpdate } = require('../../src/validators/taskValidator');

describe('TaskValidator', () => {
    describe('validateTaskCreate()', () => {
        it('should validate a valid task with all fields', () => {
            const data = {
                title: 'Test Task',
                description: 'Test Description',
                status: 'pending',
            };

            const result = validateTaskCreate(data);

            expect(result.isValid).toBe(true);
            expect(result.errors).toEqual([]);
        });

        it('should validate a valid task with only title', () => {
            const data = {
                title: 'Test Task',
            };

            const result = validateTaskCreate(data);

            expect(result.isValid).toBe(true);
            expect(result.errors).toEqual([]);
        });

        it('should reject task without title', () => {
            const data = {
                description: 'Test Description',
            };

            const result = validateTaskCreate(data);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Title is required');
        });

        it('should reject task with empty title', () => {
            const data = {
                title: '   ',
            };

            const result = validateTaskCreate(data);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Title cannot be empty');
        });

        it('should reject task with non-string title', () => {
            const data = {
                title: 123,
            };

            const result = validateTaskCreate(data);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Title must be a string');
        });

        it('should reject task with non-string description', () => {
            const data = {
                title: 'Test Task',
                description: 123,
            };

            const result = validateTaskCreate(data);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Description must be a string');
        });

        it('should reject task with non-string status', () => {
            const data = {
                title: 'Test Task',
                status: 123,
            };

            const result = validateTaskCreate(data);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Status must be a string');
        });

        it('should reject null data', () => {
            const result = validateTaskCreate(null);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Request body must be a valid object');
        });

        it('should reject undefined data', () => {
            const result = validateTaskCreate(undefined);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Request body must be a valid object');
        });

        it('should accept null description', () => {
            const data = {
                title: 'Test Task',
                description: null,
            };

            const result = validateTaskCreate(data);

            expect(result.isValid).toBe(true);
            expect(result.errors).toEqual([]);
        });

        it('should collect multiple validation errors', () => {
            const data = {
                title: 123,
                description: 456,
                status: 789,
            };

            const result = validateTaskCreate(data);

            expect(result.isValid).toBe(false);
            expect(result.errors).toHaveLength(3);
            expect(result.errors).toContain('Title must be a string');
            expect(result.errors).toContain('Description must be a string');
            expect(result.errors).toContain('Status must be a string');
        });
    });

    describe('validateTaskUpdate()', () => {
        it('should validate a valid update with all fields', () => {
            const data = {
                title: 'Updated Task',
                description: 'Updated Description',
                status: 'completed',
            };

            const result = validateTaskUpdate(data);

            expect(result.isValid).toBe(true);
            expect(result.errors).toEqual([]);
        });

        it('should validate update with only title', () => {
            const data = {
                title: 'Updated Task',
            };

            const result = validateTaskUpdate(data);

            expect(result.isValid).toBe(true);
            expect(result.errors).toEqual([]);
        });

        it('should validate update with only description', () => {
            const data = {
                description: 'Updated Description',
            };

            const result = validateTaskUpdate(data);

            expect(result.isValid).toBe(true);
            expect(result.errors).toEqual([]);
        });

        it('should validate update with only status', () => {
            const data = {
                status: 'in_progress',
            };

            const result = validateTaskUpdate(data);

            expect(result.isValid).toBe(true);
            expect(result.errors).toEqual([]);
        });

        it('should validate empty update object', () => {
            const data = {};

            const result = validateTaskUpdate(data);

            expect(result.isValid).toBe(true);
            expect(result.errors).toEqual([]);
        });

        it('should reject update with empty title', () => {
            const data = {
                title: '   ',
            };

            const result = validateTaskUpdate(data);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Title cannot be empty');
        });

        it('should reject update with non-string title', () => {
            const data = {
                title: 123,
            };

            const result = validateTaskUpdate(data);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Title must be a string');
        });

        it('should reject update with non-string description', () => {
            const data = {
                description: 123,
            };

            const result = validateTaskUpdate(data);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Description must be a string');
        });

        it('should reject update with non-string status', () => {
            const data = {
                status: 123,
            };

            const result = validateTaskUpdate(data);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Status must be a string');
        });

        it('should reject null data', () => {
            const result = validateTaskUpdate(null);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Request body must be a valid object');
        });

        it('should reject undefined data', () => {
            const result = validateTaskUpdate(undefined);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Request body must be a valid object');
        });

        it('should accept null values for optional fields', () => {
            const data = {
                title: 'Updated Task',
                description: null,
                status: null,
            };

            const result = validateTaskUpdate(data);

            expect(result.isValid).toBe(true);
            expect(result.errors).toEqual([]);
        });

        it('should collect multiple validation errors', () => {
            const data = {
                title: 123,
                description: 456,
                status: 789,
            };

            const result = validateTaskUpdate(data);

            expect(result.isValid).toBe(false);
            expect(result.errors).toHaveLength(3);
            expect(result.errors).toContain('Title must be a string');
            expect(result.errors).toContain('Description must be a string');
            expect(result.errors).toContain('Status must be a string');
        });
    });
});
