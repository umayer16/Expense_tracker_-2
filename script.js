const FORECAST_API_KEY = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIwMTk4YTgxMC0xM2JhLTcxZjktYWNjMS0wYzQ5MDA5ZDE2NWIiLCJqdGkiOiJiOGJlZGRhNjg5NGIzN2JlOThjOWNmZTc5ZmNlNDNhOTQxZmMwNDk3MjZmYzM4NDAwZmQyMjU0ZTJiMjNiZmQyOTA0YTc2ZWQ0NzEyNDU5YSIsImlhdCI6MTc2Mzk5MzUxOC41MzY5OTMsIm5iZiI6MTc2Mzk5MzUxOC41MzY5OTYsImV4cCI6MTgyNzA2NTUxOC41Mjg5NzcsInN1YiI6IjMyIiwic2NvcGVzIjpbXX0.AT2K_lG3aolt8OYcu6AH-eVhFX7rJ8LQnJJKqmob2zYFIwxTf3bDLZCvSJMPaAER8s9K5bJ4X4PtiD0V3kBkPDGSMmQES5Ebqs56CzJtBmX5HrG1d2-Iw1p5ZDT-LOIFpiBPWrgnGDHbEI7EUEBdHBvCY1heM7HJdT4mVG1kUIudJgrzqKw70ewvdQTESisvRsZmXHgW_krEMLzld2_7mAd6hZNcWzBjCzvL4AevvidgKnSIwBpJMbuUPzl2M3YF2BaD7rVF4-X-QOmuhlMpIAogfD5BN10nQ5pfpurWHwMbqmQx3KojupbiNP3yYnGLahJDxx9oCaRLFMjdV4WULUyrcMgMj5e97g981pEhEfDtkZpWYeG65eNjSqnzLaBM1cIMcHBSD9Tt7dLWxn1WCHj140zxCezOJgsiVNAHnE4a6OEkkSQHkFlK4ZUIy0xfO87S_OLKekNxPGvPPLHRIrQx_5_0fO1ZxyUvidQwdUVk0CtLdfDQrsHUOrCyfTEPKj2VDfIAN92rixKWfZMXejuf_RUbLpj62NwShy3yyWKAFy9IBcM7VgPFI8Lq7EdjulPE3yX7cLxIgFIxIA6FjybX0V065UF4CzM1Xi4PB1Z6b0LUuLq9ULHTpQj4URmOCO6id_6rr8a7o6oyPi3MXkRGf9x4FnggFXKavp4JmZs";

let currentUser = null;
let transactions = [];

// Load & Auto Login
window.onload = () => {
  const saved = localStorage.getItem("currentUser");
  if (saved) login(saved);
  else if (!localStorage.getItem("seenOnboarding")) document.getElementById("onboarding").style.display = "flex";

  // Theme
  if (localStorage.getItem("theme") === "dark") document.body.classList.replace("light","dark");
};

function login(email = document.getElementById("emailInput").value.trim()) {
  if (!email.includes("@")) return alert("Enter valid email");
  currentUser = email.toLowerCase();
  localStorage.setItem("currentUser", currentUser);
  loadData();
  document.getElementById("loginSection").style.display = "none";
  document.getElementById("appSection").style.display = "block";
  updateAll();
  fetchPrediction();
}

function loadData() {
  transactions = JSON.parse(localStorage.getItem(`${currentUser}_tx`) || "[]");
}

// Quick Add
function quickAdd(cat, amt) {
  document.getElementById("category").value = cat;
  document.getElementById("amount").value = amt;
  document.getElementById("date").value = new Date().toISOString().slice(0,10);
  addTransaction();
  closeQuickAdd();
}

function openQuickAdd() { document.getElementById("quickAddModal").classList.add("active"); }
function closeQuickAdd() { document.getElementById("quickAddModal").classList.remove("active"); }

