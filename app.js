const STORAGE_KEY = "fromage-club-db-v3";

const defaultState = {
  users: [],
  membershipPlans: [
    {
      id: "cheese",
      name: "Cheese Club",
      tier: "starter",
      priceRange: "R699–R899",
      cadence: "monthly",
      includes: [
        "3–4 local cheeses (±700g–1.2kg)",
        "1–2 accompaniments (crackers/chutney/fruit paste)",
        "Digital tasting notes + wine pairing guide"
      ],
      bestFor: "People who want cheese-only delivery with wine pairing insights"
    }
  ],
  subscriptions: [],
  preferences: [],
  addresses: [],
  products: [],
  monthlyBox: {
    month: "April 2026",
    items: [
      "Hero: Dalewood Winelands Camembert",
      "Crowd pleaser: Mature cheddar wedge",
      "Wildcard: Smoked goat log",
      "Accompaniments: Seeded crackers + fig preserve",
      "Wine guidance: Chenin Blanc / MCC / Pinotage"
    ]
  },
  wineCollection: [],
  pairingHistory: [],
  fulfillment: [],
  complianceFlags: [],
  churnEvents: []
};

const dom = {
  plansGrid: document.querySelector("#plansGrid"),
  planSelect: document.querySelector("select[name='plan']"),
  boxTitle: document.querySelector("#boxTitle"),
  boxItems: document.querySelector("#boxItems"),
  subscriptionForm: document.querySelector("#subscriptionForm"),
  subscriptionView: document.querySelector("#subscriptionView"),
  segments: document.querySelector("#segments"),
  churnSummary: document.querySelector("#churnSummary"),
  boxBuilder: document.querySelector("#boxBuilder"),
  packingListBtn: document.querySelector("#packingListBtn"),
  labelsBtn: document.querySelector("#labelsBtn"),
  downloadLink: document.querySelector("#downloadLink"),
  installBtn: document.querySelector("#installBtn"),
  wineCollectionForm: document.querySelector("#wineCollectionForm"),
  wineCollectionList: document.querySelector("#wineCollectionList"),
  pairingBtn: document.querySelector("#pairingBtn"),
  pairingOutput: document.querySelector("#pairingOutput"),
  llmStatus: document.querySelector("#llmStatus")
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(defaultState);
    return { ...structuredClone(defaultState), ...JSON.parse(raw) };
  } catch {
    return structuredClone(defaultState);
  }
}

let state = loadState();

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function currency(range) {
  return `${range} / month`;
}

function renderPlans() {
  dom.plansGrid.innerHTML = "";
  dom.planSelect.innerHTML = "";

  state.membershipPlans.forEach((plan) => {
    const article = document.createElement("article");
    article.className = "plan";
    article.innerHTML = `
      <span class="badge">${plan.tier}</span>
      <h3>${plan.name}</h3>
      <p class="price">${currency(plan.priceRange)}</p>
      <ul>${plan.includes.map((item) => `<li>${item}</li>`).join("")}</ul>
      <p><strong>Best for:</strong> ${plan.bestFor}</p>
    `;
    dom.plansGrid.append(article);

    const option = document.createElement("option");
    option.value = plan.id;
    option.textContent = `${plan.name} (${currency(plan.priceRange)})`;
    dom.planSelect.append(option);
  });
}

function renderBox() {
  dom.boxTitle.textContent = state.monthlyBox.month;
  dom.boxItems.innerHTML = "";
  state.monthlyBox.items.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    dom.boxItems.append(li);
  });
}

function renderWineCollection() {
  dom.wineCollectionList.innerHTML = "";

  if (!state.wineCollection.length) {
    const li = document.createElement("li");
    li.textContent = "No wines added yet. Add your first bottle to get pairings.";
    dom.wineCollectionList.append(li);
    return;
  }

  state.wineCollection.forEach((wine) => {
    const li = document.createElement("li");
    li.textContent = `${wine.name} (${wine.style}) • ${wine.vintage || "NV"}`;
    dom.wineCollectionList.append(li);
  });
}

function getActiveSubscription() {
  return state.subscriptions.find((sub) => sub.status !== "cancelled") || null;
}

function setSubscriptionView() {
  const sub = getActiveSubscription();
  dom.subscriptionView.textContent = sub ? JSON.stringify(sub, null, 2) : "No subscription yet.";
}

