# Phase 5: Test Spec — MyThinkRead 云阅读器

## 测试策略

- **单元测试**: 纯函数、工具函数、状态管理
- **集成测试**: API 端点、数据库操作、外部服务调用
- **E2E 测试**: 关键用户流程
- **TDD**: 测试先于实现编写

**测试工具**: Vitest (单元/集成) + Playwright (E2E)

---

## 1. 认证模块测试

### 1.1 POST /api/auth/register

#### Happy Path
```typescript
test('should register new user with valid data', async () => {
    const res = await fetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
            username: 'testuser',
            email: 'test@example.com',
            password: 'password123'
        })
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.username).toBe('testuser');
    expect(data.role).toBe('reader');
    expect(data.password).toBeUndefined();
});
```

#### Boundary
```typescript
test('should accept username at minimum length (3 chars)', async () => {
    const res = await register({ username: 'abc', password: 'password123' });
    expect(res.status).toBe(201);
});

test('should accept username at maximum length (20 chars)', async () => {
    const res = await register({ username: 'a'.repeat(20), password: 'password123' });
    expect(res.status).toBe(201);
});

test('should accept password at minimum length (8 chars)', async () => {
    const res = await register({ username: 'testuser', password: '12345678' });
    expect(res.status).toBe(201);
});
```

#### Error/Attack
```typescript
test('should reject duplicate username', async () => {
    await register({ username: 'testuser', password: 'password123' });
    const res = await register({ username: 'testuser', password: 'password123' });
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: 'USERNAME_EXISTS' });
});

test('should reject username with special characters', async () => {
    const res = await register({ username: 'test@user', password: 'password123' });
    expect(res.status).toBe(400);
});

test('should reject password shorter than 8 chars', async () => {
    const res = await register({ username: 'testuser', password: '1234567' });
    expect(res.status).toBe(400);
});

test('should reject SQL injection in username', async () => {
    const res = await register({ username: "'; DROP TABLE users; --", password: 'password123' });
    expect(res.status).toBe(400);
    // Verify users table still exists
    const dbCheck = await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").first();
    expect(dbCheck).toBeTruthy();
});

test('should reject XSS payload in username', async () => {
    const res = await register({ username: '<script>alert(1)</script>', password: 'password123' });
    expect(res.status).toBe(400);
});
```

### 1.2 POST /api/auth/login

#### Happy Path
```typescript
test('should login with valid credentials', async () => {
    await register({ username: 'testuser', password: 'password123' });
    const res = await login({ username: 'testuser', password: 'password123' });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.token).toBeDefined();
    expect(data.user.username).toBe('testuser');
});
```

#### Error/Attack
```typescript
test('should reject invalid password', async () => {
    await register({ username: 'testuser', password: 'password123' });
    const res = await login({ username: 'testuser', password: 'wrongpassword' });
    expect(res.status).toBe(401);
});

test('should reject non-existent user', async () => {
    const res = await login({ username: 'nonexistent', password: 'password123' });
    expect(res.status).toBe(401);
});

test('should rate limit login attempts', async () => {
    for (let i = 0; i < 10; i++) {
        await login({ username: 'testuser', password: 'wrong' });
    }
    const res = await login({ username: 'testuser', password: 'wrong' });
    expect(res.status).toBe(429);
});
```

---

## 2. AI 创作模块测试

### 2.1 POST /api/ai/generate

#### Happy Path
```typescript
test('should generate chapter content', async () => {
    const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
            prompt: 'Write a sci-fi chapter about AI awakening',
            type: 'chapter',
            max_tokens: 500
        })
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.content).toBeDefined();
    expect(data.content.length).toBeGreaterThan(0);
    expect(data.tokens_used).toBeGreaterThan(0);
});
```

#### Boundary
```typescript
test('should handle max prompt length (2000 chars)', async () => {
    const res = await generate({ prompt: 'a'.repeat(2000), max_tokens: 100 });
    expect(res.status).toBe(200);
});

test('should handle minimum temperature (0.0)', async () => {
    const res = await generate({ prompt: 'test', temperature: 0.0 });
    expect(res.status).toBe(200);
});

test('should handle maximum temperature (1.0)', async () => {
    const res = await generate({ prompt: 'test', temperature: 1.0 });
    expect(res.status).toBe(200);
});
```

