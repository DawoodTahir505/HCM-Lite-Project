/* ==========================================================================
   profile.js - own details + change password (both roles)
   ========================================================================== */

function initProfile() {
  const u = getUserById(currentUser.id);
  const rows = [["Name", u.name], ["Email", u.email], ["Role", u.role]];
  if (u.role === "employee") {
    rows.push(["Department", u.department], ["Monthly salary", formatMoney(u.salary)], ["Joined", u.joinDate ? formatDate(u.joinDate) : "-"]);
  }
  document.getElementById("profile-info").innerHTML = rows.map(([k, v]) =>
    `<li><span class="muted">${k}</span><strong style="text-transform:${k === "Role" ? "capitalize" : "none"}">${esc(v)}</strong></li>`).join("");
  document.getElementById("pw-form").addEventListener("submit", savePassword);
}

function savePassword(e) {
  e.preventDefault();
  const form = e.target;
  clearErrors(form);
  const current = document.getElementById("currentPassword").value;
  const next = document.getElementById("newPassword").value;
  const confirmPw = document.getElementById("confirmPassword").value;

  let ok = true;
  if (!current) { showFieldError("currentPassword", "Enter your current password"); ok = false; }
  if (next.length < 6) { showFieldError("newPassword", "Use at least 6 characters"); ok = false; }
  if (confirmPw !== next) { showFieldError("confirmPassword", "Passwords do not match"); ok = false; }
  if (!ok) return;

  const error = changePassword(currentUser.id, current, next);
  if (error) { showFieldError("currentPassword", error); return; }
  form.reset();
  toast("Password changed");
}
