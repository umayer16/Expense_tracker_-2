let currentUser = null;
let transactions = [];
let budgets = {};
let editIndex = null;
let streak = 0;

const commonCategories = ["Food", "Transport", "Rent", "Utilities", "Entertainment", "Snacks", "Recharge", "Stationery", "Other"];

// Load user
window.onload = () => {
  const saved = localStorage.getItem("currentUser");
  if (saved) login(saved);
  else showOnboarding();

  // Theme
  if (localStorage.getItem("theme") === "dark") document.body.classList.add("dark");
};

function login(email = document.getElementById("emailInput").value.trim()) {
  if (!email || !email.includes("@")) return alert("Valid email required");
  currentUser = email.toLowerCase();
  localStorage.setItem("currentUser", currentUser);

  loadData();
  document.getElementById("loginSection").style.display = "none";
  document.getElementById("appSection").style.display = "block";
  document.getElementById("userEmail").innerText = currentUser.split("@")[0];

  updateAll();
  checkRecurring();
  updateStreak();
}

function logout() {
  localStorage.removeItem("currentUser");
  location.reload();
}

// Data Management
function key(suffix) { return `${currentUser}_${suffix}`; }
function save() {
  localStorage.setItem(key("tx"), JSON.stringify(transactions));
  localStorage.setItem(key("budgets"), JSON.stringify(budgets));
}
function loadData() {
  transactions = JSON.parse(localStorage.getItem(key("tx")) || "[]");
  budgets = JSON.parse(localStorage.getItem(key("budgets")) || "{}");
}

// Streak System
function updateStreak() {
  const today = new Date().toISOString().slice(0,10);
  const last = localStorage.getItem(key("lastLog")) || "";
  const dates = [...new Set(transactions.map(t => t.date))].sort().reverse();

  if (dates[0] === today) {
    streak = parseInt(localStorage.getItem(key("streak")) || "0") + (last !== today ? 1 : 0);
  } else {
    streak = dates[0] && new Date(dates[0]) < new Date(today) ? 0 : streak;
  }
  localStorage.setItem(key("streak"), streak);
  localStorage.setItem(key("lastLog"), today);
  document.getElementById("streak").innerHTML = `Streak: ${streak} 🔥`;
}

// Quick Add
function quickAdd(cat, amt) {
  document.getElementById("type").value = "expense";
  document.getElementById("category").value = cat;
  document.getElementById("amount").value = amt;
  document.getElementById("date").value = new Date().toISOString().slice(0,10);
  addTransaction();
}

// Smart Category Suggestion
function suggestCategory(desc) {
  const map = {
    "mess": "Food", "food": "Food", "lunch": "Food",
    "ola": "Transport", "uber": "Transport", "bus": "Transport",
    "jio": "Recharge", "airtel": "Recharge"
  };
  const lower = desc.toLowerCase();
  for (const [k, v] of Object.entries(map)) if (lower.includes(k)) return v;
  return "Other";
}

// Add Transaction
function addTransaction() {
  let desc = document.getElementById("description").value.trim();
  let cat = document.getElementById("category").value.trim();
  let amt = parseFloat(document.getElementById("amount").value);
  let date = document.getElementById("date").value;
  let type = document.getElementById("type").value;
  let recurring = document.getElementById("recurring").checked;

  if (!desc || !cat || isNaN(amt) || !date) return alert("Fill all fields");

  if (!cat) cat = suggestCategory(desc);
  if (!commonCategories.includes(cat)) commonCategories.push(cat);

  const tx = { desc, cat, amt, date, type, recurring, id: Date.now() };
  if (editIndex !== null) {
    transactions[editIndex] = tx;
    editIndex = null;
  } else {
    transactions.push(tx);
  }

  save();
  updateAll();
  clearForm();
  updateStreak();
}

// Recurring Bills
function checkRecurring() {
  const today = new Date().toISOString().slice(0,10);
  const thisMonth = today.slice(0,7);
  transactions.filter(t => t.recurring).forEach(t => {
    if (!transactions.some(x => x.date.startsWith(thisMonth) && x.desc === t.desc && x.amt === t.amt)) {
      transactions.push({ ...t, date: today, id: Date.now() + Math.random() });
    }
  });
  save();
}