#### Error/Attack
```typescript
test('should reject prompt exceeding max length', async () => {
    const res = await generate({ prompt: 'a'.repeat(2001) });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'INVALID_PROMPT' });
});

test('should reject temperature out of range', async () => {
    const res = await generate({ prompt: 'test', temperature: 1.5 });
    expect(res.status).toBe(400);
});

test('should reject unauthenticated request', async () => {
    const res = await fetch('/api/ai/generate', {
        method: 'POST',
        body: JSON.stringify({ prompt: 'test' })
    });
    expect(res.status).toBe(401);
});

test('should rate limit AI generation', async () => {
    for (let i = 0; i < 10; i++) {
        await generate({ prompt: 'test' });
    }
    const res = await generate({ prompt: 'test' });
    expect(res.status).toBe(429);
});
```

### 2.2 POST /api/ai/cover

#### Happy Path
```typescript
test('should generate cover image', async () => {
    const res = await fetch('/api/ai/cover', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
            description: 'A futuristic city with flying cars',
            style: 'anime',
            size: 'portrait'
        })
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.image_url).toBeDefined();
});
```

#### Error/Attack
```typescript
test('should reject invalid style', async () => {
    const res = await generateCover({ description: 'test', style: 'invalid' });
    expect(res.status).toBe(400);
});
```

---

## 3. 书籍模块测试

### 3.1 POST /api/books

#### Happy Path
```typescript
test('should create book draft', async () => {
    const res = await fetch('/api/books', {
        method: 'POST',
        headers: { Authorization: `Bearer ${creatorToken}` },
        body: JSON.stringify({
            title: 'Test Book',
            description: 'A test book description',
            tags: ['scifi', 'ai'],
            ai_generated: 1
        })
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.id).toBeDefined();
    expect(data.status).toBe('draft');
});
```

#### Boundary
```typescript
test('should accept title at maximum length (200 chars)', async () => {
    const res = await createBook({ title: 'a'.repeat(200) });
    expect(res.status).toBe(201);
});

test('should accept maximum tags (10)', async () => {
    const res = await createBook({ tags: Array(10).fill('tag') });
    expect(res.status).toBe(201);
});
```

#### Error/Attack
```typescript
test('should reject empty title', async () => {
    const res = await createBook({ title: '' });
    expect(res.status).toBe(400);
});

test('should reject title exceeding 200 chars', async () => {
    const res = await createBook({ title: 'a'.repeat(201) });
    expect(res.status).toBe(400);
});

test('should reject more than 10 tags', async () => {
    const res = await createBook({ tags: Array(11).fill('tag') });
    expect(res.status).toBe(400);
});

test('should reject non-creator user', async () => {
    const res = await createBook({ title: 'Test' }, readerToken);
    expect(res.status).toBe(403);
});
```

### 3.2 POST /api/books/:id/publish

#### Happy Path
```typescript
test('should publish book with chapters', async () => {
    const book = await createBook({ title: 'Test Book' });
    await createChapter(book.id, { title: 'Chapter 1', content: 'Content...' });
    
    const res = await fetch(`/api/books/${book.id}/publish`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${creatorToken}` }
    });
    expect(res.status).toBe(200);
    
    // Wait for async processing
    await waitForProcessing(book.id);
    
    const published = await getBook(book.id);
    expect(published.status).toBe('published');
    expect(published.content_cid).toBeDefined();
});
```

#### Boundary
```typescript
test('should handle concurrent publish requests idempotently', async () => {
    const book = await createBook({ title: 'Test' });
    await createChapter(book.id, { title: 'Ch1', content: '...' });
    
    const [res1, res2] = await Promise.all([
        publish(book.id),
        publish(book.id)
    ]);
    
    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200); // or 409, depending on implementation
    
    const bookData = await getBook(book.id);
    expect(bookData.status).toBe('published');
});
```

#### Error/Attack
```typescript
test('should reject publishing book without chapters', async () => {
    const book = await createBook({ title: 'Empty Book' });
    const res = await publish(book.id);
    expect(res.status).toBe(400);
});

