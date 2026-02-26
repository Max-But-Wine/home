const STORAGE_KEY = "cellar-rind-blog-v1";

const blogPosts = [
  {
    title: "A Rainy Friday Pairing: Chenin Blanc + Triple Cream Brie",
    date: "2026-02-10",
    excerpt: "Bright acid, soft texture, and enough richness to make rainy evenings feel luxurious.",
    tags: ["white", "bloomy rind", "easy pairing"]
  },
  {
    title: "How I Build a Cheese Board Around One Bottle",
    date: "2026-02-03",
    excerpt: "Start with one anchor wine, then choose contrast, harmony, and one surprise cheese.",
    tags: ["hosting", "guide", "red"]
  },
  {
    title: "Blue Cheese Myths That Need to Retire",
    date: "2026-01-29",
    excerpt: "Blue is not always aggressive: style, age, and moisture matter more than color.",
    tags: ["blue", "education", "dessert wine"]
  }
];

const cellarNotes = [
  "Crémant de Loire with aged Comté (nutty + citrus lift).",
  "Sauvignon Blanc with fresh chèvre and lemon zest.",
  "Pinot Noir with Tomme-style alpine cheese.",
  "Late harvest Riesling with creamy blue cheese."
];

const pairingGuide = {
  sparkling: {
    bloomy: "Sparkling + bloomy rind is elegant and creamy. Add toasted almonds for crunch.",
    goat: "Sparkling cuts through tangy goat cheese beautifully; add cucumber and herbs.",
    hard: "Try sparkling with hard aged cheese and salty crackers for contrast.",
    blue: "A richer sparkling style can tame salty blue. Add pear slices.",
    washed: "Sparkling refreshes the palate after washed rind intensity."
  },
  white: {
    bloomy: "Creamy bloomy rind loves crisp white wine with good acidity.",
    goat: "Classic match: zesty white with fresh goat cheese and green herbs.",
    hard: "Oaked white pairs nicely with nutty hard cheeses.",
    blue: "Aromatic white can complement gentler blue cheeses.",
    washed: "Choose a textured white to stand up to washed rind funk."
  },
  rose: {
    bloomy: "Rosé keeps bloomy rind pairings light and picnic-friendly.",
    goat: "Dry rosé and goat cheese are bright, savory, and refreshing.",
    hard: "Rosé + hard cheese works best with fruit chutney on the side.",
    blue: "Try fuller rosé with mild blue and roasted nuts.",
    washed: "Rosé can mellow washed rind heat when served well chilled."
  },
  red: {
    bloomy: "Soft reds pair better with bloomy rind than high-tannin reds.",
    goat: "Go for juicy, lower-tannin reds with fresh goat cheese.",
    hard: "This is a classic: red wine + hard aged cheese + charcuterie.",
    blue: "Bold red can overpower blue—choose balanced, fruit-forward styles.",
    washed: "Earthy reds can mirror washed rind complexity."
  },
  dessert: {
    bloomy: "Dessert wine with bloomy rind is decadent and silky.",
    goat: "Sweet wines work with goat cheese when paired with honey.",
    hard: "Aged hard cheese and dessert wine bring out caramel notes.",
    blue: "The iconic pairing: dessert wine and blue cheese.",
    washed: "Try just a small pour—dessert wine can soften washed rind intensity."
  }
};

const dom = {
  postGrid: document.querySelector("#postGrid"),
  pairingForm: document.querySelector("#pairingForm"),
  pairingOutput: document.querySelector("#pairingOutput"),
  cellarNotes: document.querySelector("#cellarNotes"),
  subscribeForm: document.querySelector("#subscribeForm"),
  subscribeStatus: document.querySelector("#subscribeStatus"),
  installBtn: document.querySelector("#installBtn")
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { subscriberEmail: "" };
  } catch {
    return { subscriberEmail: "" };
  }
}

let state = loadState();

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function formatDate(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

function renderPosts() {
  dom.postGrid.innerHTML = "";

  blogPosts.forEach((post) => {
    const article = document.createElement("article");
    article.className = "post";
    article.innerHTML = `
      <p class="small">${formatDate(post.date)}</p>
      <h3>${post.title}</h3>
      <p>${post.excerpt}</p>
      <p class="small">Tags: ${post.tags.join(" • ")}</p>
    `;
    dom.postGrid.append(article);
  });
}

function renderCellarNotes() {
  dom.cellarNotes.innerHTML = "";

  cellarNotes.forEach((note) => {
    const li = document.createElement("li");
    li.textContent = note;
    dom.cellarNotes.append(li);
  });
}

function suggestPairing(event) {
  event.preventDefault();
  const fd = new FormData(dom.pairingForm);
  const wineStyle = String(fd.get("wineStyle"));
  const cheeseType = String(fd.get("cheeseType"));

  const suggestion = pairingGuide[wineStyle]?.[cheeseType] || "Try what you have and trust your palate.";
  dom.pairingOutput.textContent = `Suggestion: ${suggestion}`;
}

function updateSubscriptionStatus() {
  dom.subscribeStatus.textContent = state.subscriberEmail
    ? `Subscribed as ${state.subscriberEmail}.`
    : "No subscription yet.";
}

function subscribe(event) {
  event.preventDefault();
  const fd = new FormData(dom.subscribeForm);
  state.subscriberEmail = String(fd.get("email")).trim();
  persist();
  dom.subscribeForm.reset();
  updateSubscriptionStatus();
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
  renderPosts();
  renderCellarNotes();
  updateSubscriptionStatus();

  dom.pairingForm.addEventListener("submit", suggestPairing);
  dom.subscribeForm.addEventListener("submit", subscribe);

  setupInstallPrompt();
  setupServiceWorker();
}

init();
