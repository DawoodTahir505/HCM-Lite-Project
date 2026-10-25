/* ==========================================================================
   storage.js - the only file that talks to localStorage.
   Every other file uses these helpers.
   ========================================================================== */

const KEYS = {
  company: "hcm_company",
  users: "hcm_users",
  attendance: "hcm_attendance",
  leaves: "hcm_leaves",
  session: "hcm_session",
  announcements: "hcm_announcements"
};

function getData(key, fallback = []) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

function setData(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function removeData(key) {
  localStorage.removeItem(key);
}

// Delete every HCM key (used by "Reset all data" in Settings)
function clearAllData() {
  Object.values(KEYS).forEach(removeData);
}

/* Shortcuts */
function getCompany() { return getData(KEYS.company, null); }
function getUsers() { return getData(KEYS.users); }
function getEmployees() { return getUsers().filter(u => u.role === "employee"); }
function getUserById(id) { return getUsers().find(u => u.id === id) || null; }
function getAttendance() { return getData(KEYS.attendance); }
function getLeaves() { return getData(KEYS.leaves); }
function getAnnouncements() { return getData(KEYS.announcements); }
