# AetherDrive — Secure File Storage & AI Orchestration

One-line description
- AetherDrive is a privacy-first file storage and AI orchestration project that combines client-side encryption, secure storage (Azure), a FastAPI orchestration layer, and an AI microservice with vector retrieval (Qdrant) and LLM-based document chat.

## Key features
- End-to-end encrypted file storage (client derives keys; only encrypted bytes and metadata stored)
- User authentication with JWT (FastAPI + SQLModel + Postgres)
- Secure upload/download via Azure Blob Storage (server issues SAS links)
- RAG (retrieval-augmented generation) pipeline: ingest documents, vectorize, store encrypted chunks in Qdrant
- AI chat with streaming SSE responses and source citations
- Privacy-first crypto primitives mirrored between client and server (PBKDF2 + AES-GCM)
- Docker Compose for easy local multi-service orchestration

## High-level architecture (textual diagram)
- Browser (React + TypeScript + Vite)
  - In-memory Master Key (never persisted)
  - Derives per-file keys and encrypts metadata/client-side operations
  - Calls Main API (FastAPI) for management, uploads, and AI operations
- Main API (FastAPI — `main_server/app/main.py`)
  - Auth, file/folder CRUD, Azure upload/download helpers, gRPC bridge to AI service
  - Accepts per-file key from client for ingest/chat flows
- AI Service (gRPC microservice — `ai_server/` with `core/`)
  - Document processing (Docling), vectorization, RAG engine with Qdrant
  - Encrypts chunks before storing to Qdrant
- Datastores
  - Postgres (SQLModel) for users, file records, metadata
  - Qdrant for vector storage (collection `aether_drive`)
  - Azure Blob Storage for encrypted file bytes (main-server uses `azure_handler`)
- External LLM
  - Google Gemini via genai client (API key from environment)
- Communication
  - REST: Browser ↔ Main API (HTTP/JSON + file uploads)
  - gRPC: Main API ↔ AI Service (proto in `protos/cortex.proto`)
  - SSE streaming: Main API → Browser (streams AI chat tokens)

## Security & encryption model (evidence-backed)
- Client-side crypto primitives
  - PBKDF2(SHA-256, 100_000 iterations) used for deriving keys (frontend implementation: `frontend/aether-drive/src/crypto/crypto-utils.ts`; Python equivalent present for server-side operations in `main_server`/`ai_server`).
  - AES-GCM used for content encryption (frontend functions `encryptData`/`decryptData`, server-side use of AES-GCM via Python cryptography).
- Key derivation flow
  - User password ⇒ PBKDF2 ⇒ Master key (client-side).
  - Master key + per-file salt (from server DB) ⇒ PBKDF2 ⇒ per-file key bytes (`deriveFileKeyBytes` in frontend).
  - Frontend converts per-file key bytes to Base64 and sends them to server when needed (ingest/chat).
- What is encrypted
  - File bytes: uploaded to Azure as encrypted bytes (upload path in `main_server.app.azure_handler` is referenced in `main_server/app/main.py`).
  - File metadata: stored encrypted in DB as a Base64 string (`encrypted_metadata` on file record).
  - Vector store payloads: plaintext chunks are encrypted into ciphertext + nonce before writing to Qdrant (`ai_server/core/rag.py` — `store_vectors` uses `encrypt_chunk`).
- What is plaintext / where plaintext appears
  - The server can receive per-file keys from the client. When the client provides a per-file key (base64), `main_server/app/main.py` will use it to decrypt file bytes (via `crypto_utils.decrypt_file_content`) and then forward plaintext bytes to the AI service for ingestion.
  - The AI service receives plaintext document bytes for processing, but encrypts chunks before persisting them to Qdrant.
- Secrets that NEVER leave the client
  - The Master Key (raw bytes) is intentionally never persisted and is kept in-memory only on the frontend (`AuthContext` in `frontend/aether-drive/src/context/AuthContext.tsx` explicitly stores `masterKey` in state and does not persist it).
- Threat model (conservative, code-derived)
  - Trust boundary: the client is considered the source of truth for user secrets (master key). However, per-file keys are sent to backend(s) to perform ingest/chat workflows; thus the server components see plaintext *transiently* and must be trusted.
  - The system design minimizes persistent exposure:
    - Only encrypted bytes/metadata are stored persistently in Azure/Postgres/Qdrant.
    - Qdrant persists encrypted payloads (RAG engine encrypts payloads before upsert).
  - Implication: compromise of Main API or AI Service while a per-file key was sent will expose decrypted bytes in transit or memory during ingestion/chat. The architecture assumes server-side components are trusted to perform ingestion and RAG tasks.

