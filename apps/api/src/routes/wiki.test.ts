import { describe, it, expect } from 'vitest'
import wiki from './wiki'
import { createToken } from '../lib/jwt'

/**
 * Wiki routes test suite.
 * Covers: list entries, get single entry, create entry, update entry,
 * create relation, knowledge graph, timeline, and search.
 */

function makeEnv(seed: {
  entries?: Array<{
    id: string
    book_id: string
    slug: string
    title: string
    title_zh?: string | null
    category: string
    content: string
    summary?: string | null
    ai_generated?: number
    created_by?: string
    version?: number
    status?: string
    created_at?: number
    updated_at?: number
  }>
  relations?: Array<{
    id: string
    book_id: string
    from_entry_id: string
    to_entry_id: string
    relation_type: string
    context?: string | null
    created_at?: number
  }>
  appearances?: Array<{
    id: string
    entry_id: string
    chapter_id: string
    paragraph_idx: number
  }>
  revisions?: Array<{
    id: string
    entry_id: string
    user_id: string
    content: string
    summary: string
    version: number
    created_at: number
  }>
  chapters?: Array<{
    id: string
    book_id: string
    idx: number
    title: string
  }>
}) {
  const entries = (seed.entries ?? []).map((e) => ({ ...e, status: e.status ?? 'active' }))
  const relations = seed.relations ?? []
  const appearances = seed.appearances ?? []
  const revisions = seed.revisions ?? []
  const chapters = seed.chapters ?? []

  const prepare = (sql: string) => {
    const normalized = sql.replace(/\s+/g, ' ').trim()
    const chain = {
      _args: [] as unknown[],
      bind(...args: unknown[]) {
        chain._args = args
        return chain
      },
      async first() {
        // wiki_entries lookup by book_id + slug
        if (normalized.includes('FROM wiki_entries WHERE book_id = ? AND slug = ?')) {
          const [bookId, slug] = chain._args as [string, string]
          return entries.find((e) => e.book_id === bookId && e.slug === slug) ?? null
        }
        // wiki_entries lookup by id
        if (normalized.includes('FROM wiki_entries WHERE id = ?')) {
          const [id] = chain._args as [string]
          return entries.find((e) => e.id === id) ?? null
        }
        return null
      },
      async all() {
        // List entries for a book
        if (normalized.includes('FROM wiki_entries WHERE book_id = ? AND status = ?')) {
          const [bookId, status, category] = chain._args as [string, string, string?]
          let results = entries.filter((e) => e.book_id === bookId && e.status === status)
          if (category) {
            results = results.filter((e) => e.category === category)
          }
          return { results }
        }
        // Relations for an entry
        if (normalized.includes('FROM wiki_relations r JOIN wiki_entries e ON r.to_entry_id = e.id')) {
          const [fromEntryId] = chain._args as [string]
          const entryRelations = relations.filter((r) => r.from_entry_id === fromEntryId)
          return {
            results: entryRelations.map((r) => {
              const toEntry = entries.find((e) => e.id === r.to_entry_id)
              return {
                ...r,
                to_title: toEntry?.title ?? '',
                to_slug: toEntry?.slug ?? '',
                to_category: toEntry?.category ?? '',
              }
            }),
          }
        }
        // Appearances for an entry
        if (normalized.includes('FROM wiki_appearances a JOIN chapters c ON a.chapter_id = c.id')) {
          const [entryId] = chain._args as [string]
          const entryAppearances = appearances.filter((a) => a.entry_id === entryId)
          return {
            results: entryAppearances.map((a) => {
              const chapter = chapters.find((c) => c.id === a.chapter_id)
              return {
                ...a,
                chapter_title: chapter?.title ?? '',
                chapter_idx: chapter?.idx ?? 0,
              }
            }),
          }
        }
        // Revisions for an entry
        if (normalized.includes('FROM wiki_revisions WHERE entry_id = ?')) {
          const [entryId] = chain._args as [string]
          return {
            results: revisions
              .filter((r) => r.entry_id === entryId)
              .sort((a, b) => b.version - a.version)
              .slice(0, 10),
          }
        }
        // Graph nodes
        if (normalized.includes('id, slug, title, category FROM wiki_entries WHERE book_id = ? AND status = ?')) {
          const [bookId, status] = chain._args as [string, string]
          return {
            results: entries
              .filter((e) => e.book_id === bookId && e.status === status)
              .map((e) => ({ id: e.id, slug: e.slug, title: e.title, category: e.category })),
          }
        }
        // Graph edges
        if (normalized.includes('FROM wiki_relations r JOIN wiki_entries fe ON r.from_entry_id = fe.id JOIN wiki_entries te ON r.to_entry_id = te.id')) {
          const [bookId] = chain._args as [string]
          return {
            results: relations
              .filter((r) => r.book_id === bookId)
              .map((r) => {
                const fromEntry = entries.find((e) => e.id === r.from_entry_id)
                const toEntry = entries.find((e) => e.id === r.to_entry_id)
                return {
                  from_entry_id: r.from_entry_id,
                  to_entry_id: r.to_entry_id,
                  relation_type: r.relation_type,
                  from_title: fromEntry?.title ?? '',
                  to_title: toEntry?.title ?? '',
                }
              }),
          }
        }
        // Timeline entries
        if (normalized.includes('wiki_entries') && normalized.includes('book_id = ?') && normalized.includes('category = ?') && normalized.includes('status = ?') && !normalized.includes('JOIN')) {
          const [bookId, category, status] = chain._args as [string, string, string]
          return {
            results: entries
              .filter((e) => e.book_id === bookId && e.category === category && e.status === status)
              .sort((a, b) => a.title.localeCompare(b.title)),
          }
        }
        // Search
        if (normalized.includes('wiki_entries') && normalized.includes('status = ?') && normalized.includes('title LIKE ?') && normalized.includes('content LIKE ?') && normalized.includes('title_zh LIKE ?')) {
          const args = chain._args as string[]
          const status = args[0]
          const q1 = args[1]
          const bookId = args.length > 4 ? args[4] : undefined
          const q = q1.replace(/%/g, '').toLowerCase()
          let results = entries.filter(
            (e) =>
              e.status === status &&
              (e.title.toLowerCase().includes(q) ||
                e.content.toLowerCase().includes(q) ||
                (e.title_zh && e.title_zh.toLowerCase().includes(q)))
          )
          if (bookId) {
            results = results.filter((e) => e.book_id === bookId)
          }
          return { results: results.slice(0, 20) }
        }
        return { results: [] }
      },
      async run() {
        // Insert wiki entry
        if (normalized.includes('INSERT INTO wiki_entries')) {
          const [
            id,
            book_id,
            slug,
            title,
            title_zh,
            category,
            content,
            summary,
            ai_generated,
            created_by,
            version,
            status,
            created_at,
            updated_at,
          ] = chain._args as unknown[]
          // Check unique constraint
          if (entries.some((e) => e.book_id === book_id && e.slug === slug)) {
            throw new Error('UNIQUE constraint failed: wiki_entries.book_id, wiki_entries.slug')
          }
          entries.push({
            id: id as string,
            book_id: book_id as string,
            slug: slug as string,
            title: title as string,
            title_zh: title_zh as string | null,
            category: category as string,
            content: content as string,
            summary: summary as string | null,
            ai_generated: (ai_generated as number) ?? 0,
            created_by: (created_by as string) ?? '',
            version: (version as number) ?? 1,
            status: (status as string) ?? 'active',
            created_at: (created_at as number) ?? 0,
            updated_at: (updated_at as number) ?? 0,
          })
          return { success: true }
        }
        // Insert revision
        if (normalized.includes('INSERT INTO wiki_revisions')) {
          const [id, entry_id, user_id, content, summary, version, created_at] = chain._args as unknown[]
          revisions.push({
            id: id as string,
            entry_id: entry_id as string,
            user_id: user_id as string,
            content: content as string,
            summary: summary as string,
            version: version as number,
            created_at: created_at as number,
          })
          return { success: true }
        }
        // Insert relation
        if (normalized.includes('INSERT INTO wiki_relations')) {
          const [id, book_id, from_entry_id, to_entry_id, relation_type, context, created_at] = chain._args as unknown[]
          // Check unique constraint
          if (
            relations.some(
              (r) =>
                r.from_entry_id === from_entry_id &&
                r.to_entry_id === to_entry_id &&
                r.relation_type === relation_type
            )
          ) {
            throw new Error('UNIQUE constraint failed: wiki_relations')
          }
          relations.push({
            id: id as string,
            book_id: book_id as string,
            from_entry_id: from_entry_id as string,
            to_entry_id: to_entry_id as string,
            relation_type: relation_type as string,
            context: context as string | null,
            created_at: created_at as number,
          })
          return { success: true }
        }
        // Update entry
        if (normalized.includes('UPDATE wiki_entries SET')) {
          const [title, title_zh, content, summary, version, updated_at, id] = chain._args as unknown[]
          const entry = entries.find((e) => e.id === id)
          if (entry) {
            if (title !== null && title !== undefined) entry.title = title as string
            if (title_zh !== null && title_zh !== undefined) entry.title_zh = title_zh as string | null
            if (content !== null && content !== undefined) entry.content = content as string
            if (summary !== null && summary !== undefined) entry.summary = summary as string | null
            if (version !== null && version !== undefined) entry.version = version as number
            if (updated_at !== null && updated_at !== undefined) entry.updated_at = updated_at as number
          }
          return { success: true }
        }
        return { success: true }
      },
    }
    return chain
  }

  return {
    ENVIRONMENT: 'development',
    JWT_SECRET: 'unit-test-secret',
    DB: { prepare } as unknown,
    _entries: entries,
    _relations: relations,
    _revisions: revisions,
  }
}

