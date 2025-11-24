// script.js — AURUM ULTIMATE (Complete + Self-Contained)
// Uses Firebase Modular SDK v12.6.0 + type="module" (Recommended)
// Just add: <script type="module" src="script.js"></script>

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// Your Official Firebase Config (Aurum Web – aurum-cloud)
const firebaseConfig = {
  apiKey: "AIzaSyBX4W9VMWulR_SkawcPsSs0eTC7igH09ms",
  authDomain: "aurum-cloud.firebaseapp.com",
  projectId: "aurum-cloud",
  storageBucket: "aurum-cloud.firebasestorage.app",
  messagingSenderId: "999926729828",
  appId: "1:999926729828:web:636c14afe371f2b526e371",
  measurementId: "G-TFG7TW6YJT"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let user = null;
let expenses = [];
let currency = "BDT";
let symbol = "৳";
const rates = { BDT: 1, INR: 0.73, USD: 0.0085, EUR: 0.0078, GBP: 0.0072 };
const symbols = { BDT: "৳", INR: "₹", USD: "$", EUR: "€", GBP: "£" };

// ====== AUTH STATE ======
onAuthStateChanged(auth, (u) => {
  if (u) {
    user = u;
    document.getElementById("userDisplay").textContent = u.email.split("@")[0];
    document.getElementById("authScreen").classList.remove("active");
    document.getElementById("appScreen").classList.add("active");
    loadExpenses();
  } else {
    document.getElementById("authScreen").classList.add("active");
    document.getElementById("appScreen").classList.remove("active");
  }
});

// ====== AUTH FUNCTIONS ======
window.login = () => {
  const email = document.getElementById("email").value.trim();
  const pass = document.getElementById("password").value;
  signInWithEmailAndPassword(auth, email, pass)
    .catch(err => document.getElementById("authError").textContent = err.message);
};

window.signup = () => {
  const email = document.getElementById("email").value.trim();
  const pass = document.getElementById("password").value;
  createUserWithEmailAndPassword(auth, email, pass)
    .catch(err => document.getElementById("authError").textContent = err.message);
};

window.logout = () => signOut(auth);

// ====== LOAD EXPENSES (Real-time) ======
function loadExpenses() {
  const q = query(collection(db, "users", user.uid, "expenses"), orderBy("timestamp", "desc"));
  onSnapshot(q, (snap) => {
    expenses = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    updateAllUI();
  });
}

// ====== SAVE EXPENSE ======
window.saveExpense = async () => {
  const desc = document.getElementById("desc").value.trim() || "Expense";
  const cat = document.getElementById("cat").value.trim() || "Other";
  const amt = parseFloat(document.getElementById("amt").value);
  if (!amt || amt <= 0) return alert("Enter valid amount");

  addDoc(collection(db, "users", user.uid, "expenses"), {
    desc, cat, amt, timestamp: serverTimestamp()
  }).then(() => {
    document.getElementById("desc").value = "";
    document.getElementById("cat").value = "";
    document.getElementById("amt").value = "";
    closeAddModal();
  });
};

// ====== UPDATE ALL UI (AI, Roast, Streak, etc.) ======
function updateAllUI() {
  const total = expenses.reduce((s, e) => s + e.amt, 0);
  const converted = (total * rates[currency]).toFixed(0);

  document.getElementById("totalSpent").textContent = `${symbol} ${Number(converted).toLocaleString()}`;
  document.getElementById("expenseCount").textContent = expenses.length;
  document.getElementById("cardAmount").textContent = `${symbol} ${Number(converted).toLocaleString()}`;

  // Top Category & Personality
  const catTotals = expenses.reduce((a, e) => (a[e.cat] = (a[e.cat] || 0) + e.amt, a), {});
  const topCat = Object.keys(catTotals).sort((a, b) => catTotals[b] - catTotals[a])[0] || "None";
  document.getElementById("topCategory").textContent = topCat;

  const personality = {
    Food: "Mess Food Lover", Snacks: "Fuchka Champion", Transport: "Ride-Share Addict",
    Recharge: "Data King", Shopping: "Daraz Addict", "Mess Bill": "Hostel Pro"
  }[topCat] || "Smart Saver";
  document.getElementById("personalityLabel").textContent = personality;

  // AI Prediction
  const predicted = Math.round(total * 1.15 * rates[currency]);
  document.getElementById("nextMonthAI").textContent = `${symbol} ${predicted.toLocaleString()}`;

  // AI Roast
  let roast = "You're doing great! Keep saving";
  if (topCat === "Snacks" && catTotals.Snacks > 1200) roast = `Bro… ৳${catTotals.Snacks.toLocaleString()} on fuchka? Chill!`;
  if (topCat === "Food" && catTotals.Food > 6000) roast = `Biriyani count: Dangerous levels`;
  document.getElementById("roastText").textContent = roast;

  // Streak Counter
  const dates = [...new Set(expenses.map(e => new Date(e.timestamp?.seconds * 1000 || Date.now()).toISOString().slice(0,10)))].sort().reverse();
  let streak = 0;
  for (let i = 0; i  100; i++) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0,10);
    if (dates.includes(d)) streak++;
    else if (i  0) break;
  }
  document.getElementById("streakCount").innerHTML = `${streak} Day Streak`;

  renderHistory();
}

