import * as XLSX from "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm";
import * as pdfjsLib from "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.6.82/+esm";
import mammoth from "https://cdn.jsdelivr.net/npm/mammoth@1.8.0/+esm";
import { pipeline } from "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2";

pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.6.82/build/pdf.worker.min.mjs";

const dom = {
  installBtn: document.querySelector("#installBtn"),
  ingestForm: document.querySelector("#ingestForm"),
  sourceFiles: document.querySelector("#sourceFiles"),
  ingestBtn: document.querySelector("#ingestBtn"),
  ingestStatus: document.querySelector("#ingestStatus"),
  searchForm: document.querySelector("#searchForm"),
  searchBtn: document.querySelector("#searchBtn"),
  searchStatus: document.querySelector("#searchStatus"),
  results: document.querySelector("#results")
};

const state = {
  embedder: null,
  records: []
};

async function getEmbedder() {
  if (!state.embedder) {
    dom.ingestStatus.textContent = "Loading embedding model (first run may take a minute)...";
    state.embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
  }

  return state.embedder;
}

async function embedText(input) {
  const embedder = await getEmbedder();
  const output = await embedder(input, { pooling: "mean", normalize: true });
  return Array.from(output.data);
}

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function buildRecord(input) {
  const cheese_name = cleanText(input.cheese_name || input.name || input.cheese || "Unknown cheese");
  const country = cleanText(input.country || input.origin || "Unknown");
  const milk_type = cleanText(input.milk_type || input.milk || "unknown");
  const texture = cleanText(input.texture || input.style || "unknown");
  const comment = cleanText(input.comment || input.notes || input.description || "");

  return {
    id: crypto.randomUUID(),
    cheese_name,
    country,
    milk_type,
    texture,
    comment,
    source: cleanText(input.source || "manual")
  };
}

async function parseExcel(file) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const parsed = [];

  workbook.SheetNames.forEach((sheetName) => {
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "" });
    rows.forEach((row) => {
      const record = buildRecord({ ...row, source: `${file.name}#${sheetName}` });
      if (record.comment || record.cheese_name !== "Unknown cheese") {
        parsed.push(record);
      }
    });
  });

  return parsed;
}

async function parsePdf(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
  const chunks = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = cleanText(content.items.map((item) => item.str).join(" "));
    if (!text) continue;

    chunks.push(
      buildRecord({
        cheese_name: `${file.name} (page ${pageNumber})`,
        comment: text,
        source: file.name
      })
    );
  }

  return chunks;
}

async function parseDocx(file) {
  const buffer = await file.arrayBuffer();
  const { value } = await mammoth.extractRawText({ arrayBuffer: buffer });
  const lines = value
    .split(/\n+/)
    .map((line) => cleanText(line))
    .filter((line) => line.length > 30);

  return lines.map((line, idx) =>
    buildRecord({
      cheese_name: `${file.name} (section ${idx + 1})`,
      comment: line,
      source: file.name
    })
  );
}

async function parseFile(file) {
  const lowerName = file.name.toLowerCase();

  if (lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls")) {
    return parseExcel(file);
  }

  if (lowerName.endsWith(".pdf")) {
    return parsePdf(file);
  }

  if (lowerName.endsWith(".docx")) {
    return parseDocx(file);
  }

  return [];
}

