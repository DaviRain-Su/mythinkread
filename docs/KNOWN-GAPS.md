# Known Gaps

This document records features from the PRD that are not yet fully implemented, along with the rationale for deferring them and suggested future work.

## OT/CRDT Real-Time Collaboration

**Current state:** The `/api/collaborate` endpoints store sequential operations in SQLite and apply them synchronously on the server. There is no operational-transform (OT) or CRDT merge layer, and no WebSocket or real-time broadcast channel.

**Rationale:** A production-grade real-time editor requires a persistent WebSocket gateway (e.g., Cloudflare Durable Objects or PartyKit) and a conflict-resolution algorithm. The current SQLite-based operation log is sufficient for MVP-level "save and replay" collaboration but will produce conflicts if two clients submit concurrent edits.

**Suggested future work:**
1. Adopt Yjs or Automerge as the CRDT layer.
2. Use Cloudflare Durable Objects (or a self-hosted WebSocket broker) to hold document state and broadcast updates.
3. Migrate the existing `doc_operations` table to a CRDT-aware event stream for auditability.

## Metaplex NFT Minting

**Current state:** `POST /api/solana/mint/:bookId` returns a placeholder success message. No on-chain program invocation, no metadata upload to Arweave/IPFS for the NFT, and no candy-machine or Metaplex UMI integration.

**Rationale:** NFT minting introduces significant on-chain complexity (program deployment, metadata standards, royalty enforcement) and cost (rent exemption, transaction fees). The current wallet-link flow (ed25519 signature verification) is real and production-ready, but minting itself is deferred until the content-upload pipeline is battle-tested.

**Suggested future work:**
1. Integrate `@metaplex-foundation/umi` with a Solana RPC endpoint.
2. Upload book cover + metadata JSON to Arweave via the existing `arweave.ts` helper.
3. Implement a creator-mint flow that writes the mint address back to the `books` table.
4. Add a reader-facing "Collect as NFT" purchase path with USDC payment.

## Blog Subdomain Routing

**Current state:** `GET /api/blog/:subdomain` returns JSON. There is no wildcard DNS or Pages routing that maps `username.mythinkread.pages.dev` to a user's blog. The frontend blog page is not implemented.

**Rationale:** True subdomain routing requires either Cloudflare for SaaS (custom hostnames) or a wildcard DNS record + edge function that resolves the subdomain to a `user_blog_configs` row. This is an infrastructure feature that depends on the production domain being finalized.

**Suggested future work:**
1. Add a wildcard `*.mythinkread.pages.dev` DNS record.
2. Implement a Cloudflare Worker (or Pages Function) that reads the `Host` header, looks up the subdomain in D1, and serves the corresponding blog HTML/JSON.
3. Build a dedicated blog renderer in the web app (or generate static pages via a build step).