function recomputeAdminMetrics() {
  const subs = state.subscriptions;
  const redFans = subs.filter((s) => s.preferences.wine_pref === "red").length;
  const mixed = subs.filter((s) => s.preferences.wine_pref === "mixed").length;
  const goatFans = subs.filter((s) => (s.preferences.cheese_pref || "").toLowerCase().includes("goat")).length;
  const active = subs.filter((s) => s.status === "active").length;
  const paused = subs.filter((s) => s.status === "paused").length;
  const cancelled = subs.filter((s) => s.status === "cancelled").length;

  dom.segments.innerHTML = `
    <li>Red-pref pairing readers: <strong>${redFans}</strong></li>
    <li>Mixed-pref pairing readers: <strong>${mixed}</strong></li>
    <li>Goat-cheese fans: <strong>${goatFans}</strong></li>
    <li>Active members: <strong>${active}</strong> • Paused: <strong>${paused}</strong></li>
  `;

  const totalEver = subs.length || 1;
  const churnRate = ((cancelled / totalEver) * 100).toFixed(1);
  const reasons = state.churnEvents.reduce((acc, evt) => {
    acc[evt.reason] = (acc[evt.reason] || 0) + 1;
    return acc;
  }, {});
  const topReason = Object.entries(reasons).sort((a, b) => b[1] - a[1])[0];
  dom.churnSummary.textContent = `Cancelled: ${cancelled}/${subs.length} (${churnRate}%). Top reason: ${topReason ? `${topReason[0]} (${topReason[1]})` : "n/a"}.`;
}

function nextBillDate() {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
}

function submitSubscription(event) {
  event.preventDefault();
  const fd = new FormData(dom.subscriptionForm);

  const userId = crypto.randomUUID();
  const subscriptionId = crypto.randomUUID();

  state.users.push({ id: userId, created_at: new Date().toISOString() });

  state.preferences.push({
    user_id: userId,
    wine_pref: fd.get("wine_pref"),
    cheese_pref: fd.get("cheese_pref"),
    allergens: fd.get("allergens")
  });

  state.addresses.push({
    user_id: userId,
    address_line: fd.get("address")
  });

  state.subscriptions.push({
    id: subscriptionId,
    user_id: userId,
    plan_id: "cheese",
    status: "active",
    next_bill_date: nextBillDate(),
    pause_until: null,
    preferences: {
      wine_pref: fd.get("wine_pref"),
      cheese_pref: fd.get("cheese_pref"),
      allergens: fd.get("allergens")
    },
    address: fd.get("address"),
    gift_month: false,
    created_at: new Date().toISOString()
  });

  state.fulfillment.push({
    subscription_id: subscriptionId,
    month: state.monthlyBox.month,
    pick_pack_status: "queued",
    courier_tracking: null
  });

  persist();
  dom.subscriptionForm.reset();
  refreshAll();
}

function mutateSubscription(action) {
  const sub = getActiveSubscription();
  if (!sub) return;

  if (action === "skip") {
    const d = new Date(sub.next_bill_date);
    d.setMonth(d.getMonth() + 1);
    sub.next_bill_date = d.toISOString().slice(0, 10);
  }

  if (action === "pause") {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    sub.status = "paused";
    sub.pause_until = d.toISOString().slice(0, 10);
  }

  if (action === "address") {
    sub.address = "Updated via member portal";
  }

  if (action === "gift") {
    sub.gift_month = true;
  }

  if (action === "cancel") {
    sub.status = "cancelled";
    state.churnEvents.push({
      subscription_id: sub.id,
      reason: "price_sensitivity",
      at: new Date().toISOString()
    });
  }

  persist();
  refreshAll();
}

function saveMonthlyBox(event) {
  event.preventDefault();
  const fd = new FormData(dom.boxBuilder);
  const items = String(fd.get("items"))
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

  state.monthlyBox = {
    month: String(fd.get("month")),
    items
  };

  persist();
  renderBox();
}

function toCsv(rows) {
  return rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
}

function triggerDownload(filename, content) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  dom.downloadLink.href = url;
  dom.downloadLink.download = filename;
  dom.downloadLink.click();
  URL.revokeObjectURL(url);
}

