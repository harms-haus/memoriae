# API Documentation

This page provides complete documentation of all API endpoints, including request/response formats, authentication requirements, and error handling.

## Base URL

- **Development**: `http://localhost:3123/api`
- **Production**: `/api` (relative, served by backend)

## Authentication

All API endpoints (except auth endpoints) require authentication via JWT token.

### Authentication Header

```
Authorization: Bearer <token>
```

### Getting a Token

Tokens are obtained through OAuth flow:
1. User initiates OAuth (Google/GitHub)
2. OAuth callback redirects with token in URL
3. Frontend stores token in localStorage
4. Token included in all subsequent requests

## Authentication Endpoints

### GET /api/auth/status

Get current authentication status.

**Authentication**: None (public endpoint)

**Response**:
```json
{
  "authenticated": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "User Name",
    "provider": "google"
  }
}
```

**Status Codes**:
- `200` - Success
- `401` - Not authenticated (returns `{ "authenticated": false, "user": null }`)

### GET /api/auth/google

Initiate Google OAuth flow.

**Query Parameters**:
- `redirect` (optional) - URL to redirect to after authentication

**Response**: Redirects to Google OAuth consent screen

### GET /api/auth/github

Initiate GitHub OAuth flow.

**Query Parameters**:
- `redirect` (optional) - URL to redirect to after authentication

**Response**: Redirects to GitHub OAuth consent screen

### POST /api/auth/logout

Log out current user.

**Authentication**: Required

**Response**:
```json
{
  "message": "Logged out successfully"
}
```

**Status Codes**:
- `200` - Success

## Seed Endpoints

### GET /api/seeds

Get all seeds for the authenticated user.

**Authentication**: Required

**Query Parameters**:
- None (all seeds for user)

**Response**:
```json
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "slug": "abc1234/my-seed",
    "created_at": "2024-01-01T00:00:00Z",
    "currentState": {
      "seed": "Seed content...",
      "timestamp": "2024-01-01T00:00:00Z",
      "metadata": {},
      "tags": [
        { "id": "uuid", "name": "work" }
      ],
      "categories": [
        { "id": "uuid", "name": "Projects", "path": "/work/projects" }
      ]
    }
  }
]
```

**Status Codes**:
- `200` - Success
- `401` - Unauthorized

### GET /api/seeds/:hashId/:slug

Get a single seed by hash ID and slug.

**Authentication**: Required

**Path Parameters**:
- `hashId` - First 7 characters of seed UUID (or full UUID for backward compatibility)
- `slug` - Slug hint for collision resolution

**Response**: Same as GET /api/seeds (single seed object)

**Status Codes**:
- `200` - Success
- `404` - Seed not found
- `401` - Unauthorized

### GET /api/seeds/:hashId/automations

Get all available automations for a seed.

**Authentication**: Required

**Path Parameters**:
- `hashId` - Seed hash ID (or full UUID)

**Response**:
```json
[
  {
    "id": "uuid",
    "name": "tag",
    "description": "Extracts hash tags and generates tags",
    "enabled": true
  }
]
```

**Status Codes**:
- `200` - Success
- `404` - Seed not found
- `401` - Unauthorized

### POST /api/seeds

Create a new seed.

**Authentication**: Required

**Request Body**:
```json
{
  "content": "Seed content here..."
}
```

**Response**: Created seed object (same format as GET /api/seeds/:id)

**Status Codes**:
- `201` - Created
- `400` - Invalid input (content required and non-empty)
- `401` - Unauthorized

**Note**: Automations are automatically queued for processing after seed creation.

### PUT /api/seeds/:id

Update seed content.

**Authentication**: Required

**Path Parameters**:
- `id` - Seed UUID

**Request Body**:
```json
{
  "content": "Updated content..."
}
```

**Response**: Updated seed object

**Status Codes**:
- `200` - Success
- `404` - Seed not found
- `400` - Invalid input
- `401` - Unauthorized

**Note**: Creates `edit_content` transaction.

### DELETE /api/seeds/:id

Delete a seed.

**Authentication**: Required