// ====== RENDER HISTORY ======
function renderHistory() {
  const list = document.getElementById("historyList");
  list.innerHTML = "";
  expenses.forEach(e => {
    const date = e.timestamp ? new Date(e.timestamp.seconds * 1000).toLocaleDateString() : "Today";
    const div = document.createElement("div");
    div.className = "glass history-item";
    div.innerHTML = `
      <div>
        <strong>${e.desc}</strong><br>
        <small>${e.cat} • ${date}</small>
      </div>
      <div style="text-align:right">
        <strong>${symbol} ${(e.amt * rates[currency]).toFixed(0)}</strong><br>
        <button class="delete-btn" onclick="deleteExpense('${e.id}')">Delete</button>
      </div>
    `;
    list.appendChild(div);
  });
}

window.deleteExpense = async (id) => {
  if (confirm("Delete this expense?")) {
    await deleteDoc(doc(db, "users", user.uid, "expenses", id));
  }
};

// ====== VIRAL SHARE ======
window.shareSummary = () => {
  html2canvas(document.getElementById("shareCard")).then(canvas => {
    canvas.toBlob(blob => {
      const file = new File([blob], "aurum-summary.png", { type: "image/png" });
      if (navigator.share && navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file], title: "My Aurum Summary" });
      } else {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "aurum-summary.png";
        a.click();
      }
    });
  });
};

window.shareRoast = () => {
  const text = document.getElementById("roastText").textContent;
  if (navigator.share) {
    navigator.share({ text: `Aurum Roast: ${text}\nDownload Aurum → https://aurum-ultimate.vercel.app` });
  }
};

// ====== CURRENCY SWITCHER ======
document.getElementById("currencyBtn").onclick = () => {
  const input = prompt("Currency: BDT, INR, USD, EUR, GBP", currency);
  const code = input?.toUpperCase();
  if (rates[code]) {
    currency = code;
    symbol = symbols[code];
    document.getElementById("currencyBtn").textContent = `${symbol} ${currency}`;
    updateAllUI();
  }
};

// ====== UI HELPERS ======
window.openAddModal = () => document.getElementById("addModal").classList.add("active");
window.closeAddModal = () => document.getElementById("addModal").classList.remove("active");
window.showPage = (id) => {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active")), document.getElementById(id).classList.add("active");
window.toggleTheme = () => document.body.classList.toggle("light") || document.body.classList.toggle("dark");
window.filterHistory = () => {
  const term = document.getElementById("searchInput").value.toLowerCase();
  document.querySelectorAll(".history-item").forEach(item => {
    item.style.display = item.textContent.toLowerCase().includes(term) ? "flex" : "none";
  });
};