async function authHeader(env: { ENVIRONMENT: string; JWT_SECRET: string }, userId = 'user-1') {
  const token = await createToken(
    { userId, username: 'alice', role: 'creator' },
    env
  )
  return `Bearer ${token}`
}

describe('GET /api/wiki/books/:bookId/entries — list wiki entries', () => {
  it('returns empty array when no entries exist', async () => {
    const env = makeEnv({})
    const res = await wiki.fetch(
      new Request('http://x/books/book-1/entries'),
      env as never
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { items: unknown[] }
    expect(body.items).toEqual([])
  })

  it('returns entries filtered by category', async () => {
    const env = makeEnv({
      entries: [
        { id: 'e1', book_id: 'book-1', slug: 'concept-1', title: 'Concept 1', category: 'concepts', content: '...' },
        { id: 'e2', book_id: 'book-1', slug: 'entity-1', title: 'Entity 1', category: 'entities', content: '...' },
      ],
    })
    const res = await wiki.fetch(
      new Request('http://x/books/book-1/entries?category=concepts'),
      env as never
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { items: Array<{ slug: string }> }
    expect(body.items).toHaveLength(1)
    expect(body.items[0].slug).toBe('concept-1')
  })
})

describe('GET /api/wiki/books/:bookId/entries/:slug — get single entry', () => {
  it('returns 404 for non-existent entry', async () => {
    const env = makeEnv({})
    const res = await wiki.fetch(
      new Request('http://x/books/book-1/entries/nonexistent'),
      env as never
    )
    expect(res.status).toBe(404)
  })

  it('returns entry with relations, appearances, and revisions', async () => {
    const env = makeEnv({
      entries: [
        { id: 'e1', book_id: 'book-1', slug: 'homesickness', title: 'Homesickness', category: 'concepts', content: '...' },
        { id: 'e2', book_id: 'book-1', slug: 'moon', title: 'The Moon', category: 'entities', content: '...' },
      ],
      relations: [
        { id: 'r1', book_id: 'book-1', from_entry_id: 'e1', to_entry_id: 'e2', relation_type: 'references' },
      ],
      appearances: [
        { id: 'a1', entry_id: 'e1', chapter_id: 'c1', paragraph_idx: 5 },
      ],
      revisions: [
        { id: 'rev1', entry_id: 'e1', user_id: 'user-1', content: '...', summary: 'Initial', version: 1, created_at: 1000 },
      ],
      chapters: [
        { id: 'c1', book_id: 'book-1', idx: 1, title: 'Chapter 1' },
      ],
    })
    const res = await wiki.fetch(
      new Request('http://x/books/book-1/entries/homesickness'),
      env as never
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      entry: { slug: string }
      relations: unknown[]
      appearances: unknown[]
      revisions: unknown[]
    }
    expect(body.entry.slug).toBe('homesickness')
    expect(body.relations).toHaveLength(1)
    expect(body.appearances).toHaveLength(1)
    expect(body.revisions).toHaveLength(1)
  })
})

describe('POST /api/wiki/books/:bookId/entries — create entry', () => {
  it('creates a new wiki entry with initial revision', async () => {
    const env = makeEnv({})
    const auth = await authHeader(env)
    const res = await wiki.fetch(
      new Request('http://x/books/book-1/entries', {
        method: 'POST',
        headers: { Authorization: auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: 'new-concept',
          title: 'New Concept',
          category: 'concepts',
          content: 'This is a new concept.',
          summary: 'A brief summary.',
        }),
      }),
      env as never
    )
    expect(res.status).toBe(201)
    const body = (await res.json()) as { id: string; slug: string; title: string }
    expect(body.slug).toBe('new-concept')
    expect(body.title).toBe('New Concept')
    expect(env._entries).toHaveLength(1)
    expect(env._revisions).toHaveLength(1)
  })

  it('returns 409 for duplicate slug', async () => {
    const env = makeEnv({
      entries: [
        { id: 'e1', book_id: 'book-1', slug: 'duplicate', title: 'Duplicate', category: 'concepts', content: '...' },
      ],
    })
    const auth = await authHeader(env)
    const res = await wiki.fetch(
      new Request('http://x/books/book-1/entries', {
        method: 'POST',
        headers: { Authorization: auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: 'duplicate',
          title: 'Another',
          category: 'concepts',
          content: '...',
        }),
      }),
      env as never
    )
    expect(res.status).toBe(409)
  })

  it('returns 401 without auth', async () => {
    const env = makeEnv({})
    const res = await wiki.fetch(
      new Request('http://x/books/book-1/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: 'x', title: 'X', category: 'concepts', content: '...' }),
      }),
      env as never
    )
    expect(res.status).toBe(401)
  })
})

