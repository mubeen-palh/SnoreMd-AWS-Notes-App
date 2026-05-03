# Snore MD — Patient Follow-Up Notes

Full-stack prototype of the patient follow-up notes feature: clinicians can create, list,
filter, edit, soft-delete notes for a patient and attach files.

| Folder                                       | What it is                                         |
|----------------------------------------------|----------------------------------------------------|
| [notes-backend/](notes-backend/)             | Serverless API — 7 Lambda handlers + SAM template  |
| [notes-frontend/](notes-frontend/)           | React 18 + Vite SPA                                |
| [architecture.md](architecture.md)           | System-design write-up + diagram (Part 1)          |

---

## Repository layout

```
snoremd-notes-app/
├── architecture.md
├── README.md
├── notes-backend/
│   ├── template.yaml                # IaC: Notes table + 7 routes
│   ├── samconfig.toml
│   ├── env.json                     # local env vars for sam local
│   ├── package.json
│   ├── src/handlers/
│   │   ├── create-note.mjs
│   │   ├── list-notes.mjs
│   │   ├── get-note-by-id.mjs
│   │   ├── update-note.mjs          # optimistic concurrency via If-Match
│   │   ├── delete-note.mjs          # soft delete (deletedAt)
│   │   ├── presign-upload.mjs       # 5-min PUT URL
│   │   └── get-attachment-url.mjs   # 10-min GET URL
│   ├── events/                      # sample payloads for sam local invoke
│   └── __tests__/unit/handlers/
└── notes-frontend/
    ├── vite.config.js
    ├── index.html
    ├── .env                         # VITE_API_BASE_URL=http://127.0.0.1:3000
    └── src/
        ├── main.jsx
        ├── App.jsx                  # patient picker, paging, edit/delete wiring
        ├── api.js                   # fetch wrapper, mocked auth headers, endpoints
        ├── index.css
        ├── components/
        │   ├── NoteForm.jsx   (+ test)   # create + edit form, file upload
        │   ├── NoteList.jsx              # renders a page of notes
        │   ├── NoteItem.jsx   (+ test)   # one note + attachment link + actions
        │   └── Filters.jsx    (+ test)   # debounced q / tag / from / to
        └── test/setup.js
```

---

## API endpoints

Base URL is `http://127.0.0.1:3000` when running locally with `sam local start-api`.

| Method | Path                                   | Handler                                   |
|--------|----------------------------------------|-------------------------------------------|
| POST   | `/patients/{patientId}/notes`          | `create-note.mjs`                         |
| GET    | `/patients/{patientId}/notes`          | `list-notes.mjs` — supports `limit`, `cursor`, `tag`, `q`, `from`, `to` |
| GET    | `/patients/{patientId}/notes/{noteId}` | `get-note-by-id.mjs`                      |
| PUT    | `/patients/{patientId}/notes/{noteId}` | `update-note.mjs` — requires `If-Match: <version>` (returns 412 on mismatch) |
| DELETE | `/patients/{patientId}/notes/{noteId}` | `delete-note.mjs` — sets `deletedAt`      |
| POST   | `/uploads/presign`                     | `presign-upload.mjs`                      |
| GET    | `/attachments?key=<key>`               | `get-attachment-url.mjs`                  |

Every request expects two mocked-identity headers (the frontend sets them automatically):

```
X-User-Id:   user-1
X-Clinic-Id: clinic1
```

---

## Data model

DynamoDB table `Notes` (defined in [template.yaml](notes-backend/template.yaml)):

| Attribute       | Role                                                   |
|-----------------|--------------------------------------------------------|
| `patientId`     | **Partition key**                                      |
| `noteId`        | **Sort key** (UUID v4)                                 |
| `content`       | Free-text note                                         |
| `tags`          | Array of strings                                       |
| `studyDate`     | `YYYY-MM-DD`                                           |
| `attachmentKey` | S3 object key (optional)                               |
| `version`       | Optimistic-concurrency token; starts at `1`            |
| `authorId`      | From `X-User-Id` (would be JWT `sub` in production)    |
| `clinicId`      | From `X-Clinic-Id` (tenant scope)                      |
| `createdAt`     | ISO-8601                                               |
| `updatedAt`     | ISO-8601, written by `update-note`                     |
| `deletedAt`     | ISO-8601, set by soft-delete; filtered from reads      |

Attachments live in the S3 bucket named by `ATTACHMENTS_BUCKET`
(default: `snoremd-notes-attachments-mubeen-2026`, set in `template.yaml` `Globals`).

---

## Authentication approach

Auth is **mocked** — the brief explicitly allows this. The frontend
([api.js](notes-frontend/src/api.js)) sends `X-User-Id` and `X-Clinic-Id` on every request;
the backend reads them as if they were verified JWT claims (`sub` and `clinicId`).

