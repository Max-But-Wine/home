# Cheesemonger Atlas (PWA)

Cheesemonger Atlas is a document-powered cheese dictionary web app for cheesemongers.

Instead of relying on an external database, this version ingests source documents directly:

- Excel (`.xlsx`, `.xls`)
- PDF (`.pdf`)
- Word (`.docx`)

The app parses files in-browser, creates embeddings locally, and runs hybrid retrieval (keyword + semantic similarity) against the indexed records.

## Core workflow

1. Upload one or more cheese source documents.
2. App extracts structured/unstructured entries.
3. App generates embeddings with `all-MiniLM-L6-v2` in browser.
4. Run hybrid queries and tune keyword/semantic weights.

## Notes on file formats

### Excel
Use columns like:

- `cheese_name`
- `country`
- `milk_type`
- `texture`
- `comment`

Aliases such as `name`, `origin`, `milk`, `style`, `notes`, and `description` are also mapped.

### PDF and DOCX
These are chunked into searchable entries based on page/section text and indexed as tasting-note records.

## Local run

```bash
python3 -m http.server 4173
```

Open `http://localhost:4173`.

## Tech stack

- Static frontend: HTML + CSS + JavaScript modules.
- Parsing libraries:
  - `xlsx`
  - `pdfjs-dist`
  - `mammoth`
- Semantic embeddings:
  - `@xenova/transformers` (`all-MiniLM-L6-v2`)

## Open resource direction

- Encourage shops and guilds to share common templates.
- Publish source documents with attribution.
- Re-ingest revised sheets/guides as your catalog grows.