describe('PUT /api/wiki/books/:bookId/entries/:slug — update entry', () => {
  it('updates entry and creates a revision', async () => {
    const env = makeEnv({
      entries: [
        { id: 'e1', book_id: 'book-1', slug: 'homesickness', title: 'Homesickness', category: 'concepts', content: 'Old content', version: 1 },
      ],
    })
    const auth = await authHeader(env)
    const res = await wiki.fetch(
      new Request('http://x/books/book-1/entries/homesickness', {
        method: 'PUT',
        headers: { Authorization: auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Homesickness Updated',
          content: 'New content',
          change_summary: 'Fixed typo',
        }),
      }),
      env as never
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { success: boolean; version: number }
    expect(body.success).toBe(true)
    expect(body.version).toBe(2)
    expect(env._entries[0].title).toBe('Homesickness Updated')
    expect(env._entries[0].version).toBe(2)
    expect(env._revisions).toHaveLength(1)
  })

  it('returns 404 for non-existent entry', async () => {
    const env = makeEnv({})
    const auth = await authHeader(env)
    const res = await wiki.fetch(
      new Request('http://x/books/book-1/entries/nonexistent', {
        method: 'PUT',
        headers: { Authorization: auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'X' }),
      }),
      env as never
    )
    expect(res.status).toBe(404)
  })
})