test('should reject publishing by non-owner', async () => {
    const book = await createBook({ title: 'Test' }, creator1Token);
    await createChapter(book.id, { title: 'Ch1', content: '...' });
    const res = await publish(book.id, creator2Token);
    expect(res.status).toBe(403);
});
```

### 3.3 GET /api/books/:id/read/:chapter_id

#### Happy Path
```typescript
test('should return chapter content with progress', async () => {
    const res = await fetch(`/api/books/${bookId}/read/${chapterId}`, {
        headers: { Authorization: `Bearer ${readerToken}` }
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.chapter.content).toBeDefined();
    expect(data.progress).toBeDefined();
});
```

#### Error/Attack
```typescript
test('should return 404 for non-existent chapter', async () => {
    const res = await fetch(`/api/books/${bookId}/read/nonexistent`);
    expect(res.status).toBe(404);
});

test('should cache chapter content in KV', async () => {
    // First request
    await fetch(`/api/books/${bookId}/read/${chapterId}`);
    
    // Check KV cache
    const cached = await KV.get(`book:chapter:${chapterId}`);
    expect(cached).toBeDefined();
});
```

---

## 4. 批注模块测试

### 4.1 POST /api/annotations

#### Happy Path
```typescript
test('should create annotation', async () => {
    const res = await fetch('/api/annotations', {
        method: 'POST',
        headers: { Authorization: `Bearer ${readerToken}` },
        body: JSON.stringify({
            book_id: bookId,
            chapter_id: chapterId,
            range_start: 10,
            range_end: 50,
            selected_text: 'highlighted text',
            note: 'My note',
            color: '#FFD700',
            is_public: 1
        })
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.id).toBeDefined();
});
```

#### Boundary
```typescript
test('should accept note at maximum length (1000 chars)', async () => {
    const res = await createAnnotation({ note: 'a'.repeat(1000) });
    expect(res.status).toBe(201);
});

test('should accept valid hex color', async () => {
    const res = await createAnnotation({ color: '#FFFFFF' });
    expect(res.status).toBe(201);
});
```

#### Error/Attack
```typescript
test('should reject range_start > range_end', async () => {
    const res = await createAnnotation({ range_start: 50, range_end: 10 });
    expect(res.status).toBe(400);
});

test('should reject invalid color format', async () => {
    const res = await createAnnotation({ color: 'red' });
    expect(res.status).toBe(400);
});

test('should reject annotation on non-existent chapter', async () => {
    const res = await createAnnotation({ chapter_id: 'nonexistent' });
    expect(res.status).toBe(404);
});
```

---

## 5. 评论模块测试

### 5.1 POST /api/comments

#### Happy Path
```typescript
test('should create comment', async () => {
    const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { Authorization: `Bearer ${readerToken}` },
        body: JSON.stringify({
            book_id: bookId,
            content: 'Great book!'
        })
    });
    expect(res.status).toBe(201);
});
```

#### Error/Attack
```typescript
test('should reject toxic content via AI moderation', async () => {
    const res = await createComment({ content: 'You are stupid and worthless' });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'CONTENT_VIOLATION' });
});

test('should reject comment exceeding max length', async () => {
    const res = await createComment({ content: 'a'.repeat(2001) });
    expect(res.status).toBe(400);
});

