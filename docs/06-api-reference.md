# API Reference — MyThinkRead

Base URL: `https://api.mythinkread.pages.dev/api`

Authentication: Bearer token via `Authorization: Bearer <jwt>` header

---

## Authentication

### POST /auth/register
Register a new user.

**Request:**
```json
{
  "username": "alice",
  "password": "secure-password"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "username": "alice",
    "display_name": "alice"
  }
}
```

### POST /auth/login
Login and get JWT token.

**Request:**
```json
{
  "username": "alice",
  "password": "secure-password"
}
```

### GET /auth/me
Get current user info.

**Response:**
```json
{
  "id": "uuid",
  "username": "alice",
  "display_name": "Alice",
  "role": "creator"
}
```

---

## Books

### GET /books
List books with pagination.

**Query:**
- `page` (number, default: 1)
- `limit` (number, default: 20)
- `ai_mode` (string, optional): `ai_only`, `light_hybrid`, `heavy_human`

**Response:**
```json
{
  "items": [
    {
      "id": "uuid",
      "title": "Book Title",
      "author": "Author Name",
      "description": "...",
      "ai_mode": "light_hybrid",
      "ai_ratio": 75,
      "rating_avg": 4.5,
      "read_count": 1200
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 20
}
```

### GET /books/:id
Get book details.

### POST /books
Create a new book (auth required).

**Request:**
```json
{
  "title": "New Book",
  "description": "...",
  "ai_mode": "ai_only"
}
```

### PUT /books/:id
Update book metadata.

### DELETE /books/:id
Delete a book (creator only).

---

## Chapters

### GET /books/:bookId/chapters
List chapters of a book.

### GET /books/:bookId/chapters/:chapterId
Get chapter content.

### POST /books/:bookId/chapters
Add a chapter (auth required).

**Request:**
```json
{
  "title": "Chapter 1",
  "content": "Chapter body..."
}
```

### PUT /books/:bookId/chapters/:chapterId
Update chapter.

---

## AI Generation

### POST /ai/generate
Generate text with AI (auth required).

**Request:**
```json
{
  "prompt": "Write a chapter about...",
  "max_tokens": 2000,
  "temperature": 0.7
}
```

**Response:**
```json
{
  "content": "Generated text...",
  "tokens_used": 1500
}
```

---

## Comments

### GET /comments?bookId=:id
Get comments for a book.

### POST /comments
Add a comment (auth required).

**Request:**
```json
{
  "book_id": "uuid",
  "content": "Great book!",
  "parent_id": null
}
```

---

## Ratings

### POST /ratings
Rate a book (auth required).

**Request:**
```json
{
  "book_id": "uuid",
  "rating": 5
}
```

---

## Booklists

### GET /booklists
List public booklists.

### POST /booklists
Create a booklist (auth required).

### GET /booklists/:id
Get booklist details.

---

## Search

### GET /search?q=:query&type=:type
Search books, creators, or booklists.

**Query:**
- `q` (string): search query
- `type` (string): `all`, `books`, `creators`, `booklists`

### GET /search/suggestions?q=:query
Get search suggestions.

---

## Social

### GET /social/feed
Get activity feed (auth required).

### POST /social/follow
Follow a user (auth required).

### GET /social/followers
Get followers list.

---

## Export

### GET /export/reading-data
Export personal reading data (auth required).

**Query:**
- `format` (string): `json`, `csv`

### POST /export/obsidian
Export book to Obsidian format.

**Request:**
```json
{
  "book_id": "uuid"
}
```

---

## Wiki

### GET /wiki/:bookId
Get book wiki.

### POST /wiki/:bookId/entries
Add wiki entry (auth required).

### PUT /wiki/:bookId/entries/:entryId
Update wiki entry.

---

## FSRS (Spaced Repetition)

### GET /fsrs/cards
Get due cards.

### POST /fsrs/cards/:cardId/review
Submit a review.

**Request:**
```json
{
  "rating": "good"
}
```

---

## Admin

### GET /admin/stats
Get platform statistics (admin only).

### GET /admin/users
List all users (admin only).

---

## Analytics

### GET /analytics/overview?days=:days
Get analytics overview (auth required).

**Query:**
- `days` (number): 7, 30, or 90

---

## Public Domain

### GET /public-domain/books
List public domain books.

**Query:**
- `category` (string, optional)

### GET /public-domain/books/:id
Get public domain book details.

---

## TTS (Text-to-Speech)

### POST /tts/generate
Generate audio for text (auth required).

**Request:**
```json
{
  "text": "Chapter content...",
  "voice_id": "voice-1"
}
```

---

## Collaborate

### GET /collaborate/docs/:docId
Get collaborative document.

### POST /collaborate/docs/:docId/operations
Submit an operation.

**Request:**
```json
{
  "operation": "insert",
  "position": 100,
  "content": "new text"
}
```

---

## Blog

### GET /blog/posts
List blog posts.

### POST /blog/posts
Create a blog post (auth required).

### GET /blog/config
Get blog configuration.

### PUT /blog/config
Update blog configuration.

---

## Notifications

### GET /notifications
Get user notifications (auth required).

### PUT /notifications/:id/read
Mark notification as read.

---

## Solana (V2 Preview)

### GET /solana/address
Get connected Solana address.

### POST /solana/connect
Connect Solana wallet.

---

## Payments (V2 Preview)

### POST /payments/create
Create a payment intent.

### GET /payments/:id/status
Get payment status.

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "status": 400
}
```

Common status codes:
- `400` Bad Request
- `401` Unauthorized
- `403` Forbidden
- `404` Not Found
- `500` Internal Server Error
