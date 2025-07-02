# Smart CRM Integration System API Documentation

## Overview

The Smart CRM Integration System provides a comprehensive API for managing contacts with AI-powered enrichment and analysis capabilities. The system is built with TypeScript and follows RESTful principles.

## Architecture

### Core Services

1. **HTTP Client Service** - Centralized HTTP communication with auth, retry, and caching
2. **Contact API Service** - RESTful contact management operations
3. **AI Integration Service** - Unified AI provider orchestration
4. **Validation Service** - Input/output validation and sanitization
5. **Cache Service** - In-memory caching with TTL support
6. **Rate Limiter Service** - Request rate limiting per endpoint/user
7. **Logger Service** - Structured logging for monitoring and debugging
8. **Integration Manager** - Main orchestrator coordinating all services

### Security Features

- JWT-based authentication with refresh tokens
- API key management for AI providers
- Input validation and sanitization
- Rate limiting per user/endpoint
- Request/response logging
- Error handling with retry logic

## API Endpoints

### Authentication

#### POST /auth/login
Login and receive access tokens.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "expiresIn": 3600,
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "name": "User Name"
  }
}
```

#### POST /auth/refresh
Refresh access token using refresh token.

**Request:**
```json
{
  "refreshToken": "eyJ..."
}
```

### Contacts

#### GET /api/contacts
Get paginated list of contacts with filtering.

**Query Parameters:**
- `search` - Text search across name, email, company
- `interestLevel` - Filter by interest level (hot, medium, low, cold)
- `status` - Filter by status (lead, prospect, customer, etc.)
- `industry` - Filter by industry
- `sources` - Filter by lead sources (comma-separated)
- `tags` - Filter by tags (comma-separated)
- `hasAIScore` - Filter by presence of AI score (true/false)
- `scoreRange` - Filter by AI score range (min,max)
- `dateRange` - Filter by date range (start,end)
- `limit` - Number of results per page (default: 50, max: 100)
- `offset` - Results offset for pagination
- `sortBy` - Sort field (name, company, score, updatedAt)
- `sortOrder` - Sort direction (asc, desc)

**Response:**
```json
{
  "contacts": [
    {
      "id": "contact-id",
      "firstName": "John",
      "lastName": "Doe",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "phone": "+1-555-0123",
      "title": "Software Engineer",
      "company": "Tech Corp",
      "industry": "Technology",
      "avatarSrc": "https://example.com/avatar.jpg",
      "sources": ["LinkedIn"],
      "interestLevel": "medium",
      "status": "lead",
      "aiScore": 75,
      "tags": ["developer", "senior"],
      "socialProfiles": {
        "linkedin": "https://linkedin.com/in/johndoe"
      },
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 150,
  "limit": 50,
  "offset": 0,
  "hasMore": true
}
```

#### POST /api/contacts
Create a new contact.

**Request:**
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane.smith@example.com",
  "title": "Product Manager",
  "company": "Innovation Labs",
  "industry": "Technology",
  "sources": ["Website"],
  "interestLevel": "hot",
  "status": "prospect",
  "notes": "Interested in enterprise solutions"
}
```

#### GET /api/contacts/{id}
Get a specific contact by ID.

#### PATCH /api/contacts/{id}
Update a contact partially.

**Request:**
```json
{
  "title": "Senior Product Manager",
  "aiScore": 85,
  "tags": ["high-priority", "enterprise"]
}
```

#### DELETE /api/contacts/{id}
Delete a contact.

#### POST /api/contacts/batch
Create multiple contacts in a single request.

**Request:**
```json
{
  "contacts": [
    {
      "firstName": "Contact",
      "lastName": "One",
      "email": "contact1@example.com",
      "title": "Engineer",
      "company": "Company A",
      "interestLevel": "medium",
      "status": "lead"
    }
  ]
}
```

#### PATCH /api/contacts/batch
Update multiple contacts in a single request.

#### GET /api/contacts/stats
Get contact statistics and aggregations.

**Response:**
```json
{
  "total": 1000,
  "byStatus": {
    "lead": 400,
    "prospect": 300,
    "customer": 250,
    "churned": 50
  },
  "byInterestLevel": {
    "hot": 150,
    "medium": 400,
    "low": 350,
    "cold": 100
  },
  "byIndustry": {
    "Technology": 500,
    "Healthcare": 200,
    "Finance": 180,
    "Other": 120
  },
  "withAIScore": 750,
  "averageScore": 68
}
```

#### GET /api/contacts/export
Export contacts to CSV or JSON.

**Query Parameters:**
- `format` - Export format (csv, json)
- Plus all filtering parameters from GET /api/contacts

#### GET /api/contacts/duplicates
Find potential duplicate contacts.

#### POST /api/contacts/{id}/merge
Merge duplicate contacts into a primary contact.

### AI Integration

#### POST /api/ai/analyze
Analyze a contact using AI.

**Request:**
```json
{
  "contactId": "contact-id",
  "analysisTypes": ["scoring", "categorization", "tagging"],
  "options": {
    "provider": "openai",
    "includeConfidence": true
  }
}
```

**Response:**
```json
{
  "contactId": "contact-id",
  "score": 85,
  "confidence": 92,
  "insights": [
    "High engagement potential based on professional background",
    "Strong technical expertise in relevant areas"
  ],
  "recommendations": [
    "Schedule technical demo within 48 hours",
    "Share advanced feature documentation"
  ],
  "categories": ["Technology", "Enterprise", "Decision Maker"],
  "tags": ["high-priority", "technical", "senior"],
  "provider": "openai",
  "timestamp": "2024-01-01T00:00:00Z",
  "processingTime": 2500
}
```

#### POST /api/ai/analyze/bulk
Analyze multiple contacts in bulk.

**Request:**
```json
{
  "contactIds": ["contact-1", "contact-2", "contact-3"],
  "analysisTypes": ["scoring", "categorization"],
  "options": {
    "includeConfidence": true
  }
}
```

#### POST /api/ai/enrich
Enrich contact data using AI.

**Request:**
```json
{
  "contactId": "contact-id",
  "enrichmentRequest": {
    "email": "john.doe@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "company": "Tech Corp"
  }
}
```

**Response:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "name": "John Doe",
  "email": "john.doe@example.com",
  "phone": "+1-555-0123",
  "title": "Senior Software Engineer",
  "company": "Tech Corp",
  "industry": "Technology",
  "location": {
    "city": "San Francisco",
    "state": "California",
    "country": "United States"
  },
  "socialProfiles": {
    "linkedin": "https://linkedin.com/in/johndoe",
    "twitter": "https://twitter.com/johndoe",
    "website": "https://johndoe.dev"
  },
  "bio": "Experienced software engineer with expertise in full-stack development",
  "confidence": 88
}
```

#### GET /api/ai/providers/status
Get status of AI providers.

**Response:**
```json
[
  {
    "name": "openai",
    "status": "available",
    "remaining": 45
  },
  {
    "name": "gemini",
    "status": "rate_limited",
    "remaining": 0
  }
]
```

### System Health

#### GET /api/health
Get system health status.

**Response:**
```json
{
  "status": "healthy",
  "services": {
    "contactAPI": "up",
    "aiProviders": [
      { "name": "openai", "status": "up" },
      { "name": "gemini", "status": "rate_limited" }
    ],
    "cache": "up",
    "rateLimiter": "up"
  },
  "metrics": {
    "cacheHitRate": 0.85,
    "avgResponseTime": 250,
    "errorRate": 0.02,
    "requestsPerMinute": 45
  },
  "lastHealthCheck": "2024-01-01T00:00:00Z"
}
```

## Error Responses

All endpoints return consistent error responses:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": {
      "field": "email",
      "reason": "Invalid email format"
    },
    "requestId": "req_123456789"
  }
}
```

### Error Codes

- `VALIDATION_ERROR` - Request validation failed
- `AUTHENTICATION_ERROR` - Invalid or missing authentication
- `AUTHORIZATION_ERROR` - Insufficient permissions
- `RATE_LIMIT_ERROR` - Rate limit exceeded
- `NOT_FOUND` - Resource not found
- `DUPLICATE_ERROR` - Resource already exists
- `AI_PROVIDER_ERROR` - AI service unavailable
- `INTERNAL_ERROR` - Server error

## Rate Limits

### Default Limits (per minute)

- Contact API: 100 requests
- AI Analysis: 50 requests
- AI Enrichment: 30 requests
- Bulk operations: 10 requests

### Headers

Rate limit information is included in response headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## Authentication

### Bearer Token

Include the access token in the Authorization header:

```
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
```

### API Keys (for AI providers)

AI provider API keys are configured server-side and not exposed to clients.

## Caching

### Response Caching

- GET requests are cached with appropriate TTL
- Cache keys include query parameters
- Cache invalidation on data mutations
- Cache headers included in responses

### Cache Headers

```
Cache-Control: max-age=300
ETag: "abc123"
Last-Modified: Wed, 21 Oct 2015 07:28:00 GMT
```

## SDKs and Libraries

### JavaScript/TypeScript SDK

```typescript
import { SmartCRMClient } from '@smartcrm/sdk';

const client = new SmartCRMClient({
  apiUrl: 'https://api.smartcrm.com',
  apiKey: 'your-api-key',
});

// Get contacts
const contacts = await client.contacts.list({
  interestLevel: 'hot',
  limit: 10,
});

// Analyze contact
const analysis = await client.ai.analyze({
  contactId: 'contact-id',
  analysisTypes: ['scoring', 'categorization'],
});
```

## Webhooks

### Available Events

- `contact.created`
- `contact.updated`
- `contact.deleted`
- `contact.analyzed`
- `contact.enriched`

### Webhook Payload

```json
{
  "event": "contact.created",
  "timestamp": "2024-01-01T00:00:00Z",
  "data": {
    "contact": {
      "id": "contact-id",
      "firstName": "John",
      "lastName": "Doe",
      // ... full contact object
    }
  }
}
```

## Best Practices

### Performance

1. Use pagination for large datasets
2. Implement proper caching strategies
3. Use bulk operations when possible
4. Monitor rate limits and adjust accordingly

### Security

1. Always validate input data
2. Use HTTPS for all communications
3. Implement proper error handling
4. Log all API interactions for auditing

### Integration

1. Implement exponential backoff for retries
2. Handle rate limiting gracefully
3. Use webhooks for real-time updates
4. Monitor system health regularly

## Support

For technical support and API questions, contact our developer support team at developers@smartcrm.com.

## Changelog

### Version 1.0.0 (2024-01-01)
- Initial API release
- Contact management endpoints
- AI integration capabilities
- Authentication and rate limiting
- Comprehensive error handling