test('should reject comment on non-existent book', async () => {
    const res = await createComment({ book_id: 'nonexistent', content: 'test' });
    expect(res.status).toBe(404);
});
```

---

## 6. 数据导出测试

### 6.1 GET /api/export/all

#### Happy Path
```typescript
test('should export all user data as JSON', async () => {
    const res = await fetch('/api/export/all', {
        headers: { Authorization: `Bearer ${readerToken}` }
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.user).toBeDefined();
    expect(data.reading_progress).toBeDefined();
    expect(data.annotations).toBeDefined();
});
```

#### Boundary
```typescript
test('should handle empty data export', async () => {
    const newUser = await register({ username: 'newuser', password: 'password123' });
    const res = await fetch('/api/export/all', {
        headers: { Authorization: `Bearer ${newUser.token}` }
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.reading_progress).toEqual([]);
    expect(data.annotations).toEqual([]);
});
```

#### Error/Attack
```typescript
test('should reject unauthenticated export request', async () => {
    const res = await fetch('/api/export/all');
    expect(res.status).toBe(401);
});
```

---

## 7. 榜单模块测试

### 7.1 GET /api/rankings/:type

#### Happy Path
```typescript
test('should return ranked books', async () => {
    const res = await fetch('/api/rankings/hot?period=weekly');
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.items)).toBe(true);
    expect(data.items.length).toBeLessThanOrEqual(20);
    
    // Verify descending order
    for (let i = 1; i < data.items.length; i++) {
        expect(data.items[i-1].score).toBeGreaterThanOrEqual(data.items[i].score);
    }
});
```

---

## 8. E2E 测试 (Playwright)

### 8.1 完整创作流程
```typescript
test('creator can generate and publish a book', async ({ page }) => {
    // Login as creator
    await page.goto('/login');
    await page.fill('[name="username"]', 'creator');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Navigate to create page
    await page.goto('/create');
    
    // Fill book info
    await page.fill('[name="title"]', 'My AI Book');
    await page.fill('[name="description"]', 'A book about AI');
    
    // Generate chapter with AI
    await page.fill('[name="prompt"]', 'Write a chapter about space exploration');
    await page.click('button:has-text("Generate")');
    
    // Wait for generation
    await page.waitForSelector('.generated-content', { timeout: 30000 });
    
    // Save chapter
    await page.click('button:has-text("Save Chapter")');
    
    // Publish
    await page.click('button:has-text("Publish")');
    await page.waitForSelector('.publish-success');
    
    // Verify book appears in list
    await page.goto('/books');
    await expect(page.locator('text=My AI Book')).toBeVisible();
});
```

### 8.2 完整阅读流程
```typescript
test('reader can read and annotate a book', async ({ page }) => {
    // Login as reader
    await login(page, 'reader', 'password123');
    
    // Open a book
    await page.goto('/books/test-book');
    await page.click('button:has-text("Read")');
    
    // Select text and annotate
    await page.locator('.chapter-content').selectText();
    await page.click('button:has-text("Highlight")');
    await page.fill('[name="note"]', 'Important point');
    await page.click('button:has-text("Save")');
    
    // Verify annotation saved
    await expect(page.locator('text=Important point')).toBeVisible();
    
    // Post comment
    await page.fill('[name="comment"]', 'Great chapter!');
    await page.click('button:has-text("Post")');
    await expect(page.locator('text=Great chapter!')).toBeVisible();
});
```

---

## 9. 性能测试

```typescript
test('book list API should respond within 200ms', async () => {
    const start = Date.now();
    const res = await fetch('/api/books?page=1&limit=20');
    const duration = Date.now() - start;
    expect(res.status).toBe(200);
    expect(duration).toBeLessThan(200);
});