function exportPackingList() {
  const rows = [["month", "subscription_id", "plan_id", "status", "allergens"]];
  state.subscriptions.forEach((sub) => {
    rows.push([state.monthlyBox.month, sub.id, sub.plan_id, sub.status, sub.preferences.allergens || "none"]);
  });
  triggerDownload("packing-list.csv", toCsv(rows));
}

function exportDeliveryLabels() {
  const rows = [["subscription_id", "address", "delivery_window"]];
  state.subscriptions.forEach((sub) => {
    rows.push([sub.id, sub.address, "09:00-17:00"]);
  });
  triggerDownload("delivery-labels.csv", toCsv(rows));
}

function addWineToCollection(event) {
  event.preventDefault();
  const fd = new FormData(dom.wineCollectionForm);

  state.wineCollection.push({
    id: crypto.randomUUID(),
    name: String(fd.get("wine_name")),
    style: String(fd.get("wine_style")),
    vintage: String(fd.get("wine_vintage") || ""),
    notes: String(fd.get("wine_notes") || "")
  });

  persist();
  dom.wineCollectionForm.reset();
  renderWineCollection();
}

function fallbackPairings() {
  const styleToCheese = {
    red: ["Aged cheddar", "Gouda", "Smoked provolone"],
    white: ["Brie", "Camembert", "Goat cheese"],
    rose: ["Feta", "Havarti", "Young cheddar"],
    sparkling: ["Parmesan", "Gruyère", "Triple cream brie"],
    dessert: ["Blue cheese", "Gorgonzola", "Mascarpone"]
  };

  return state.wineCollection.map((wine) => {
    const cheese = styleToCheese[wine.style] || ["Farmhouse cheddar", "Brie"];
    return {
      wine: wine.name,
      suggestion: `${wine.name}: try ${cheese.slice(0, 2).join(" + ")} and add fig preserve.`
    };
  });
}

async function requestCheesePairingsFromLLM() {
  const payload = {
    instructions: "Suggest concise cheese pairings for each wine. Return JSON array with wine and suggestion.",
    wines: state.wineCollection
  };

  const response = await fetch("/api/llm/pairings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`LLM API request failed with status ${response.status}`);
  }

  const data = await response.json();
  if (!Array.isArray(data.pairings)) {
    throw new Error("Invalid LLM response shape");
  }

  return data.pairings;
}

async function generatePairings() {
  if (!state.wineCollection.length) {
    dom.pairingOutput.textContent = "Add at least one wine to generate pairings.";
    return;
  }

  dom.pairingBtn.disabled = true;
  dom.pairingBtn.textContent = "Generating...";

  let pairings;

  try {
    pairings = await requestCheesePairingsFromLLM();
    dom.llmStatus.textContent = "LLM status: connected to /api/llm/pairings";
  } catch {
    pairings = fallbackPairings();
    dom.llmStatus.textContent = "LLM status: offline fallback (configure /api/llm/pairings to enable live model output).";
  }

  state.pairingHistory = [
    {
      generated_at: new Date().toISOString(),
      pairings
    },
    ...state.pairingHistory
  ].slice(0, 5);

  dom.pairingOutput.textContent = pairings.map((item) => `• ${item.suggestion}`).join("\n");

  persist();
  dom.pairingBtn.disabled = false;
  dom.pairingBtn.textContent = "Get AI cheese pairings";
}

function setupEvents() {
  dom.subscriptionForm.addEventListener("submit", submitSubscription);
  dom.boxBuilder.addEventListener("submit", saveMonthlyBox);
  dom.packingListBtn.addEventListener("click", exportPackingList);
  dom.labelsBtn.addEventListener("click", exportDeliveryLabels);
  dom.wineCollectionForm.addEventListener("submit", addWineToCollection);
  dom.pairingBtn.addEventListener("click", generatePairings);

  document.querySelectorAll(".actions button").forEach((button) => {
    button.addEventListener("click", () => mutateSubscription(button.dataset.action));
  });
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

function refreshAll() {
  setSubscriptionView();
  recomputeAdminMetrics();
  renderBox();
  renderWineCollection();
}

function init() {
  renderPlans();
  setupEvents();
  setupInstallPrompt();
  setupServiceWorker();
  refreshAll();
}

init();