## AI chat & ingestion design (evidence-backed)
- Ingest flow
  1. Client derives per-file key and POSTs to `POST /api/v1/ai/ingest/{file_id}` (see `main_server/app/main.py:ingest_file_for_ai`). The endpoint expects `file_key` (base64) and uses it to decrypt stored encrypted file bytes downloaded from Azure.
  2. Decrypted bytes are sent over gRPC to the AI service (`cortex_pb2.IngestRequest`).
  3. AI service processes bytes using `processor.process_file_bytes` (doc conversion to Markdown) and the RAG engine vectorizes.
  4. RAG engine encrypts each chunk (using `ai_server/core/crypto_utils.encrypt_chunk`) and stores encrypted fragments into Qdrant (`ai_server/core/rag.py:store_vectors`).
- Chat flow
  1. Client chooses files to query and derives per-file keys. Client sends a chat payload to `POST /api/v1/ai/chat` with `file_ids` and `file_keys` (frontend `useAIChat.ts`).
  2. Main API resolves file records, tries to decrypt metadata for display, and forwards request to AI service via gRPC.
  3. AI service runs retrieval (Qdrant query), decrypts matched chunks using provided per-file keys, constructs a strict context prompt, then calls the LLM (genai) to generate an answer.
  4. The Main API wraps AI responses as SSE and streams tokens to the client (Main API implements `chat_stream_generator` to simulate token streaming).
- Streaming & citations
  - Main API yields a `sources` event and then individual `token` events for a typing-like effect. The client consumes SSE and appends tokens to show streaming chat.

## Tech stack (evidence)
- Frontend
  - React + TypeScript + Vite (`frontend/aether-drive/package.json`, `src/` files)
  - Tailwind CSS (config files present)
  - Browser crypto WebCrypto API (`crypto-utils.ts`)
- Backend / Infrastructure
  - FastAPI (`main_server/app/main.py`) with SQLModel and Postgres
  - gRPC microservice (AI server) running at port 50051 (proto: `protos/cortex.proto`)
  - Qdrant vector DB (`docker-compose.yml` + `ai_server/core/rag.py`)
  - Azure Blob Storage handlers (used by Main API, referenced in `main_server/app/main.py`)
  - Google Gemini via genai client (`ai_server/core/rag.py` imports `genai`)
  - Python crypto: `cryptography` / AES-GCM usage in `main_server/app/crypto_utils.py` and ai_server `core/crypto_utils.py`
- Languages: TypeScript (frontend), Python (backend & AI service)
- Other libs: docling document converter (AI service), jose (JWT), passlib (bcrypt), slowapi (rate limiting)

## Project structure (concise)
- `frontend/aether-drive/` — React/Vite app
  - `src/crypto/crypto-utils.ts` — front-end PBKDF2 & AES-GCM helpers (mirror of server)
  - `src/context/AuthContext.tsx` — token + in-memory master key management
  - `src/hooks/useFiles.ts`, `src/hooks/useAIChat.ts` — file listing, per-file key derivation, ingestion & streaming chat consumer
  - `src/api/` — currently `client.ts` exists but is empty (placeholder)
- `main_server/` — FastAPI orchestrator
  - `app/main.py` — central API endpoints, gRPC bridge, SSE streaming
  - `app/crypto_utils.py` — AES-GCM decryption helper for file bytes & metadata
  - `app/security.py` — JWT creation/validation, password hashing (`jose`, `passlib`)
  - `app/azure_handler.py` — Azure storage helpers (referenced)
  - `app/*` — models, crud, database wiring
- `ai_server/` — gRPC AI microservice
  - `core/processor.py` — document conversion (Docling) -> Markdown
  - `core/rag.py` — vector store integration (Qdrant) and LLM orchestration
  - `core/crypto_utils.py` — AES-GCM chunk encrypt/decrypt helper for RAG payloads
- `protos/` — `cortex.proto` used by gRPC bridge
- `docker-compose.yml` — multi-service orchestration (ai-server, main-server, qdrant, postgres)

## Getting started (developer-focused, minimal)
- Prerequisites
  - Docker & Docker Compose v1.29+ (or compatible)
  - Node 18+ / npm or pnpm for frontend development
  - Environment variables (see next section)
- Quick local run (recommended)
  - Build & start the backend ecosystem:
    ```bash
    docker compose up --build
    ```
    - Services (as configured in `docker-compose.yml`):
      - `ai-server` (gRPC) → mapped port 50051
      - `main-server` (FastAPI / UVicorn) → mapped port 8000
      - `qdrant_db` → mapped port 6333
      - `postgres_db` → mapped port 5432