test('chapter content should load within 3s', async () => {
    const start = Date.now();
    const res = await fetch(`/api/books/${bookId}/read/${chapterId}`);
    const duration = Date.now() - start;
    expect(res.status).toBe(200);
    expect(duration).toBeLessThan(3000);
});
```

---

## 10. V2 扩展功能测试

### 10.1 Kami 呈现层测试

#### Happy Path
```typescript
test('should generate Kami style one-pager', async () => {
    const res = await fetch('/api/kami/one-pager', {
        method: 'POST',
        headers: { Authorization: `Bearer ${creatorToken}` },
        body: JSON.stringify({ book_id: bookId })
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.html).toContain('background-color: #FAF7F0');
    expect(data.html).toContain('color: #1E3A5F');
});

test('should generate Kami style PDF', async () => {
    const res = await fetch('/api/kami/pdf', {
        method: 'POST',
        headers: { Authorization: `Bearer ${creatorToken}` },
        body: JSON.stringify({ book_id: bookId, chapter_ids: [chapterId] })
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/pdf');
});
```

#### Boundary
```typescript
test('should handle dynamic theme for sci-fi book', async () => {
    const res = await fetch(`/api/kami/one-pager?book_id=${sciFiBookId}`);
    const data = await res.json();
    expect(data.theme).toBe('scifi');
    expect(data.colors.primary).toBe('#1E3A5F');
});

test('should handle dynamic theme for romance book', async () => {
    const res = await fetch(`/api/kami/one-pager?book_id=${romanceBookId}`);
    const data = await res.json();
    expect(data.theme).toBe('romance');
    expect(data.colors.primary).toBe('#E8B4B8');
});
```

### 10.2 协作编辑测试

#### Happy Path
```typescript
test('should create collaborative doc', async () => {
    const res = await fetch('/api/collaborate/docs', {
        method: 'POST',
        headers: { Authorization: `Bearer ${creatorToken}` },
        body: JSON.stringify({ book_id: bookId, title: 'Draft Chapter' })
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.id).toBeDefined();
});

test('should sync operations between collaborators', async () => {
    const doc = await createCollaborativeDoc(bookId);
    
    // User 1 inserts text
    await submitOperation(doc.id, user1Token, {
        type: 'insert', position: 0, content: 'Hello'
    });
    
    // User 2 should see the change
    const ops = await getOperations(doc.id, user2Token);
    expect(ops).toHaveLength(1);
    expect(ops[0].content).toBe('Hello');
});
```

#### Error/Attack
```typescript
test('should reject unauthorized collaborator', async () => {
    const doc = await createCollaborativeDoc(bookId);
    const res = await submitOperation(doc.id, unauthorizedToken, {
        type: 'insert', position: 0, content: 'Hack'
    });
    expect(res.status).toBe(403);
});
```

### 10.3 个人博客测试

#### Happy Path
```typescript
test('should create blog config', async () => {
    const res = await fetch('/api/blog/config', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${readerToken}` },
        body: JSON.stringify({
            subdomain: 'myblog',
            theme: 'kami',
            title: 'My Reading Blog'
        })
    });
    expect(res.status).toBe(200);
});

test('should auto-publish comment to blog', async () => {
    // Enable auto-publish
    await updateBlogConfig({ auto_publish_comment: 1 });
    
    // Create comment
    await createComment({ book_id: bookId, content: 'Great book!' });
    
    // Verify blog post created
    const posts = await getBlogPosts();
    expect(posts).toHaveLength(1);
    expect(posts[0].type).toBe('comment');
});
```

### 10.4 公版书测试

#### Happy Path
```typescript
test('should import public domain book', async () => {
    const res = await fetch('/api/public-domain/import', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
            source: 'gutenberg',
            source_url: 'https://www.gutenberg.org/files/1342/1342-0.txt',
            title: 'Pride and Prejudice',
            author: 'Jane Austen'
        })
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.id).toBeDefined();
    expect(data.status).toBe('active');
});
```

## 11. 测试覆盖率目标

| 模块 | 单元测试 | 集成测试 | E2E 测试 | 目标覆盖率 |
|------|---------|---------|---------|-----------|
| 认证 | ✅ | ✅ | ✅ | 90% |
| AI 创作 | ✅ | ✅ | ✅ | 85% |
| 书籍管理 | ✅ | ✅ | ✅ | 90% |
| 阅读 | ✅ | ✅ | ✅ | 85% |
| 批注 | ✅ | ✅ | - | 85% |
| 评论 | ✅ | ✅ | - | 85% |
| 书单 | ✅ | ✅ | - | 80% |
| 社交 | ✅ | ✅ | - | 80% |
| 榜单 | ✅ | ✅ | - | 80% |
| 导出 | ✅ | ✅ | - | 85% |
| Kami 呈现 | ✅ | ✅ | - | 80% |
| 协作编辑 | ✅ | ✅ | - | 85% |
| 个人博客 | ✅ | ✅ | - | 80% |
| 公版书 | ✅ | ✅ | - | 80% |

---

## 验收标准

- [ ] 所有 API 端点至少包含 Happy Path + 1 个 Error 测试
- [ ] 所有边界条件有对应测试用例
- [ ] 安全相关测试（SQL 注入、XSS、认证绕过）全部通过
- [ ] E2E 测试覆盖核心用户流程
- [ ] 性能测试满足非功能需求指标
- [ ] Kami 视觉回归测试通过（颜色、字体、布局）
- [ ] 协作编辑同步测试通过（多人同时编辑无冲突）
- [ ] 测试覆盖率 >= 80%
