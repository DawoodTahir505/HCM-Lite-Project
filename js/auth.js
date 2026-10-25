/* ==========================================================================
   auth.js - login, logout, role guard, password change
   Passwords are stored as plain text ONLY because this is a learning project.
   A real app must hash passwords on a server.
   ========================================================================== */

const IN_PAGES = location.pathname.includes("/pages/");
const ROOT = IN_PAGES ? "../" : "";
const PAGES = IN_PAGES ? "" : "pages/";

// Always read fresh from hcm_users so edits show up; logs out if the user was deleted
function getCurrentUser() {
  const session = getData(KEYS.session, null);
  if (!session) return null;
  const u = getUserById(session.id);
  if (!u) { removeData(KEYS.session); return null; }
  return { id: u.id, name: u.name, email: u.email, role: u.role };
}

function homeFor(user) {
  return PAGES + (user.role === "admin" ? "admin.html" : "employee.html");
}

function login(email, password) {
  const user = getUsers().find(
    u => u.email.toLowerCase() === email.toLowerCase() && u.password === password
  );
  if (!user) return null;
  setData(KEYS.session, { id: user.id });
  return user;
}

function logout() {
  removeData(KEYS.session);
  location.href = ROOT + "index.html";
}

// Top of every protected page: requireRole("admin") / requireRole(["admin", "employee"])
function requireRole(roles) {
  const allowed = Array.isArray(roles) ? roles : [roles];
  const user = getCurrentUser();
  if (!user) { location.href = ROOT + "index.html"; return null; }
  if (!allowed.includes(user.role)) { location.href = homeFor(user); return null; }
  return user;
}

// Returns an error message, or "" when the password was changed
function changePassword(userId, current, next) {
  const users = getUsers();
  const u = users.find(x => x.id === userId);
  if (!u || u.password !== current) return "Current password is wrong";
  u.password = next;
  setData(KEYS.users, users);
  return "";
}
