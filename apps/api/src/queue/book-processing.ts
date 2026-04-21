import type { Env } from '../index'
import { uploadJSONToIPFS } from '../lib/ipfs'
import { uploadJSONToArweave } from '../lib/arweave'

interface BookPublishMessage {
  type: 'publish_book'
  bookId: string
  userId: string
}

export async function handleBookProcessing(env: Env, message: BookPublishMessage): Promise<void> {
  const { bookId } = message
  const db = env.DB

  try {
    // Get all chapters for this book
    const chapters = await db.prepare(`
      SELECT id, idx, title, content_cid, word_count
      FROM chapters
      WHERE book_id = ?
      ORDER BY idx
    `).bind(bookId).all()

    if (!chapters.results || chapters.results.length === 0) {
      throw new Error('No chapters found for book')
    }

    // Get book details
    const book = await db.prepare(`
      SELECT title, description, author, tags, ai_mode, ai_ratio
      FROM books
      WHERE id = ?
    `).bind(bookId).first()

    if (!book) {
      throw new Error('Book not found')
    }

    // Prepare structured content
    const structuredContent = {
      version: '1.0',
      book: {
        id: bookId,
        title: book.title,
        author: book.author,
        description: book.description,
        tags: book.tags ? JSON.parse(book.tags as string) : [],
        ai_mode: book.ai_mode,
        ai_ratio: book.ai_ratio,
        created_at: Date.now()
      },
      chapters: chapters.results.map(ch => ({
        id: ch.id,
        idx: ch.idx,
        title: ch.title,
        word_count: ch.word_count
      })),
      total_chapters: chapters.results.length,
      total_words: chapters.results.reduce((sum, ch) => sum + (ch.word_count as number), 0)
    }

    // Upload to IPFS (hot storage)
    console.log(`Uploading book ${bookId} to IPFS...`)
    const ipfsCid = await uploadJSONToIPFS(env, structuredContent, `${bookId}-structured.json`)
    console.log(`IPFS CID: ${ipfsCid}`)

    // Upload to Arweave (permanent storage)
    console.log(`Uploading book ${bookId} to Arweave...`)
    const arweaveTx = await uploadJSONToArweave(env, structuredContent, {
      'App-Name': 'MyThinkRead',
      'Content-Type': 'application/json',
      'Book-Id': bookId,
      'Book-Title': book.title as string
    })
    console.log(`Arweave TX: ${arweaveTx}`)

    // Update book with storage info
    const now = Math.floor(Date.now() / 1000)
    await db.prepare(`
      UPDATE books
      SET structured_cid = ?,
          arweave_tx = ?,
          status = 'published',
          published_at = ?,
          updated_at = ?
      WHERE id = ?
    `).bind(ipfsCid, arweaveTx, now, now, bookId).run()

    // Update creator stats
    await db.prepare(`
      UPDATE creators
      SET total_books = total_books + 1,
          total_reads = total_reads + 0
      WHERE user_id = ?
    `).bind(message.userId).run()

    // Cache in KV for fast access
    await env.KV.put(`book:${bookId}`, JSON.stringify(structuredContent), {
      expirationTtl: 7 * 24 * 60 * 60 // 7 days
    })

    console.log(`Book ${bookId} published successfully`)

  } catch (error) {
    console.error(`Failed to publish book ${bookId}:`, error)
    
    // Update book status to failed
    await db.prepare(`
      UPDATE books
      SET status = 'publish_failed',
          updated_at = ?
      WHERE id = ?
    `).bind(Math.floor(Date.now() / 1000), bookId).run()
    
    throw error
  }
}