describe('POST /api/wiki/books/:bookId/relations — create relation', () => {
  it('creates a relation between two entries', async () => {
    const env = makeEnv({
      entries: [
        { id: 'e1', book_id: 'book-1', slug: 'a', title: 'A', category: 'concepts', content: '...' },
        { id: 'e2', book_id: 'book-1', slug: 'b', title: 'B', category: 'concepts', content: '...' },
      ],
    })
    const auth = await authHeader(env)
    const res = await wiki.fetch(
      new Request('http://x/books/book-1/relations', {
        method: 'POST',
        headers: { Authorization: auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_entry_id: 'e1',
          to_entry_id: 'e2',
          relation_type: 'references',
          context: 'A references B',
        }),
      }),
      env as never
    )
    expect(res.status).toBe(201)
    expect(env._relations).toHaveLength(1)
  })

  it('returns 409 for duplicate relation', async () => {
    const env = makeEnv({
      entries: [
        { id: 'e1', book_id: 'book-1', slug: 'a', title: 'A', category: 'concepts', content: '...' },
        { id: 'e2', book_id: 'book-1', slug: 'b', title: 'B', category: 'concepts', content: '...' },
      ],
      relations: [
        { id: 'r1', book_id: 'book-1', from_entry_id: 'e1', to_entry_id: 'e2', relation_type: 'references' },
      ],
    })
    const auth = await authHeader(env)
    const res = await wiki.fetch(
      new Request('http://x/books/book-1/relations', {
        method: 'POST',
        headers: { Authorization: auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_entry_id: 'e1',
          to_entry_id: 'e2',
          relation_type: 'references',
        }),
      }),
      env as never
    )
    expect(res.status).toBe(409)
  })
})