- Frontend (run locally for development with HMR)
  - From `frontend/aether-drive`:
    ```bash
    cd frontend/aether-drive
    npm install
    npm run dev
    ```
  - Vite defaults to port 5173 (open browser at http://localhost:5173)
- Notes
  - The frontend expects the Main API at `http://localhost:8000` (see `useFiles.ts` and `useAIChat.ts` where `BASE_URL` is set).
  - The frontend stores JWT in `localStorage` but keeps the master key only in memory (see `AuthContext.tsx`).

## Environment variables (names & purpose — DO NOT store secrets in public repos)
- Required for local orchestration (names referenced in code and docker-compose)
  - GEMINI_API_KEY (or GOOGLE_API_KEY) — used by AI service (`ai_server/core/rag.py`) to call Google Gemini via genai.
  - AZURE_STORAGE_CONNECTION_STRING — used by `main_server/app/azure_handler.py` to upload/download files to Azure.
  - AZURE_CONTAINER_NAME — Azure container used for file storage.
  - SECRET_KEY — JWT secret used by `main_server/app/security.py`.
  - POSTGRES vars (or `DATABASE_URL`) — database connection for SQLModel/Postgres.
  - Optional overrides:
    - CORTEX_AI_HOST — gRPC address for AI service (defaults to `cortex_ai:50051` in docker-compose)
    - QDRANT_HOST / QDRANT_PORT — Qdrant connection used by AI service
- Example (safe placeholder):
  ```
  GEMINI_API_KEY=<YOUR_GEMINI_API_KEY>
  AZURE_STORAGE_CONNECTION_STRING=<AZURE_CONNECTION_STRING>
  AZURE_CONTAINER_NAME=<CONTAINER_NAME>
  SECRET_KEY=<JWT_SECRET>
  DATABASE_URL=postgresql://aether_user:secure_password@postgres_db:5432/aether_db
  ```
- Important: Do NOT commit these secrets to the repository. The local `.env` file in your workspace should be used (gitignored).

## Current status & roadmap (facts-only)
- Implemented and present
  - User registration/login (JWT-based) — `main_server/app/security.py`, `main_server/app/main.py`
  - File upload, listing, download link generation (Azure) — endpoints in `main_server/app/main.py`
  - Client-side master key & per-file key derivation and metadata decryption — `frontend/aether-drive/src/crypto/crypto-utils.ts`, `useFiles.ts`
  - AI ingest & chat flows implemented end-to-end in code: Main API → gRPC → AI service (see `main_server/app/main.py` and `ai_server/core/*`)
  - RAG storage encrypts vectors payloads before writing to Qdrant (`ai_server/core/rag.py`)
- Observations / low-risk actionable items
  - `frontend/aether-drive/src/api/client.ts` is empty — consider centralizing API client logic there for consistency.
  - Frontend `BASE_URL` is hard-coded to `http://localhost:8000` in hooks — could be environment-driven for production builds.
  - No end-to-end tests found in repo root; adding a small integration smoke test for ingest/chat is advisable.
- Roadmap suggestions (conservative, not prescriptive)
  - Add explicit server-side policy for transient plaintext handling and logging redaction.
  - Harden key handling: consider ephemeral session tokens for ingest/chat to limit key replay windows.
  - Add CI checks that the frontend `client.ts` is implemented and that no secrets are committed.

## Design philosophy
- Privacy-first: minimize persistent exposure of user secrets; master key never persisted to disk by the frontend.
- Minimal trust for storage: files and RAG payloads are stored encrypted; the system requires per-file keys at runtime to produce plaintext for AI functionalities.
- Clear separation of responsibilities: frontend owns key derivation and unlocking UX; Main API orchestrates storage and authentication; AI service manages document conversion, vectorization and secure storage of embeddings.
- Pragmatic engineering: use Docker Compose for reproducible local environments; prefer established libraries (FastAPI, SQLModel, Qdrant, genai) and standard crypto primitives.

## Relevant files (quick pointers)
- Frontend
  - `frontend/aether-drive/src/crypto/crypto-utils.ts`
  - `frontend/aether-drive/src/context/AuthContext.tsx`
  - `frontend/aether-drive/src/hooks/useFiles.ts`
  - `frontend/aether-drive/src/hooks/useAIChat.ts`
- Backend
  - `main_server/app/main.py`
  - `main_server/app/crypto_utils.py`
  - `main_server/app/security.py`
  - `main_server/app/azure_handler.py` (referenced)
- AI microservice
  - `ai_server/core/processor.py`
  - `ai_server/core/rag.py`
  - `ai_server/core/crypto_utils.py`
- Orchestration
  - `docker-compose.yml`
  - `protos/cortex.proto`

## Try it (quick checklist)
- Set environment variables in a local `.env` (do not commit).
- Start the backend ecosystem:
  - `docker compose up --build` (from repo root)
- Start frontend dev server:
  - `cd frontend/aether-drive && npm install && npm run dev`
- Open the frontend in the browser (Vite default port) and register a user. Unlock the master key by the app’s login flow and try upload → ingest → AI chat.

## Completion note
- This README documents only what is present in code and configuration files (no assumptions about external deployment beyond docker-compose). For further hardening and production readiness, add secrets management, automated tests, and formal documentation for operational runbooks.
