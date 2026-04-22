# Architecture Documentation

## Overview

This backend follows **Clean Architecture** principles, ensuring separation of concerns, testability, and maintainability.

## Layer Structure

### 1. Presentation Layer (Routes & Controllers)

**Routes** (`src/routes/`)
- Define API endpoints
- Apply middleware (auth, validation, rate limiting)
- Route requests to controllers

**Controllers** (`src/controllers/`)
- Handle HTTP requests/responses
- Extract data from requests
- Call service layer
- Format responses using utility functions
- **No business logic** - delegates to services

### 2. Business Logic Layer (Services)

**Services** (`src/services/`)
- Contain all business logic
- Interact with database via Prisma
- Handle transactions
- Validate business rules
- **No HTTP concerns** - pure business logic

### 3. Data Access Layer (Prisma)

**Prisma Schema** (`prisma/schema.prisma`)
- Defines database models
- Establishes relationships
- Type-safe database access

**Database Config** (`src/config/database.js`)
- Prisma client initialization
- Connection pooling
- Graceful shutdown handling

### 4. Infrastructure Layer

**Middleware** (`src/middleware/`)
- Authentication & authorization
- Error handling
- Request validation
- Rate limiting
- Security headers

**Utilities** (`src/utils/`)
- Custom error classes
- Response formatters
- Helper functions

**Validators** (`src/validators/`)
- Joi validation schemas
- Input sanitization

## Data Flow

```
Request → Middleware → Routes → Controllers → Services → Database
                                                      ↓
Response ← Controllers ← Services ← Database ← Prisma
```

## Key Principles

### 1. Separation of Concerns
- Each layer has a single responsibility
- Controllers don't contain business logic
- Services don't know about HTTP

### 2. Dependency Inversion
- High-level modules don't depend on low-level modules
- Both depend on abstractions (interfaces)

### 3. Single Responsibility
- Each module/function does one thing well
- Easy to test and maintain

### 4. DRY (Don't Repeat Yourself)
- Reusable middleware
- Shared utilities
- Common error handling

## Security Architecture

### Authentication Flow
1. User provides credentials
2. Service validates credentials
3. Service generates JWT token
4. Token stored in client
5. Subsequent requests include token
6. Middleware validates token
7. User attached to request

### Authorization Flow
1. Authenticated request arrives
2. Middleware extracts user roles/permissions
3. Permission check against required permissions
4. Access granted or denied

## Error Handling Architecture

### Error Types
- **AppError**: Base error class
- **ValidationError**: Input validation failures
- **AuthenticationError**: Auth failures
- **AuthorizationError**: Permission failures
- **NotFoundError**: Resource not found
- **ConflictError**: Resource conflicts
- **DatabaseError**: Database operation failures

### Error Flow
1. Error thrown in service/controller
2. Caught by `asyncHandler` wrapper
3. Passed to error handler middleware
4. Formatted and returned to client

## Database Architecture

### Relationships
- **One-to-Many**: User → LoginSessions
- **Many-to-Many**: User ↔ Roles, Role ↔ Permissions
- **One-to-One**: User ↔ UserAuth, Lead ↔ TripInfo

### Transactions
- Used for multi-step operations
- Ensures data consistency
- Rollback on failure

## Scalability Considerations

### Horizontal Scaling
- Stateless API design
- JWT tokens (no server-side sessions)
- Database connection pooling

### Performance
- Connection pooling
- Efficient queries with Prisma
- Pagination for large datasets
- Indexed database columns

### Monitoring
- Error logging
- Request logging (development)
- Health check endpoint

## Testing Strategy

### Unit Tests
- Test services independently
- Mock database calls
- Test business logic

### Integration Tests
- Test API endpoints
- Use test database
- Test authentication flow

### E2E Tests
- Test complete user flows
- Test error scenarios

## Future Enhancements

1. **Caching Layer**: Redis for frequently accessed data
2. **Message Queue**: For async operations
3. **File Storage**: S3 or similar for file uploads
4. **Email Service**: For notifications
5. **Logging Service**: Centralized logging
6. **Monitoring**: APM tools integration
7. **API Documentation**: Swagger/OpenAPI
8. **GraphQL**: Alternative API layer
