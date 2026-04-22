import type { Env } from '../index'
import { uploadToIPFS, uploadJSONToIPFS } from '../lib/ipfs'
import { uploadToArweave, uploadJSONToArweave } from '../lib/arweave'
import { recordUpload } from '../lib/cost-monitor'

interface BookPublishMessage {
  type: 'publish_book'
  bookId: string
  userId: string
}

/**
 * Process a book publish request:
 *   1. Load chapters + book metadata from D1.
 *   2. For every chapter, read the draft body from KV (`chapter:draft:<id>`),
 *      upload it to IPFS (Pinata) AND Arweave (Irys/Bundlr), and write the
 *      resulting `content_cid` + `arweave_tx` back into the `chapters` row.
 *   3. Upload the structured book manifest (without bodies) to IPFS + Arweave,
 *      store IDs on the book row, mark the book published, cache in KV.
 *
 * If any chapter fails to resolve or upload, the book is marked
 * `publish_failed` and the error propagates so the queue can retry / DLQ.
 */
export async function handleBookProcessing(env: Env, message: BookPublishMessage): Promise<void> {
  const { bookId } = message
  const db = env.DB

  try {
    // Load chapters ordered by index
    const chaptersRes = await db
      .prepare(
        `SELECT id, idx, title, content_cid, word_count FROM chapters WHERE book_id = ? ORDER BY idx`
      )
      .bind(bookId)
      .all()

    const chapterRows = (chaptersRes.results ?? []) as Array<{
      id: string
      idx: number
      title: string
      content_cid: string
      word_count: number
    }>

    if (chapterRows.length === 0) {
      throw new Error('No chapters found for book')
    }

    // Load book metadata
    const book = await db
      .prepare(
        `SELECT title, description, author, tags, ai_mode, ai_ratio FROM books WHERE id = ?`
      )
      .bind(bookId)
      .first<{
        title: string
        description: string | null
        author: string
        tags: string | null
        ai_mode: string
        ai_ratio: number
      }>()

    if (!book) {
      throw new Error('Book not found')
    }

    // Upload every chapter body to IPFS + Arweave, write back to D1.
    const chapterManifests: Array<{
      id: string
      idx: number
      title: string
      word_count: number
      content_cid: string
      arweave_tx: string
    }> = []

    for (const ch of chapterRows) {
      const draftKey = `chapter:draft:${ch.id}`
      const body = await env.KV.get(draftKey)
      if (!body) {
        throw new Error(`Missing draft body in KV for chapter ${ch.id} (key ${draftKey})`)
      }

      const filename = `${bookId}-${ch.id}.md`

      // Upload to both providers. Any throw propagates → book marked failed.
      const [ipfsCid, arweaveTx] = await Promise.all([
        uploadToIPFS(env, body, filename),
        uploadToArweave(env, body, {
          'App-Name': 'MyThinkRead',
          'Content-Type': 'text/markdown',
          'Book-Id': bookId,
          'Chapter-Id': ch.id,
          'Chapter-Idx': String(ch.idx)
        })
      ])

      // Persist storage IDs on the chapter row.
      await db
        .prepare(
          `UPDATE chapters SET content_cid = ?, arweave_tx = ? WHERE id = ?`
        )
        .bind(ipfsCid, arweaveTx, ch.id)
        .run()

      // Cache the body for fast reads.
      await env.KV.put(`chapter:${ch.id}`, body, {
        expirationTtl: 7 * 24 * 60 * 60
      })

      // Track storage cost for this upload.
      const bodyBytes = new TextEncoder().encode(body).length
      await recordUpload(env, 'ipfs', bodyBytes)
      await recordUpload(env, 'arweave', bodyBytes)

      chapterManifests.push({
        id: ch.id,
        idx: ch.idx,
        title: ch.title,
        word_count: ch.word_count,
        content_cid: ipfsCid,
        arweave_tx: arweaveTx
      })

      console.log(`✅ Chapter ${ch.id} uploaded — IPFS=${ipfsCid} Arweave=${arweaveTx}`)
    }

    // Structured book manifest (links to chapter CIDs, no bodies).
    const structuredContent = {
      version: '1.0',
      book: {
        id: bookId,
        title: book.title,
        author: book.author,
        description: book.description,
        tags: book.tags ? (JSON.parse(book.tags) as string[]) : [],
        ai_mode: book.ai_mode,
        ai_ratio: book.ai_ratio,
        created_at: Date.now()
      },
      chapters: chapterManifests,
      total_chapters: chapterManifests.length,
      total_words: chapterManifests.reduce((sum, ch) => sum + (ch.word_count || 0), 0)
    }

    console.log(`Uploading book ${bookId} manifest to IPFS...`)
    const structuredCid = await uploadJSONToIPFS(env, structuredContent, `${bookId}-structured.json`)
    console.log(`Uploading book ${bookId} manifest to Arweave...`)
    const structuredTx = await uploadJSONToArweave(env, structuredContent, {
      'App-Name': 'MyThinkRead',
      'Content-Type': 'application/json',
      'Book-Id': bookId,
      'Book-Title': book.title
    })

    // Track storage cost for manifest uploads.
    const manifestBytes = new TextEncoder().encode(JSON.stringify(structuredContent)).length
    await recordUpload(env, 'ipfs', manifestBytes)
    await recordUpload(env, 'arweave', manifestBytes)

    const now = Math.floor(Date.now() / 1000)
    await db
      .prepare(
        `UPDATE books SET structured_cid = ?, arweave_tx = ?, status = 'published', published_at = ?, updated_at = ? WHERE id = ?`
      )
      .bind(structuredCid, structuredTx, now, now, bookId)
      .run()

    await db
      .prepare(
        `UPDATE creators SET total_books = total_books + 1 WHERE user_id = ?`
      )
      .bind(message.userId)
      .run()

    await env.KV.put(`book:${bookId}`, JSON.stringify(structuredContent), {
      expirationTtl: 7 * 24 * 60 * 60
    })

    console.log(`🎉 Book ${bookId} published — ${chapterManifests.length} chapters`)
  } catch (error) {
    console.error(`Failed to publish book ${bookId}:`, error)

    // Mark book as publish_failed — best-effort, swallow nested failures.
    try {
      await db
        .prepare(
          `UPDATE books SET status = 'publish_failed', updated_at = ? WHERE id = ?`
        )
        .bind(Math.floor(Date.now() / 1000), bookId)
        .run()
    } catch (nested) {
      console.error('Failed to record publish_failed state:', nested)
    }

    throw error
  }
}