async function ingestFiles(event) {
  event.preventDefault();
  const files = Array.from(dom.sourceFiles.files || []);
  if (!files.length) return;

  dom.ingestBtn.disabled = true;
  dom.searchBtn.disabled = true;
  dom.results.innerHTML = "";

  const parsedRecords = [];
  for (const file of files) {
    dom.ingestStatus.textContent = `Parsing ${file.name}...`;
    const output = await parseFile(file);
    parsedRecords.push(...output);
  }

  if (!parsedRecords.length) {
    dom.ingestStatus.textContent = "No usable tasting records found in uploaded files.";
    dom.ingestBtn.disabled = false;
    return;
  }

  dom.ingestStatus.textContent = `Parsed ${parsedRecords.length} records. Creating embeddings...`;

  const embeddedRecords = [];
  for (let i = 0; i < parsedRecords.length; i += 1) {
    const record = parsedRecords[i];
    const embeddingInput = `${record.cheese_name}. ${record.country}. ${record.milk_type}. ${record.texture}. ${record.comment}`;
    const embedding = await embedText(embeddingInput);
    embeddedRecords.push({ ...record, embedding });
    dom.ingestStatus.textContent = `Embedding records: ${i + 1}/${parsedRecords.length}`;
  }

  state.records = embeddedRecords;
  dom.ingestStatus.textContent = `Ready: ${state.records.length} records indexed from ${files.length} file(s).`;
  dom.searchStatus.textContent = "Dictionary indexed. Run a query.";
  dom.searchBtn.disabled = false;
  dom.ingestBtn.disabled = false;
}

function tokenize(text) {
  return cleanText(text)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function keywordScore(queryText, record) {
  const queryTokens = new Set(tokenize(queryText));
  if (!queryTokens.size) return 0;

  const haystack = tokenize(`${record.cheese_name} ${record.country} ${record.milk_type} ${record.texture} ${record.comment}`);
  const tokenSet = new Set(haystack);

  let hits = 0;
  queryTokens.forEach((token) => {
    if (tokenSet.has(token)) hits += 1;
  });

  return hits / queryTokens.size;
}

function cosineSimilarity(vecA, vecB) {
  let dot = 0;
  let normA = 0;
  let normB = 0;

  const length = Math.min(vecA.length, vecB.length);
  for (let i = 0; i < length; i += 1) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (!normA || !normB) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function renderResult(row) {
  const article = document.createElement("article");
  article.className = "result-card";
  article.innerHTML = `
    <p class="small">${row.country} • ${row.milk_type} milk • ${row.texture}</p>
    <h3>${row.cheese_name}</h3>
    <p>${row.comment}</p>
    <p class="small">Source: ${row.source}</p>
    <p class="small">Keyword: ${row.keyword_score.toFixed(3)} • Semantic: ${row.semantic_score.toFixed(3)} • Hybrid: ${row.score.toFixed(3)}</p>
  `;

  dom.results.append(article);
}

async function runSearch(event) {
  event.preventDefault();
  if (!state.records.length) {
    dom.searchStatus.textContent = "Ingest files first.";
    return;
  }

  const fd = new FormData(dom.searchForm);
  const query = cleanText(fd.get("query"));
  const keywordWeight = Number(fd.get("keywordWeight"));
  const semanticWeight = Number(fd.get("semanticWeight"));
  const limit = Number(fd.get("limit"));

  if (!query) {
    dom.searchStatus.textContent = "Query cannot be empty.";
    return;
  }

  dom.searchStatus.textContent = "Embedding query and scoring records...";
  const queryEmbedding = await embedText(query);

  const ranked = state.records
    .map((record) => {
      const semantic_score = cosineSimilarity(queryEmbedding, record.embedding);
      const keyword_score = keywordScore(query, record);
      const score = (keyword_score * keywordWeight) + (semantic_score * semanticWeight);
      return { ...record, semantic_score, keyword_score, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  dom.results.innerHTML = "";
  ranked.forEach(renderResult);
  dom.searchStatus.textContent = `Found ${ranked.length} matching entries.`;
}

function setupInstallPrompt() {
  let deferredPrompt;
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    dom.installBtn.hidden = false;
  });

  dom.installBtn.addEventListener("click", async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    deferredPrompt = null;
    dom.installBtn.hidden = true;
  });
}

function setupServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./service-worker.js");
  }
}

function init() {
  dom.ingestForm.addEventListener("submit", ingestFiles);
  dom.searchForm.addEventListener("submit", runSearch);
  setupInstallPrompt();
  setupServiceWorker();
}

init();
