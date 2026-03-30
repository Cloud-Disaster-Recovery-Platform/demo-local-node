# Requirements Document

## Introduction

This document specifies requirements for a local Node.js demo application that serves as a test bed for the Cloud Mirror infrastructure. The application provides a simple but realistic service with PostgreSQL database operations, health monitoring, and API endpoints that can demonstrate failover capabilities when integrated with Cloud Mirror's state synchronization and backup systems.

## Glossary

- **Demo_Application**: The Node.js web service that provides API endpoints and database operations
- **Health_Endpoint**: An HTTP endpoint that reports the operational status of the Demo_Application
- **Database_Client**: The PostgreSQL client component within the Demo_Application
- **API_Server**: The HTTP server component that handles incoming requests
- **Task**: A data entity representing a work item with properties (id, title, description, status, timestamps)
- **Connection_Pool**: The PostgreSQL connection pool managed by the Database_Client

## Requirements

### Requirement 1: HTTP Server

**User Story:** As a developer, I want an HTTP server with RESTful endpoints, so that I can interact with the application and test failover scenarios.

#### Acceptance Criteria

1. THE API_Server SHALL listen on a configurable port (default 3000)
2. WHEN a request is received, THE API_Server SHALL log the request method and path
3. WHEN the API_Server starts successfully, THE API_Server SHALL log the listening port
4. IF the port is already in use, THEN THE API_Server SHALL log an error and exit with code 1

### Requirement 2: Health Monitoring

**User Story:** As a Cloud Mirror operator, I want a health endpoint that reports database connectivity, so that the failover system can detect failures.

#### Acceptance Criteria

1. THE Health_Endpoint SHALL respond to GET requests at path /health
2. WHEN the Database_Client can execute a query, THE Health_Endpoint SHALL return HTTP status 200 with body {"status": "healthy", "database": "connected"}
3. IF the Database_Client cannot execute a query, THEN THE Health_Endpoint SHALL return HTTP status 503 with body {"status": "unhealthy", "database": "disconnected"}
4. THE Health_Endpoint SHALL complete the health check within 5 seconds

### Requirement 3: Database Connection

**User Story:** As a developer, I want PostgreSQL database connectivity, so that the application can persist and retrieve data.

#### Acceptance Criteria

1. THE Database_Client SHALL connect to PostgreSQL using configuration from environment variables (host, port, database, user, password)
2. THE Database_Client SHALL use a Connection_Pool with minimum 2 and maximum 10 connections
3. WHEN the Demo_Application starts, THE Database_Client SHALL verify connectivity by executing a test query
4. IF the database connection fails at startup, THEN THE Demo_Application SHALL log an error and exit with code 1
5. THE Database_Client SHALL automatically retry failed queries up to 3 times with exponential backoff

### Requirement 4: Task Management API

**User Story:** As a developer, I want CRUD operations for tasks, so that I can generate database write operations for replication testing.

#### Acceptance Criteria

1. WHEN a POST request to /tasks with valid JSON body is received, THE API_Server SHALL create a Task and return HTTP status 201 with the created Task
2. WHEN a GET request to /tasks is received, THE API_Server SHALL return HTTP status 200 with an array of all Tasks
3. WHEN a GET request to /tasks/:id is received, THE API_Server SHALL return HTTP status 200 with the Task if it exists
4. IF a GET request to /tasks/:id references a non-existent Task, THEN THE API_Server SHALL return HTTP status 404
5. WHEN a PUT request to /tasks/:id with valid JSON body is received, THE API_Server SHALL update the Task and return HTTP status 200 with the updated Task
6. WHEN a DELETE request to /tasks/:id is received, THE API_Server SHALL delete the Task and return HTTP status 204
7. IF any Task operation encounters a database error, THEN THE API_Server SHALL return HTTP status 500 with an error message

### Requirement 5: Database Schema Management

**User Story:** As a developer, I want automatic database schema initialization, so that the application can set up its required tables on first run.

#### Acceptance Criteria

1. WHEN the Demo_Application starts, THE Database_Client SHALL check if the tasks table exists
2. IF the tasks table does not exist, THEN THE Database_Client SHALL create it with columns: id (UUID primary key), title (text), description (text), status (text), created_at (timestamp), updated_at (timestamp)
3. THE Database_Client SHALL create an index on the status column
4. IF schema creation fails, THEN THE Demo_Application SHALL log an error and exit with code 1

### Requirement 6: Request Validation

**User Story:** As a developer, I want input validation for API requests, so that invalid data is rejected before database operations.

#### Acceptance Criteria

1. WHEN a POST or PUT request to /tasks is received, THE API_Server SHALL validate that the request body is valid JSON
2. IF the request body is not valid JSON, THEN THE API_Server SHALL return HTTP status 400 with error message "Invalid JSON"
3. WHEN creating a Task, THE API_Server SHALL validate that title is a non-empty string
4. IF required fields are missing or invalid, THEN THE API_Server SHALL return HTTP status 400 with a descriptive error message
5. THE API_Server SHALL accept optional fields (description, status) and use default values if not provided

### Requirement 7: Configuration Management

**User Story:** As an operator, I want environment-based configuration, so that I can deploy the application in different environments without code changes.

#### Acceptance Criteria

1. THE Demo_Application SHALL read configuration from environment variables: PORT, DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
2. IF required database environment variables are not set, THEN THE Demo_Application SHALL use defaults: DB_HOST=localhost, DB_PORT=5432, DB_NAME=demo_app, DB_USER=postgres
3. IF DB_PASSWORD is not set, THEN THE Demo_Application SHALL log a warning and attempt connection without password
4. THE Demo_Application SHALL log all configuration values at startup (excluding DB_PASSWORD)

### Requirement 8: Graceful Shutdown

**User Story:** As an operator, I want graceful shutdown handling, so that in-flight requests complete before the application terminates.

#### Acceptance Criteria

1. WHEN the Demo_Application receives SIGTERM or SIGINT, THE API_Server SHALL stop accepting new connections
2. WHILE shutting down, THE API_Server SHALL wait up to 10 seconds for in-flight requests to complete
3. WHEN all requests complete or timeout expires, THE Database_Client SHALL close all connections in the Connection_Pool
4. THE Demo_Application SHALL log "Shutting down gracefully" when shutdown begins and "Shutdown complete" when finished
5. IF shutdown timeout expires, THEN THE Demo_Application SHALL force exit with code 0

### Requirement 9: Logging

**User Story:** As an operator, I want structured logging, so that I can monitor application behavior and troubleshoot issues.

#### Acceptance Criteria

1. THE Demo_Application SHALL log messages with timestamp, level (INFO, WARN, ERROR), and message
2. WHEN a database operation completes, THE Demo_Application SHALL log the operation type and execution time
3. WHEN an error occurs, THE Demo_Application SHALL log the error message and stack trace
4. THE Demo_Application SHALL log all HTTP requests with method, path, status code, and response time

### Requirement 10: Docker Support

**User Story:** As a developer, I want Docker containerization, so that I can run the application consistently across environments.

#### Acceptance Criteria

1. THE Demo_Application SHALL include a Dockerfile that builds a production-ready image
2. THE Dockerfile SHALL use a Node.js LTS base image
3. THE Dockerfile SHALL run the application as a non-root user
4. THE Demo_Application SHALL include a docker-compose.yml that starts both the application and PostgreSQL
5. WHEN started via docker-compose, THE Demo_Application SHALL wait for PostgreSQL to be ready before starting