describe('GET /api/wiki/books/:bookId/graph — knowledge graph', () => {
  it('returns nodes and edges for the book', async () => {
    const env = makeEnv({
      entries: [
        { id: 'e1', book_id: 'book-1', slug: 'a', title: 'A', category: 'concepts', content: '...' },
        { id: 'e2', book_id: 'book-1', slug: 'b', title: 'B', category: 'concepts', content: '...' },
      ],
      relations: [
        { id: 'r1', book_id: 'book-1', from_entry_id: 'e1', to_entry_id: 'e2', relation_type: 'references' },
      ],
    })
    const res = await wiki.fetch(
      new Request('http://x/books/book-1/graph'),
      env as never
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { nodes: unknown[]; edges: unknown[] }
    expect(body.nodes).toHaveLength(2)
    expect(body.edges).toHaveLength(1)
  })
})

describe('GET /api/wiki/books/:bookId/timeline — timeline entries', () => {
  it('returns only timeline category entries', async () => {
    const env = makeEnv({
      entries: [
        { id: 'e1', book_id: 'book-1', slug: 'event-1', title: 'Event 1', category: 'timeline', content: '...' },
        { id: 'e2', book_id: 'book-1', slug: 'concept-1', title: 'Concept 1', category: 'concepts', content: '...' },
      ],
    })
    const res = await wiki.fetch(
      new Request('http://x/books/book-1/timeline'),
      env as never
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { items: Array<{ slug: string }> }
    expect(body.items).toHaveLength(1)
    expect(body.items[0].slug).toBe('event-1')
  })
})

describe('GET /api/wiki/search — search wiki entries', () => {
  it('returns matching entries by title', async () => {
    const env = makeEnv({
      entries: [
        { id: 'e1', book_id: 'book-1', slug: 'homesickness', title: 'Homesickness', category: 'concepts', content: '...' },
        { id: 'e2', book_id: 'book-1', slug: 'moon', title: 'The Moon', category: 'entities', content: '...' },
      ],
    })
    const res = await wiki.fetch(
      new Request('http://x/search?q=home'),
      env as never
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { items: Array<{ slug: string }>; query: string }
    expect(body.items).toHaveLength(1)
    expect(body.items[0].slug).toBe('homesickness')
    expect(body.query).toBe('home')
  })

  it('filters by book_id when provided', async () => {
    const env = makeEnv({
      entries: [
        { id: 'e1', book_id: 'book-1', slug: 'homesickness', title: 'Homesickness', category: 'concepts', content: '...' },
        { id: 'e2', book_id: 'book-2', slug: 'homesickness-2', title: 'Homesickness 2', category: 'concepts', content: '...' },
      ],
    })
    const res = await wiki.fetch(
      new Request('http://x/search?q=home&book_id=book-1'),
      env as never
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { items: Array<{ slug: string }> }
    expect(body.items).toHaveLength(1)
    expect(body.items[0].slug).toBe('homesickness')
  })

  it('returns empty array for empty query', async () => {
    const env = makeEnv({})
    const res = await wiki.fetch(
      new Request('http://x/search?q='),
      env as never
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { items: unknown[] }
    expect(body.items).toEqual([])
  })
})
