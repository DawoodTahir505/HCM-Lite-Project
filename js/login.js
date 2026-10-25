/* ==========================================================================
   login.js - index.html: first-run company setup OR login
   ========================================================================== */

const existing = getCurrentUser();
if (existing) location.href = homeFor(existing);

const setupCard = document.getElementById("setup-card");
const loginCard = document.getElementById("login-card");
if (getCompany()) loginCard.hidden = false;
else setupCard.hidden = false;

document.getElementById("setup-form").addEventListener("submit", e => {
  e.preventDefault();
  const form = e.target;
  clearErrors(form);
  const companyName = document.getElementById("companyName").value.trim();
  const name = document.getElementById("adminName").value.trim();
  const email = document.getElementById("adminEmail").value.trim();
  const password = document.getElementById("adminPassword").value;
  const confirmPw = document.getElementById("adminConfirm").value;

  let ok = true;
  if (!companyName) { showFieldError("companyName", "Company name is required"); ok = false; }
  if (!name) { showFieldError("adminName", "Your name is required"); ok = false; }
  if (!email) { showFieldError("adminEmail", "Email is required"); ok = false; }
  else if (!isValidEmail(email)) { showFieldError("adminEmail", "Enter a valid email address"); ok = false; }
  if (password.length < 6) { showFieldError("adminPassword", "Use at least 6 characters"); ok = false; }
  if (confirmPw !== password) { showFieldError("adminConfirm", "Passwords do not match"); ok = false; }
  if (!ok) return;

  // Default rules - the Admin can change all of them in Settings
  setData(KEYS.company, { name: companyName, startTime: "09:00", graceMinutes: 15, leaveQuota: 12, workingDays: [1, 2, 3, 4, 5], requireCamera: false, officeLat: null, officeLng: null, radiusM: 200 });
  setData(KEYS.users, [{ id: newId(), name, email, password, role: "admin" }]);
  login(email, password);
  location.href = PAGES + "admin.html";
});

document.getElementById("login-form").addEventListener("submit", e => {
  e.preventDefault();
  const form = e.target;
  clearErrors(form);
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  let ok = true;
  if (!email) { showFieldError("email", "Enter your email"); ok = false; }
  if (!password) { showFieldError("password", "Enter your password"); ok = false; }
  if (!ok) return;

  const user = login(email, password);
  if (!user) { showFieldError("password", "Wrong email or password"); return; }
  location.href = homeFor(user);
});
