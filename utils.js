/* ==========================================================================
   utils.js - dates, formatting, validation, toasts, CSV
   ========================================================================== */

/* ---- ids and dates (all dates are local "YYYY-MM-DD" strings) ---- */
function newId() { return Date.now() * 1000 + Math.floor(Math.random() * 1000); }

function dateToStr(d) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
function todayStr() { return dateToStr(new Date()); }
function nowTime() {
  const d = new Date();
  return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
}
function parseDate(s) { return new Date(s + "T00:00:00"); }
function dayOfWeek(s) { return parseDate(s).getDay(); }          // 0 = Sunday
function addDays(s, n) { const d = parseDate(s); d.setDate(d.getDate() + n); return dateToStr(d); }
function currentMonth() { return todayStr().slice(0, 7); }        // "2026-10"
function toMinutes(time) { const [h, m] = time.split(":").map(Number); return h * 60 + m; }

function monthRange(month) {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  return { start: month + "-01", end: month + "-" + String(last).padStart(2, "0"), days: last };
}
function eachDate(from, to, callback) {
  for (let d = from; d <= to; d = addDays(d, 1)) callback(d);
}
function weekStart() {                                            // Monday of this week
  const d = new Date();
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return dateToStr(d);
}

/* ---- formatting ---- */
function formatDate(s) {
  return parseDate(s).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
function formatMonth(month) {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}
function formatTime(t) {
  if (!t) return "-";
  const [h, m] = t.split(":").map(Number);
  return (h % 12 || 12) + ":" + String(m).padStart(2, "0") + " " + (h >= 12 ? "PM" : "AM");
}
function formatMoney(n) {
  return "Rs. " + Number(n).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}
function round2(n) { return Math.round(n * 100) / 100; }
function initials(name) {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase();
}
function esc(s) {                                                 // escape before using innerHTML
  const d = document.createElement("div");
  d.textContent = s == null ? "" : String(s);
  return d.innerHTML;
}

/* ---- validation + field errors ---- */
function isValidEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }

// Needs <input id="x"> and <div class="error" id="x-error"></div>
function showFieldError(inputId, message) {
  const input = document.getElementById(inputId);
  const box = document.getElementById(inputId + "-error");
  if (input) input.classList.add("input-error");
  if (box) box.textContent = message;
}
function clearErrors(root) {
  root.querySelectorAll(".input-error").forEach(el => el.classList.remove("input-error"));
  root.querySelectorAll(".error").forEach(el => (el.textContent = ""));
}

/* ---- toast notifications ---- */
function toast(text, type = "success") {
  let box = document.getElementById("toasts");
  if (!box) {
    box = document.createElement("div");
    box.id = "toasts";
    box.className = "toasts";
    document.body.appendChild(box);
  }
  const el = document.createElement("div");
  el.className = "toast " + type;
  el.textContent = text;
  box.appendChild(el);
  setTimeout(() => el.remove(), 3800);
}

/* ---- dialogs (works even if <dialog> is not fully supported) ---- */
function openDialog(d) {
  if (typeof d.showModal === "function") d.showModal();
  else d.setAttribute("open", "");
}
function closeDialog(d) {
  if (typeof d.close === "function") d.close();
  else d.removeAttribute("open");
}

/* ---- CSV download ---- */
function downloadCSV(filename, rows) {
  const text = rows.map(r => r.map(c => '"' + String(c == null ? "" : c).replace(/"/g, '""') + '"').join(",")).join("\r\n");
  const blob = new Blob(["\ufeff" + text], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