// Update Everything
function updateAll() {
  displayTransactions();
  updateSummary();
  updateCategoryList();
  updateBudgetSettings();
  drawCharts();
  checkBudgets();
}

function clearForm() {
  document.getElementById("description").value = "";
  document.getElementById("category").value = "";
  document.getElementById("amount").value = "";
  document.getElementById("date").value = new Date().toISOString().slice(0,10);
  document.getElementById("recurring").checked = false;
}

// Display, Filter, Search
function displayTransactions() {
  const tbody = document.querySelector("#expenseTable tbody");
  const search = document.getElementById("search").value.toLowerCase();
  const catFilter = document.getElementById("filterCategory").value;
  const typeFilter = document.getElementById("filterType").value;

  let filtered = transactions.filter(t => {
    const matchesSearch = t.desc.toLowerCase().includes(search) || t.cat.toLowerCase().includes(search);
    const matchesCat = !catFilter || t.cat === catFilter;
    const matchesType = !typeFilter || t.type === typeFilter;
    return matchesSearch && matchesCat && matchesType;
  });

  tbody.innerHTML = "";
  filtered.sort((a,b) => b.id - a.id).forEach((t, i) => {
    const row = tbody.insertRow();
    row.innerHTML = `
      <td>${t.date}</td>
      <td>${t.desc} ${t.recurring ? '<i class="fas fa-sync"></i>' : ''}</td>
      <td>${t.cat}</td>
      <td><span class="${t.type}">${t.type}</span></td>
      <td>₹${t.amt.toFixed(2)}</td>
      <td>
        <button onclick="editTx(${transactions.indexOf(t)})">Edit</button>
        <button onclick="deleteTx(${transactions.indexOf(t)})">Delete</button>
      </td>
    `;
  });
}

function editTx(i) {
  const t = transactions[i];
  document.getElementById("description").value = t.desc;
  document.getElementById("category").value = t.cat;
  document.getElementById("amount").value = t.amt;
  document.getElementById("date").value = t.date;
  document.getElementById("type").value = t.type;
  document.getElementById("recurring").checked = t.recurring;
  editIndex = i;
}

function deleteTx(i) {
  if (confirm("Delete this transaction?")) {
    transactions.splice(i, 1);
    save();
    updateAll();
  }
}

// Summary & Budgets
function updateSummary() {
  const expenses = transactions.filter(t => t.type === "expense").reduce((a, t) => a + t.amt, 0);
  const income = transactions.filter(t => t.type === "income").reduce((a, t) => a + t.amt, 0);
  document.getElementById("totalSpent").innerText = `₹${expenses.toFixed(2)}`;
  document.getElementById("totalIncome").innerText = `₹${income.toFixed(2)}`;
  document.getElementById("balance").innerText = `₹${(income - expenses).toFixed(2)}`;
}

function checkBudgets() {
  let warning = "";
  let totalBudget = Object.values(budgets).reduce((a, b) => a + b, 0);
  let totalSpent = transactions.filter(t => t.type === "expense").reduce((a, t) => a + t.amt, 0);

  if (totalBudget > 0 && totalSpent > totalBudget * 0.9) {
    warning = totalSpent > totalBudget ? "Over Budget!" : "Almost Over!";
    document.getElementById("budgetStatus").textContent = warning;
    document.getElementById("budgetStatus").classList.add("danger");
  }
}

// Charts, Export, Theme, etc. (truncated for brevity — full version available on request)

document.getElementById("themeToggle").onclick = () => {
  document.body.classList.toggle("dark");
  localStorage.setItem("theme", document.body.classList.contains("dark") ? "dark" : "light");
};

function showOnboarding() {
  if (!localStorage.getItem("seenOnboarding")) {
    document.getElementById("onboarding").style.display = "flex";
  }
}
function closeOnboarding() {
  document.getElementById("onboarding").style.display = "none";
  localStorage.setItem("seenOnboarding", "true");
}