**Path Parameters**:
- `id` - Seed UUID

**Response**:
```json
{
  "message": "Seed deleted successfully"
}
```

**Status Codes**:
- `200` - Success
- `404` - Seed not found
- `401` - Unauthorized

**Note**: Cascades to delete all transactions and sprouts.

## Transaction Endpoints

### GET /api/seeds/:seedId/transactions

Get all transactions for a seed.

**Authentication**: Required

**Path Parameters**:
- `seedId` - Seed UUID

**Response**:
```json
[
  {
    "id": "uuid",
    "seed_id": "uuid",
    "transaction_type": "create_seed",
    "transaction_data": {
      "content": "Seed content"
    },
    "created_at": "2024-01-01T00:00:00Z",
    "automation_id": null
  }
]
```

**Status Codes**:
- `200` - Success
- `404` - Seed not found
- `401` - Unauthorized

### POST /api/seeds/:seedId/transactions

Create a new transaction for a seed.

**Authentication**: Required

**Path Parameters**:
- `seedId` - Seed UUID

**Request Body**:
```json
{
  "transaction_type": "add_tag",
  "transaction_data": {
    "tag_id": "uuid",
    "tag_name": "work"
  },
  "automation_id": null
}
```

**Response**: Created transaction object

**Status Codes**:
- `201` - Created
- `400` - Invalid transaction data
- `404` - Seed not found
- `401` - Unauthorized

## Category Endpoints

### GET /api/categories

Get all categories (hierarchical).

**Authentication**: Required