If the headers are missing, the backend falls back to `user1` / `clinic1` so raw
curl/Postman calls still work. Full notes on swapping this for real JWT verification
are in [notes-backend/README.md](notes-backend/README.md#authentication-mocked).

---

## Advanced features implemented

The brief asked for at least one; this repo ships four:

1. **Pre-signed S3 attachment uploads** — [presign-upload.mjs](notes-backend/src/handlers/presign-upload.mjs) returns a 5-minute PUT URL; the file is uploaded directly from the browser ([NoteForm.jsx](notes-frontend/src/components/NoteForm.jsx) → `uploadAttachment` in [api.js](notes-frontend/src/api.js)). Reads use a 10-minute GET URL via [get-attachment-url.mjs](notes-backend/src/handlers/get-attachment-url.mjs).
2. **Optimistic concurrency on updates** — `If-Match: <version>` header is required by [update-note.mjs](notes-backend/src/handlers/update-note.mjs); the conditional `UpdateExpression` increments `version` and returns **412 Precondition Failed** on mismatch.
3. **Stable cursor pagination + server-side filtering** — [list-notes.mjs](notes-backend/src/handlers/list-notes.mjs) wraps DynamoDB `LastEvaluatedKey` as a base64 cursor and supports `tag`, `q` (substring), `from`, `to`.
4. **Soft delete** — [delete-note.mjs](notes-backend/src/handlers/delete-note.mjs) sets `deletedAt`; both `list` and `get` exclude rows that have it.

---

## Running locally

**Prerequisites:** Node.js 18+, Docker (for `sam local`), AWS SAM CLI, AWS credentials with read/write access to the `Notes` table and the attachments bucket in `ap-south-1`. (DynamoDB and S3 are real; only API Gateway + Lambda run locally.)

### Backend — http://127.0.0.1:3000

```bash
cd notes-backend
npm install
sam build
sam local start-api --env-vars env.json
```

### Frontend — http://localhost:5173

In a second terminal:

```bash
cd notes-frontend
npm install
npm run dev
```

The SPA reads `VITE_API_BASE_URL` from [.env](notes-frontend/.env).

### Smoke test in the browser

1. Open http://localhost:5173 — patient ID defaults to `p1`.
2. Create a note with content + tags; optionally attach a file.
3. Filter by tag, search, or date range.
4. Click **Edit** → change content → **Update Note** (uses `If-Match`).
5. Click **Delete** → row is soft-deleted and disappears from the list.

### Or hit the API directly

```bash
# Create
curl -X POST http://127.0.0.1:3000/patients/p1/notes \
  -H "Content-Type: application/json" \
  -H "X-User-Id: user-1" -H "X-Clinic-Id: clinic1" \
  -d '{"content":"Patient stable post-CPAP","tags":["cpap","followup"],"studyDate":"2026-04-20"}'

# List
curl "http://127.0.0.1:3000/patients/p1/notes?tag=cpap&limit=5"

# Update with optimistic concurrency
curl -X PUT http://127.0.0.1:3000/patients/p1/notes/<noteId> \
  -H "If-Match: 1" -H "Content-Type: application/json" \
  -d '{"content":"Updated"}'
```

---

## Tests

```bash
cd notes-frontend && npm test     # Vitest + React Testing Library
cd notes-backend  && npm test     # Jest
```

Frontend tests cover [NoteForm](notes-frontend/src/components/NoteForm.test.jsx) (validation, edit-mode pre-fill, parsed values), [NoteItem](notes-frontend/src/components/NoteItem.test.jsx), and [Filters](notes-frontend/src/components/Filters.test.jsx). The Create → List → Get flow is exercised manually via the SPA against `sam local start-api`.

---

## Assumptions & limitations

- **Region is hard-coded to `ap-south-1`** in each handler — change the `DynamoDBClient`/`S3Client` `region` literal for other regions.
- **Auth is mocked.** `clinicId` is *persisted* on every write but not yet *enforced* as a read filter — adding `FilterExpression: clinicId = :clinicId` is the next step once headers are replaced with verified claims.
- The `q` substring filter is a DynamoDB `FilterExpression` (filters after the read). Fine at this scale, would move to a tag-keyed GSI or OpenSearch for larger tenants.
- The sample test files under [notes-backend/__tests__/unit/handlers/](notes-backend/__tests__/unit/handlers/) are scaffolding from the SAM starter template (they reference renamed handlers `get-all-items` / `put-item`) — they're left as a starting point; meaningful coverage lives in the frontend tests.
- No CI/CD, multi-env config, or audit-log pipeline (listed in the brief as optional bonuses).
