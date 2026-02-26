const STORAGE_KEY = "fromage-club-db-v2";

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
      bestFor: "People who already have wine at home"
    },
    {
      id: "cheese_wine",
      name: "Cheese + Wine Club",
      tier: "core",
      priceRange: "R1,199–R1,699",
      cadence: "monthly",
      includes: [
        "Everything in Cheese Club",
        "2 bottles (or 1 premium bottle)",
        "Red / White / Mixed month preference"
      ],
      bestFor: "Customers wanting complete pairings"
    },
    {
      id: "cellar",
      name: "Cellar Select",
      tier: "premium",
      priceRange: "R2,199–R3,499",
      cadence: "monthly",
      includes: [
        "Rarer cheeses + limited-release wines",
        "Quarterly tasting invitation",
        "Early access drops + member-only pricing"
      ],
      bestFor: "Collectors and gifting-heavy members"
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
      "Pairing: Chenin Blanc / MCC / Pinotage"
    ]
  },
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
  installBtn: document.querySelector("#installBtn")
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
    <li>Red lovers: <strong>${redFans}</strong></li>
    <li>Mixed-pref members: <strong>${mixed}</strong></li>
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

  state.complianceFlags.push({
    user_id: userId,
    age18_confirmed: fd.get("age18") === "on",
    id_checked_at_delivery: false
  });

  state.subscriptions.push({
    id: subscriptionId,
    user_id: userId,
    plan_id: fd.get("plan"),
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

  if (action === "upgrade") {
    sub.plan_id = "cellar";
    sub.status = "active";
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
  const rows = [["subscription_id", "address", "requires_age_verification", "delivery_window"]];
  state.subscriptions.forEach((sub) => {
    const compliance = state.complianceFlags.find((flag) => flag.user_id === sub.user_id);
    rows.push([sub.id, sub.address, compliance ? compliance.age18_confirmed : false, "09:00-17:00"]);
  });
  triggerDownload("delivery-labels.csv", toCsv(rows));
}

function setupEvents() {
  dom.subscriptionForm.addEventListener("submit", submitSubscription);
  dom.boxBuilder.addEventListener("submit", saveMonthlyBox);
  dom.packingListBtn.addEventListener("click", exportPackingList);
  dom.labelsBtn.addEventListener("click", exportDeliveryLabels);

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
}

function init() {
  renderPlans();
  setupEvents();
  setupInstallPrompt();
  setupServiceWorker();
  refreshAll();
}

init();