**Response**:
```json
[
  {
    "id": "uuid",
    "parent_id": "uuid",
    "name": "Work",
    "path": "/work",
    "created_at": "2024-01-01T00:00:00Z"
  },
  {
    "id": "uuid",
    "parent_id": "uuid",
    "name": "Projects",
    "path": "/work/projects",
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

**Status Codes**:
- `200` - Success
- `401` - Unauthorized

### POST /api/categories

Create a new category.

**Authentication**: Required

**Request Body**:
```json
{
  "name": "New Category",
  "parent_id": "uuid"  // Optional, null for root category
}
```

**Response**: Created category object

**Status Codes**:
- `201` - Created
- `400` - Invalid input
- `401` - Unauthorized

**Note**: Path is automatically generated based on parent hierarchy.

### PUT /api/categories/:id

Update a category (rename or move).

**Authentication**: Required

**Path Parameters**:
- `id` - Category UUID

**Request Body**:
```json
{
  "name": "Renamed Category",
  "parent_id": "uuid"  // Optional, to move category
}
```

**Response**: Updated category object

**Status Codes**:
- `200` - Success
- `404` - Category not found
- `400` - Invalid input
- `401` - Unauthorized

**Note**: Triggers pressure system for affected seeds.

### DELETE /api/categories/:id

Delete a category.

**Authentication**: Required

**Path Parameters**:
- `id` - Category UUID

**Response**:
```json
{
  "message": "Category deleted successfully"
}
```

**Status Codes**:
- `200` - Success
- `404` - Category not found
- `401` - Unauthorized

**Note**: Cascades to delete all child categories. Triggers pressure system.

## Tag Endpoints

### GET /api/tags

Get all tags.

**Authentication**: Required

**Response**:
```json
[
  {
    "id": "uuid",
    "name": "work",
    "color": "#ffd43b",
    "currentState": {
      "name": "work",
      "color": "#ffd43b",
      "timestamp": "2024-01-01T00:00:00Z",
      "metadata": {}
    }
  }
]
```

**Status Codes**:
- `200` - Success
- `401` - Unauthorized

### POST /api/tags

Create a new tag.

**Authentication**: Required

**Request Body**:
```json
{
  "name": "new-tag",
  "color": "#4fc3f7"  // Optional
}
```

**Response**: Created tag object

**Status Codes**:
- `201` - Created
- `400` - Invalid input or tag already exists
- `401` - Unauthorized

### GET /api/tags/:id

Get a single tag by ID.

**Authentication**: Required

**Path Parameters**:
- `id` - Tag UUID

**Response**: Tag object (same format as GET /api/tags array item)

**Status Codes**:
- `200` - Success
- `404` - Tag not found
- `401` - Unauthorized

### PUT /api/tags/:id

Update a tag (name or color).

**Authentication**: Required

**Path Parameters**:
- `id` - Tag UUID

**Request Body**:
```json
{
  "name": "renamed-tag",  // Optional
  "color": "#66bb6a"      // Optional
}
```

**Response**: Updated tag object

**Status Codes**:
- `200` - Success
- `404` - Tag not found
- `400` - Invalid input
- `401` - Unauthorized

**Note**: Creates tag transactions for changes.

## Sprout Endpoints

### GET /api/seeds/:seedId/sprouts

Get all sprouts for a seed.

**Authentication**: Required

**Path Parameters**:
- `seedId` - Seed UUID

**Response**:
```json
[
  {
    "id": "uuid",
    "seed_id": "uuid",
    "sprout_type": "followup",
    "sprout_data": {
      "trigger": "automatic",
      "initial_time": "2024-01-02T00:00:00Z",
      "initial_message": "Follow up on this"
    },
    "created_at": "2024-01-01T00:00:00Z",
    "automation_id": "uuid"
  }
]
```

**Status Codes**:
- `200` - Success
- `404` - Seed not found
- `401` - Unauthorized

### GET /api/sprouts/:sproutId

Get a single sprout by ID.

**Authentication**: Required

**Path Parameters**:
- `sproutId` - Sprout UUID

**Response**: Sprout object (same format as GET /api/seeds/:seedId/sprouts array item)

**Status Codes**:
- `200` - Success
- `404` - Sprout not found
- `401` - Unauthorized

### GET /api/sprouts/:sproutId/state

Get computed state for a sprout (followup or Wikipedia).

**Authentication**: Required

**Path Parameters**:
- `sproutId` - Sprout UUID

**Response** (for followup sprout):
```json
{
  "due_time": "2024-01-02T00:00:00Z",
  "message": "Follow up on this",
  "dismissed": false,
  "dismissed_at": null,
  "transactions": [...]
}
```

**Response** (for Wikipedia sprout):
```json
{
  "reference": "Human chimerism",
  "article_url": "https://en.wikipedia.org/wiki/Human_chimerism",
  "article_title": "Human chimerism",
  "summary": "Human chimerism is a condition...",
  "transactions": [...]
}
```

**Status Codes**:
- `200` - Success
- `404` - Sprout not found
- `400` - Invalid sprout type
- `401` - Unauthorized

### POST /api/seeds/:seedId/sprouts

Create a new sprout.

**Authentication**: Required

**Path Parameters**:
- `seedId` - Seed UUID

**Request Body** (followup):
```json
{
  "sprout_type": "followup",
  "sprout_data": {
    "trigger": "manual",
    "initial_time": "2024-01-02T00:00:00Z",
    "initial_message": "Follow up on this"
  }
}
```

**Request Body** (musing):
```json
{
  "sprout_type": "musing",
  "sprout_data": {
    "template_type": "numbered_ideas",
    "content": {
      "ideas": ["Idea 1", "Idea 2"]
    },
    "dismissed": false,
    "dismissed_at": null,
    "completed": false,
    "completed_at": null
  }
}
```

**Response**: Created sprout object

**Status Codes**:
- `201` - Created
- `400` - Invalid input
- `404` - Seed not found
- `401` - Unauthorized

### PUT /api/sprouts/:sproutId/followup

Edit a followup sprout.

**Authentication**: Required

**Path Parameters**:
- `sproutId` - Sprout UUID

**Request Body**:
```json
{
  "due_time": "2024-01-03T00:00:00Z",  // Optional
  "message": "Updated message"         // Optional
}
```

**Response**: Updated sprout state

**Status Codes**:
- `200` - Success
- `404` - Sprout not found
- `400` - Invalid sprout type or input
- `401` - Unauthorized

### POST /api/sprouts/:sproutId/followup/snooze

Snooze a followup sprout.

**Authentication**: Required

**Path Parameters**:
- `sproutId` - Sprout UUID

**Request Body**:
```json
{
  "duration_minutes": 60
}
```

**Response**: Updated sprout state

**Status Codes**:
- `200` - Success
- `404` - Sprout not found
- `400` - Invalid sprout type or input
- `401` - Unauthorized

### POST /api/sprouts/:sproutId/followup/dismiss

Dismiss a followup sprout.

**Authentication**: Required

**Path Parameters**:
- `sproutId` - Sprout UUID

**Request Body**:
```json
{
  "type": "followup"  // or "snooze"
}
```

**Response**: Updated sprout state

**Status Codes**:
- `200` - Success
- `404` - Sprout not found
- `400` - Invalid sprout type or input
- `401` - Unauthorized

## Search Endpoints

### GET /api/search

Full-text search across seeds, tags, and categories.

**Authentication**: Required

**Query Parameters**:
- `q` (optional) - Search query string
- `category` (optional) - Category ID to filter by
- `tags` (optional) - Comma-separated tag IDs

**Response**: Array of seed objects (same format as GET /api/seeds)

**Status Codes**:
- `200` - Success
- `401` - Unauthorized

**Example**:
```
GET /api/search?q=meeting&category=uuid&tags=uuid1,uuid2
```

## Settings Endpoints

### GET /api/settings

Get user settings.

**Authentication**: Required

**Response**:
```json
{
  "openrouter_api_key": "sk-...",
  "openrouter_model": "openai/gpt-4",
  "openrouter_model_name": "GPT-4",
  "timezone": "America/New_York"
}
```

**Status Codes**:
- `200` - Success
- `401` - Unauthorized

### PUT /api/settings

Update user settings.

**Authentication**: Required

**Request Body**:
```json
{
  "openrouter_api_key": "sk-...",      // Optional
  "openrouter_model": "openai/gpt-4",  // Optional
  "timezone": "America/New_York"       // Optional
}
```

**Response**: Updated settings object

**Status Codes**:
- `200` - Success
- `400` - Invalid input
- `401` - Unauthorized

## Idea Musing Endpoints

### GET /api/idea-musings

Get all idea musings for the authenticated user.

**Authentication**: Required

**Query Parameters**:
- `completed` (optional) - Filter by completion status (true/false)

**Response**:
```json
[
  {
    "id": "uuid",
    "seed_id": "uuid",
    "template_type": "numbered_ideas",
    "content": {
      "ideas": ["Idea 1", "Idea 2"]
    },
    "dismissed": false,
    "dismissed_at": null,
    "completed": false,
    "completed_at": null,
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

**Status Codes**:
- `200` - Success
- `401` - Unauthorized

**Note**: This endpoint is for backward compatibility. New musings are stored as sprouts.

### POST /api/idea-musings/:id/mark-shown

Mark an idea musing as shown.

**Authentication**: Required

**Path Parameters**:
- `id` - Idea musing UUID

**Response**:
```json
{
  "message": "Musing marked as shown"
}
```

**Status Codes**:
- `200` - Success
- `404` - Musing not found
- `401` - Unauthorized

## Error Responses

### Standard Error Format

```json
{
  "error": "Error message here"
}
```

### Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (invalid input)
- `401` - Unauthorized (missing or invalid token)
- `404` - Not Found (resource doesn't exist)
- `500` - Internal Server Error

### Error Examples

**401 Unauthorized**:
```json
{
  "error": "Unauthorized - No token provided"
}
```

**404 Not Found**:
```json
{
  "error": "Seed not found"
}
```

**400 Bad Request**:
```json
{
  "error": "Content is required and must be a non-empty string"
}
```

## Rate Limiting

Currently no rate limiting is implemented. Future enhancement may add:
- Per-user rate limits
- Per-endpoint rate limits
- IP-based rate limits

## Related Documentation

- [Backend Patterns](Backend-Patterns) - Route handler patterns
- [Data Structures](Data-Structures) - Request/response types
- [Frontend Patterns](Frontend-Patterns) - API client usage