// Add Transaction
function addTransaction() {
  const desc = document.getElementById("description").value.trim() || "Expense";
  const cat = document.getElementById("category").value.trim() || "Other";
  const amt = parseFloat(document.getElementById("amount").value);
  const date = document.getElementById("date").value;
  const type = document.getElementById("type").value;

  if (!amt || !date) return alert("Fill amount & date");

  transactions.push({ desc, cat, amt, date, type, id: Date.now() });
  localStorage.setItem(`${currentUser}_tx`, JSON.stringify(transactions));
  updateAll();
  fetchPrediction();
  clearForm();
}

function clearForm() {
  document.getElementById("description").value = "";
  document.getElementById("category").value = "";
  document.getElementById("amount").value = "";
  document.getElementById("date").value = new Date().toISOString().slice(0,10);
}

// Update UI
function updateAll() {
  updateBalance();
  updateTable();
  updatePieChart();
}

function updateBalance() {
  const income = transactions.filter(t => t.type === "income").reduce((a,t)=>a+t.amt,0);
  const expense = transactions.filter(t => t.type === "expense").reduce((a,t)=>a+t.amt,0);
  const bal = income - expense;
  document.getElementById("balance").textContent = `₹${bal.toLocaleString()}`;
  animateValue("balance", 0, bal, 1200);
}

function updateTable() {
  const tbody = document.querySelector("#expenseTable tbody");
  tbody.innerHTML = "";
  transactions.slice(-10).reverse().forEach(t => {
    const row = tbody.insertRow();
    row.innerHTML = `<td>${t.date}</td><td>${t.desc}</td><td>${t.cat}</td><td class="${t.type}">₹${t.amt}</td>`;
  });
}

// Pie Chart
let pieChart;
function updatePieChart() {
  const ctx = document.getElementById("pieChart").getContext("2d");
  const data = {};
  transactions.filter(t=>t.type==="expense").forEach(t => data[t.cat] = (data[t.cat]||0) + t.amt);

  if (pieChart) pieChart.destroy();
  pieChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: Object.keys(data),
      datasets: [{ data: Object.values(data), backgroundColor: ["#C8A45D","#00A878","#6D7A88","#E8C47A","#4A6378"] }]
    },
    options: { plugins: { legend: { display:false } }, animation: { duration: 1600, easing: "easeOutQuart" } }
  });
}

// AI Prediction
async function fetchPrediction() {
  const totals = {};
  transactions.filter(t=>t.type==="expense").forEach(t => {
    totals[t.date] = (totals[t.date]||0) + t.amt;
  });

  const series = Object.entries(totals)
    .sort(([a],[b])=>a.localeCompare(b))
    .map(([d,v]) => ({ timestamp: new Date(d).getTime()/1000, value: v }));

  if (series.length < 5) {
    document.getElementById("predictedSpend").textContent = "More data needed";
    return;
  }

  try {
    const res = await fetch("https://api.forecastapi.com/v1/forecast", {
      method: "POST",
      headers: { "Authorization": `Bearer ${FORECAST_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ data: series, forecast_horizon: 30, interval: "day" })
    });
    const json = await res.json();
    const next30 = json.forecast?.slice(0,30).reduce((a,p)=>a+p.value,0) || 0;
    document.getElementById("predictedSpend").textContent = `₹${Math.round(next30).toLocaleString()}`;
  } catch(e) {
    document.getElementById("predictedSpend").textContent = "AI offline";
  }
}

// Animation Helper
function animateValue(id, start, end, duration) {
  const obj = document.getElementById(id);
  let startTime = null;
  const step = (timestamp) => {
    if (!startTime) startTime = timestamp;
    const progress = Math.min((timestamp - startTime) / duration, 1);
    obj.textContent = `₹${Math.floor(progress * (end - start) + start).toLocaleString()}`;
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// Theme & Onboarding
document.getElementById("themeToggle").onclick = () => {
  document.body.classList.toggle("light");
  document.body.classList.toggle("dark");
  localStorage.setItem("theme", document.body.classList.contains("dark") ? "dark" : "light");
};

function closeOnboarding() {
  document.getElementById("onboarding").style.display = "none";
  localStorage.setItem("seenOnboarding", "true");
}
