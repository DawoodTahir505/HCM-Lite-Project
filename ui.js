/* ==========================================================================
   ui.js - app shell (sidebar + topbar), icons, tabs, theme
   ========================================================================== */

const ICON_PATHS = {
  dashboard: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
  settings: '<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>',
  user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
  sun: '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>',
  moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
  menu: '<line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
  alert: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  printer: '<polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
  camera: '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  dollar: '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
  building: '<rect x="4" y="2" width="16" height="20" rx="2"/><line x1="9" y1="22" x2="9" y2="18"/><line x1="15" y1="22" x2="15" y2="18"/><line x1="8" y1="6" x2="8.01" y2="6"/><line x1="12" y1="6" x2="12.01" y2="6"/><line x1="16" y1="6" x2="16.01" y2="6"/><line x1="8" y1="10" x2="8.01" y2="10"/><line x1="12" y1="10" x2="12.01" y2="10"/><line x1="16" y1="10" x2="16.01" y2="10"/>'
};

function icon(name, size = 18) {
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[name] || ""}</svg>`;
}

// <span data-icon="users"></span>  ->  inline svg
function hydrateIcons(root = document) {
  root.querySelectorAll("[data-icon]").forEach(el => {
    el.innerHTML = icon(el.dataset.icon, Number(el.dataset.size) || 22);
  });
}

function navItems(role) {
  if (role === "admin") {
    return [
      ["admin", "admin.html", "Dashboard", "dashboard"],
      ["employees", "employees.html", "Employees", "users"],
      ["attendance", "attendance.html", "Attendance", "clock"],
      ["leaves", "leaves.html", "Leaves", "calendar"],
      ["payslip", "payslip.html", "Payslips", "file"],
      ["settings", "settings.html", "Settings", "settings"],
      ["profile", "profile.html", "My profile", "user"]
    ];
  }
  return [
    ["employee", "employee.html", "Dashboard", "dashboard"],
    ["payslip", "payslip.html", "My payslip", "file"],
    ["profile", "profile.html", "My profile", "user"]
  ];
}

function renderShell(active) {
  const user = currentUser;
  const company = getCompany();
  const pending = user.role === "admin" ? getLeaves().filter(l => l.status === "pending").length : 0;

  document.getElementById("sidebar").innerHTML = `
    <div class="brand">
      <div class="brand-logo">H</div>
      <div><div class="brand-name">HCM Lite</div><div class="brand-company">${esc(company ? company.name : "")}</div></div>
    </div>
    <nav class="nav">
      ${navItems(user.role).map(([key, href, label, ic]) => `
        <a href="${href}" class="${key === active ? "active" : ""}">
          ${icon(ic)}<span>${label}</span>
          ${key === "leaves" && pending ? `<span class="count">${pending}</span>` : ""}
        </a>`).join("")}
    </nav>
    <div class="sidebar-foot">Data is stored in this browser only.</div>`;

  const dark = document.documentElement.dataset.theme === "dark";
  document.getElementById("topbar").innerHTML = `
    <button class="icon-btn menu-btn" id="menu-btn" aria-label="Menu">${icon("menu")}</button>
    <span class="date">${new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span>
    <span class="spacer"></span>
    <button class="icon-btn" id="theme-btn" aria-label="Toggle dark mode">${icon(dark ? "sun" : "moon")}</button>
    <div class="user-chip">
      <div class="who"><strong>${esc(user.name)}</strong><span>${user.role}</span></div>
      <div class="avatar">${esc(initials(user.name))}</div>
    </div>
    <button class="icon-btn" id="logout-btn" aria-label="Logout" title="Logout">${icon("logout")}</button>`;

  document.getElementById("menu-btn").onclick = () => document.body.classList.toggle("nav-open");
  document.getElementById("backdrop").onclick = () => document.body.classList.remove("nav-open");
  document.getElementById("logout-btn").onclick = logout;
  document.getElementById("theme-btn").onclick = toggleTheme;

  hydrateIcons();
}

function toggleTheme() {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  localStorage.setItem("hcm_theme", next);
  document.getElementById("theme-btn").innerHTML = icon(next === "dark" ? "sun" : "moon");
  window.dispatchEvent(new Event("themechange"));
}

// <div class="tabs"><button class="tab" data-tab="a">..</button></div> + <div class="tab-panel" id="a">
function initTabs() {
  const tabs = document.querySelectorAll(".tab");
  function show(name) {
    tabs.forEach(t => t.classList.toggle("active", t.dataset.tab === name));
    document.querySelectorAll(".tab-panel").forEach(p => (p.hidden = p.id !== name));
    history.replaceState(null, "", "#" + name);
  }
  tabs.forEach(t => (t.onclick = () => show(t.dataset.tab)));
  const wanted = location.hash.slice(1);
  show([...tabs].some(t => t.dataset.tab === wanted) ? wanted : tabs[0].dataset.tab);
}

// Click on the dark backdrop closes any open dialog
document.addEventListener("click", e => {
  if (e.target.tagName === "DIALOG") closeDialog(e.target);
});
