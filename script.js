// script.js
const firebaseConfig = window.firebaseConfig; // from firebaseConfig.js
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

let user = null;
let expenses = [];
let currency = "BDT";
let symbol = "৳";
const rates = { BDT:1, INR:0.73, USD:0.0085, EUR:0.0078 };

function login() {
  const email = document.getElementById("email").value;
  const pass = document.getElementById("password").value;
  auth.signInWithEmailAndPassword(email, pass)
    .then(cred => loadUser(cred.user))
    .catch(err => document.getElementById("authMsg").textContent = err.message);
}

function signup() {
  const email = document.getElementById("email").value;
  const pass = document.getElementById("password").value;
  auth.createUserWithEmailAndPassword(email, pass)
    .then(cred => loadUser(cred.user))
    .catch(err => document.getElementById("authMsg").textContent = err.message);
}

function logout() {
  auth.signOut();
  location.reload();
}

function loadUser(u) {
  user = u;
  document.getElementById("userEmail").textContent = u.email;
  document.getElementById("authScreen").classList.remove("active");
  document.getElementById("appScreen").classList.add("active");

  // Real-time listener
  db.collection("users").doc(u.uid).collection("expenses")
    .orderBy("date", "desc")
    .onSnapshot(snapshot => {
      expenses = [];
      snapshot.forEach(doc => expenses.push({id: doc.id, ...doc.data()}));
      updateUI();
    });
}

function saveExpense() {
  const desc = document.getElementById("desc").value || "Expense";
  const cat = document.getElementById("cat").value || "Other";
  const amt = parseFloat(document.getElementById("amt").value);
  if (!amt) return;

  db.collection("users").doc(user.uid).collection("expenses").add({
    desc, cat, amt, date: new Date().toISOString().slice(0,10)
  }).then(() => {
    document.getElementById("addModal").classList.remove("active");
    document.getElementById("desc").value = document.getElementById("cat").value = document.getElementById("amt").value = "";
  });
}

function updateUI() {
  const total = expenses.reduce((s,e) => s + e.amt, 0);
  document.getElementById("balance").textContent = `${symbol} ${(total * rates[currency]).toFixed(0)}`;
  document.getElementById("count").textContent = expenses.length;
  document.getElementById("prediction").textContent = `${symbol} ${Math.round(total * 1.2 * rates[currency])}`;
}

function showAdd() { document.getElementById("addModal").classList.add("active"); }
function hideAdd() { document.getElementById("addModal").classList.remove("active"); }

document.getElementById("currencyBtn").onclick = () => {
  const c = prompt("Enter currency code: BDT, INR, USD, EUR", currency);
  if (rates[c]) { currency = c; symbol = {BDT:"৳",INR:"₹",USD:"$",EUR:"€"}[c]; }
  document.getElementById("currencyBtn").textContent = `${symbol} ${currency}`;
  updateUI();
};
