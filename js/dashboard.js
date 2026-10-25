/* ==========================================================================
   dashboard.js - Admin dashboard (company totals, charts) and Employee overview
   ========================================================================== */

/* ---------- Employee dashboard ---------- */

function initEmployeeDashboard() {
  initTabs();
  startClock();
  document.getElementById("att-month").value = currentMonth();
  document.getElementById("att-month").addEventListener("change", renderMyAttendance);
  initEmployeeLeave();
  renderFaceCard();
  renderAnnouncements("ann-list", false);
  initHelper("helper-box");
  refreshEmployee();
}

function refreshEmployee() {
  renderToday();
  renderEmployeeStats();
  renderMyAttendance();
}

function renderEmployeeStats() {
  const user = getUserById(currentUser.id);
  const s = monthSummary(user, currentMonth());
  const status = dayStatus(user, todayStr());
  const labels = {
    present: "Present", late: "Late", half: "Half day", leave: "On leave", off: "Off day",
    pending: "Not checked in", absent: "Absent", upcoming: "Upcoming", "n/a": "Not joined yet"
  };
  document.getElementById("es-today").textContent = labels[status];
  document.getElementById("es-attended").textContent = s.attended + " / " + s.workingDays;
  document.getElementById("es-late").textContent = s.late + s.half;
  document.getElementById("es-balance").textContent = leaveStats(user.id).balance;
}

/* ---------- Admin dashboard ---------- */

let charts = {};

function initAdminDashboard() {
  renderAdminStats();
  renderTodayTable();
  renderPendingLeaves();
  renderAnnouncements("ann-list", true);
  initAnnouncementForm();
  initHelper("helper-box");
  renderCharts();
  window.addEventListener("themechange", renderCharts);
}

function renderAdminStats() {
  const snap = todaySnapshot();
  document.getElementById("a-total").textContent = getEmployees().length;
  document.getElementById("a-present").textContent = snap.present.length;
  document.getElementById("a-late").textContent = snap.late.length;
  document.getElementById("a-leave").textContent = snap.onLeave.length;
  document.getElementById("a-pending").textContent = getLeaves().filter(l => l.status === "pending").length;
}

function renderTodayTable() {
  const ctx = buildContext();
  const emps = getEmployees();
  document.getElementById("today-body").innerHTML = emps.length
    ? emps.map(u => {
        const st = dayStatus(u, ctx.today, ctx);
        const rec = ctx.att.get(u.id + "|" + ctx.today);
        return `<tr>
          <td><div class="person"><div class="avatar sm">${esc(initials(u.name))}</div><div><strong>${esc(u.name)}</strong><span>${esc(u.department)}</span></div></div></td>
          <td>${rec ? formatTime(rec.checkIn) : "-"}</td>
          <td>${rec ? formatTime(rec.checkOut) : "-"}</td>
          <td>${attBadge(st)}</td>
        </tr>`;
      }).join("")
    : '<tr><td colspan="4" class="empty">No employees yet. <a href="employees.html" style="color:var(--primary);font-weight:600">Add your first employee</a>.</td></tr>';
}

function renderPendingLeaves() {
  const pending = getLeaves().filter(l => l.status === "pending").sort((a, b) => a.from.localeCompare(b.from)).slice(0, 5);
  document.getElementById("pending-list").innerHTML = pending.length
    ? pending.map(l => {
        const u = getUserById(l.userId);
        return `<li><div><strong>${u ? esc(u.name) : "Deleted user"}</strong><br><span class="muted small">${esc(l.type)} · ${formatDate(l.from)} - ${formatDate(l.to)} · ${l.days}d</span></div>
          <a class="btn btn-outline btn-sm" href="leaves.html">Review</a></li>`;
      }).join("")
    : '<li class="muted">No pending requests.</li>';
}

function renderCharts() {
  const boxes = document.querySelectorAll(".chart-box");
  if (typeof Chart === "undefined") {                        // Chart.js is loaded from a CDN
    boxes.forEach(b => (b.innerHTML = '<div class="empty">Chart library could not be loaded.</div>'));
    return;
  }
  Object.values(charts).forEach(c => c.destroy());

  const css = getComputedStyle(document.documentElement);
  const color = name => css.getPropertyValue(name).trim();
  Chart.defaults.color = color("--muted");
  Chart.defaults.font.family = css.getPropertyValue("--font");
  const grid = { color: color("--border") };

  // 1. Attendance by department (today)
  const snap = todaySnapshot();
  const depts = [...new Set(getEmployees().map(e => e.department))].sort();
  charts.dept = new Chart(document.getElementById("chart-dept"), {
    type: "bar",
    data: {
      labels: depts.length ? depts : ["No data"],
      datasets: [
        { label: "Present today", data: depts.map(d => snap.present.filter(p => p.user.department === d).length), backgroundColor: color("--primary"), borderRadius: 6 },
        { label: "Employees", data: depts.map(d => getEmployees().filter(e => e.department === d).length), backgroundColor: color("--accent"), borderRadius: 6 }
      ]
    },
    options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { precision: 0 }, grid }, x: { grid: { display: false } } } }
  });

  // 2. Employees present, last 7 days
  const days = [];
  for (let i = 6; i >= 0; i--) days.push(addDays(todayStr(), -i));
  const att = getAttendance();
  charts.trend = new Chart(document.getElementById("chart-trend"), {
    type: "line",
    data: {
      labels: days.map(d => parseDate(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" })),
      datasets: [{
        label: "Present", data: days.map(d => att.filter(a => a.date === d).length),
        borderColor: color("--warn"), backgroundColor: color("--warn-50"), fill: true, tension: .3, pointRadius: 4
      }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 }, grid }, x: { grid: { display: false } } } }
  });
}
