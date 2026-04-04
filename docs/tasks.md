# Implementation Plan: Local Node.js Demo Application

## Overview

This plan implements a Node.js Express.js API with PostgreSQL database, health monitoring, and Docker support. The implementation follows a three-tier architecture with HTTP layer, business logic, and data layer. Tasks are organized to build incrementally, with property-based tests using fast-check to validate correctness properties throughout.

## Tasks

- [x] 1. Set up project structure and dependencies
  - Create package.json with Express, pg (PostgreSQL client), and fast-check dependencies
  - Create directory structure: src/, src/routes/, src/services/, src/db/, src/config/, src/utils/, src/validators/, tests/unit/, tests/property/, tests/integration/
  - Set up .gitignore for node_modules and environment files
  - Create .env.example with configuration template
  - _Requirements: 7.1, 10.1_

- [x] 2. Implement configuration management
  - [x] 2.1 Create configuration loader (src/config/index.js)
    - Load environment variables with defaults for optional values
    - Export typed configuration object with port, database settings, shutdown timeout
    - _Requirements: 7.1, 7.2_
  
  - [x] 2.2 Implement configuration logging
    - Log all configuration values at startup excluding DB_PASSWORD
    - Log warning if DB_PASSWORD is not set
    - _Requirements: 7.3, 7.4_
  
  - [ ]*
 2.3 Write property tests for configuration loading
    - **Property 10: Configuration Loading with Defaults**
    - **Property 11: Configuration Logging Excludes Password**
    - **Validates: Requirements 7.1, 7.2, 7.4**

- [x] 3. Implement structured logging utility
  - [x] 3.1 Create logger module (src/utils/logger.js)
    - Implement log functions with timestamp, level (INFO, WARN, ERROR), and message
    - Format log entries consistently
    - _Requirements: 9.1_
  
  - [x] 3.2 Add request logging middleware
    - Log HTTP requests with method, path, status code, and response time
    - _Requirements: 1.2, 9.4_
  
  - [ ]*
 3.3 Write property tests for logging
    - **Property 12: Request Logging Completeness**
    - **Property 13: Database Operation Logging**
    - **Property 14: Error Logging Includes Stack Trace**
    - **Property 15: Log Entry Format**
    - **Validates: Requirements 9.1, 9.2, 9.3, 9.4**

- [x] 4. Implement database client with connection pooling
  - [x] 4.1 Create database client (src/db/client.js)
    - Initialize PostgreSQL connection pool with min 2, max 10 connections
    - Implement connect() method with connectivity verification
    - Implement query() method with retry logic (3 attempts, exponential backoff)
    - Implement healthCheck() method for database connectivity testing
    - Log database operations with execution time
    - _Requirements: 3.1, 3.2, 3.3, 3.5, 9.2_
  
  - [x] 4.2 Implement schema initialization
    - Create initializeSchema() method to check and create tasks table
    - Create table with columns: id (UUID), title, description, status, created_at, updated_at
    - Create index on status column
    - Exit with code 1 if schema creation fails
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  
  - [x] 4.3 Implement disconnect() method
    - Close all connections in the pool
    - Log connection closure
    - _Requirements: 8.3_
  
  - [ ]*
 4.4 Write property tests for database resilience
    - **Property 16: Health Check Response Time**
    - **Property 17: Query Retry with Exponential Backoff**
    - **Validates: Requirements 2.4, 3.5**

- [x] 5. Checkpoint - Ensure database client tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Implement task validation
  - [ ] 6.1 Create task validator (src/validators/taskValidator.js)
    - Implement validateTaskCreate() to check for non-empty title string
    - Implement validateTaskUpdate() to validate optional fields
    - Return validation result with errors array
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  
  - [ ]*
 6.2 Write property tests for validation
    - **Property 6: Invalid JSON Rejected**
    - **Property 7: Required Field Validation**
    - **Property 8: Optional Fields Use Defaults**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5**

- [ ] 7. Implement task service layer
  - [ ] 7.1 Create task service (src/services/taskService.js)
    - Implement createTask() with UUID generation and timestamp setting
    - Implement getAllTasks() to retrieve all tasks from database
    - Implement getTaskById() to retrieve specific task
    - Implement updateTask() to update task and set updated_at timestamp
    - Implement deleteTask() to remove task from database
    - Use default status 'pending' for new tasks
    - _Requirements: 4.1, 4.2, 4.3, 4.5, 4.6_
  
  - [ ]*
 7.2 Write property tests for task CRUD operations
    - **Property 1: Task Creation Round Trip**
    - **Property 2: Task List Completeness**
    - **Property 3: Task Update Persistence**
    - **Property 4: Task Deletion Removes Task**
    - **Property 5: Non-Existent Task Returns 404**
    - **Property 9: Database Errors Return 500**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7**

- [ ] 8. Implement health endpoint
  - [ ] 8.1 Create health route handler (src/routes/health.js)
    - Implement GET /health endpoint
    - Execute database health check with 5 second timeout
    - Return 200 with {"status": "healthy", "database": "connected"} on success
    - Return 503 with {"status": "unhealthy", "database": "disconnected"} on failure
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  
  - [ ]*
 8.2 Write unit tests for health endpoint
    - Test healthy database response
    - Test unhealthy database response
    - Test timeout behavior
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [ ] 9. Implement task management endpoints
  - [ ] 9.1 Create task route handlers (src/routes/tasks.js)
    - Implement POST /tasks with validation and task creation
    - Implement GET /tasks to retrieve all tasks
    - Implement GET /tasks/:id to retrieve specific task
    - Implement PUT /tasks/:id with validation and task update
    - Implement DELETE /tasks/:id to delete task
    - Return appropriate status codes (201, 200, 204, 400, 404, 500)
    - Return error responses with consistent JSON format
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 6.2, 6.4_
  
  - [ ]*
 9.2 Write unit tests for task endpoints
    - Test successful task creation with specific data
    - Test task retrieval scenarios
    - Test task update scenarios
    - Test task deletion
    - Test error conditions (invalid JSON, missing fields, non-existent task)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

- [ ] 10. Checkpoint - Ensure route handler tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Implement Express server with graceful shutdown
  - [ ] 11.1 Create server module (src/server.js)
    - Initialize Express app with JSON parsing middleware
    - Register request logging middleware
    - Mount health and task routes
    - Start HTTP server on configured port
    - Log server startup with listening port
    - Handle port-in-use error and exit with code 1
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  
  - [ ] 11.2 Implement graceful shutdown handling
    - Listen for SIGTERM and SIGINT signals
    - Stop accepting new connections on shutdown signal
    - Wait up to 10 seconds for in-flight requests to complete
    - Close database connections after requests complete or timeout
    - Log "Shutting down gracefully" and "Shutdown complete"
    - Force exit with code 0 if timeout expires
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
  
  - [ ]*
 11.3 Write property tests for graceful shutdown
    - **Property 18: Graceful Shutdown Stops New Connections**
    - **Property 19: Graceful Shutdown Waits for In-Flight Requests**
    - **Property 20: Shutdown Closes Database Connections**
    - **Validates: Requirements 8.1, 8.2, 8.3**

- [ ] 12. Create application entry point
  - [ ] 12.1 Create main entry point (src/index.js)
    - Load configuration and log startup values
    - Initialize database client and connect
    - Initialize schema on startup
    - Start Express server
    - Handle startup errors (database connection, schema init) and exit with code 1
    - _Requirements: 3.3, 3.4, 5.1, 7.4_
  
  - [ ]*
 12.2 Write unit tests for application startup
    - Test successful startup sequence
    - Test database connection failure at startup
    - Test schema initialization failure
    - Test port already in use error
    - _Requirements: 1.4, 3.3, 3.4, 5.4_

- [ ] 13. Checkpoint - Ensure application starts successfully
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 14. Add Docker support
  - [ ] 14.1 Create Dockerfile
    - Use Node.js LTS base image
    - Copy package files and install dependencies
    - Copy application source code
    - Run application as non-root user
    - Expose configured port
    - _Requirements: 10.1, 10.2, 10.3_
  
  - [ ] 14.2 Create docker-compose.yml
    - Define PostgreSQL service with health check
    - Define application service with dependency on PostgreSQL
    - Configure environment variables for database connection
    - Ensure application waits for PostgreSQL to be ready
    - _Requirements: 10.4, 10.5_
  
  - [ ] 14.3 Create .dockerignore
    - Exclude node_modules, .env, and test files from Docker build
    - _Requirements: 10.1_
  
  - [ ]*
 14.4 Write integration tests for Docker
    - Test Dockerfile builds successfully
    - Test docker-compose starts both services
    - Test application connects to PostgreSQL in Docker
    - _Requirements: 10.1, 10.4, 10.5_

- [ ] 15. Create documentation and scripts
  - [ ] 15.1 Create README.md
    - Document application purpose and architecture
    - Provide setup instructions (local and Docker)
    - Document API endpoints with examples
    - Document environment variables
    - Include testing instructions
  
  - [ ] 15.2 Add npm scripts to package.json
    - Add "start" script to run application
    - Add "dev" script with nodemon for development
    - Add "test" script to run all tests
    - Add "test:unit" script for unit tests only
    - Add "test:property" script for property tests only
    - Add "test:integration" script for integration tests only

- [ ] 16. Final checkpoint - Run all tests and verify Docker deployment
  - Run all unit tests, property tests, and integration tests
  - Build Docker image and verify it runs successfully
  - Start application with docker-compose and verify health endpoint
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property-based tests use fast-check library with minimum 100 iterations
- All property tests are tagged with property number and requirements validation
- Checkpoints ensure incremental validation throughout implementation
- Database operations include retry logic with exponential backoff
- Graceful shutdown ensures in-flight requests complete before termination
