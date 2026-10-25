/* ==========================================================================
   attendance.js - check in/out, daily status rules, monthly summary
   Record: { id, userId, date, checkIn, checkOut, late, status }
   status: "present" | "late" | "half"
   Derived (never stored): "absent" | "leave" | "off" | "pending" | "upcoming" | "n/a"
   ========================================================================== */

/* ---------- data helpers ---------- */

// One snapshot of the data, so loops do not re-read localStorage every iteration
function buildContext() {
  const att = new Map();
  getAttendance().forEach(a => att.set(a.userId + "|" + a.date, a));
  return {
    company: getCompany(),
    att,
    leaves: getLeaves().filter(l => l.status === "approved"),
    today: todayStr()
  };
}

function getRecord(userId, date) {
  return getAttendance().find(a => a.userId === userId && a.date === date) || null;
}

function workedHours(rec) {
  if (!rec || !rec.checkOut) return 0;
  return Math.max(0, (toMinutes(rec.checkOut) - toMinutes(rec.checkIn)) / 60);
}

// Business rule: what is this employee's status on this date?
function dayStatus(user, date, ctx) {
  ctx = ctx || buildContext();
  if (date < (user.joinDate || "0000-00-00")) return "n/a";           // before joining
  const rec = ctx.att.get(user.id + "|" + date);
  if (rec) return rec.status;                                         // present / late / half
  if (!ctx.company.workingDays.includes(dayOfWeek(date))) return "off";
  if (ctx.leaves.some(l => l.userId === user.id && l.from <= date && date <= l.to)) return "leave";
  if (date > ctx.today) return "upcoming";
  if (date === ctx.today) return "pending";                           // day not over yet
  return "absent";                                                    // working day, no record
}

function workingDaysInMonth(month) {
  const { start, end } = monthRange(month);
  const days = getCompany().workingDays;
  let n = 0;
  eachDate(start, end, d => { if (days.includes(dayOfWeek(d))) n++; });
  return n;
}

function monthSummary(user, month) {
  const ctx = buildContext();
  const { start, end } = monthRange(month);
  const s = { onTime: 0, late: 0, half: 0, absent: 0, leave: 0, attended: 0, workingDays: workingDaysInMonth(month) };
  eachDate(start, end, d => {
    const st = dayStatus(user, d, ctx);
    if (st === "present") s.onTime++;
    else if (st === "late") s.late++;
    else if (st === "half") s.half++;
    else if (st === "absent") s.absent++;
    else if (st === "leave") s.leave++;
  });
  s.attended = s.onTime + s.late + s.half;
  return s;
}

// Who is in / late / on leave / missing right now (used by dashboard + helper)
function todaySnapshot() {
  const ctx = buildContext();
  const today = ctx.today;
  const working = ctx.company.workingDays.includes(dayOfWeek(today));
  const present = [], late = [], onLeave = [], notIn = [];
  getEmployees().forEach(u => {
    if (today < (u.joinDate || "0000-00-00")) return;
    const rec = ctx.att.get(u.id + "|" + today);
    if (rec) {
      present.push({ user: u, rec });
      if (rec.late) late.push({ user: u, rec });
      return;
    }
    if (!working) return;
    const lv = ctx.leaves.find(l => l.userId === u.id && l.from <= today && today <= l.to);
    if (lv) onLeave.push({ user: u, leave: lv });
    else notIn.push(u);
  });
  return { today, working, present, late, onLeave, notIn };
}

// Small "face" tag next to a time when it was marked by face recognition
function camTag(method) {
  return method === "face" ? ' <span class="muted small" title="Marked by face recognition">· face</span>' : "";
}

function attBadge(status) {
  const map = {
    present: ["present", "Present"], late: ["late", "Late"], half: ["half", "Half day"],
    absent: ["absent", "Absent"], leave: ["leave", "On leave"], off: ["off", "Off day"],
    pending: ["idle", "Not checked in"], upcoming: ["idle", "Upcoming"], "n/a": ["off", "Before joining"]
  };
  const [cls, label] = map[status] || ["idle", status];
  return `<span class="badge ${cls}">${label}</span>`;
}

/* ---------- employee actions ---------- */

// Buttons call these. If the Admin requires the camera, they open the camera check instead.
function checkIn() {
  if (getCompany().requireCamera) { openCameraCheck(); return; }
  doCheckIn({ method: "manual" });
}

// meta: { method: "manual" | "camera", distance }
function doCheckIn(meta) {
  const company = getCompany();
  const today = todayStr();
  if (getRecord(currentUser.id, today)) {
    toast("You already checked in today", "error");
    return;
  }
  const time = nowTime();
  // Late = after office start + grace minutes
  const late = toMinutes(time) > toMinutes(company.startTime) + Number(company.graceMinutes);

  const list = getAttendance();
  list.push({
    id: newId(), userId: currentUser.id, date: today,
    checkIn: time, checkOut: null, late, status: late ? "late" : "present",
    method: meta.method, distance: meta.distance == null ? null : meta.distance
  });
  setData(KEYS.attendance, list);
  toast(late ? "Checked in at " + formatTime(time) + " (late)" : "Checked in at " + formatTime(time));
  refreshEmployee();
}

function checkOut() {
  if (getCompany().requireCamera) { openCameraCheck(); return; }
  doCheckOut({ method: "manual" });
}

function doCheckOut(meta) {
  const list = getAttendance();
  const rec = list.find(a => a.userId === currentUser.id && a.date === todayStr());
  if (!rec) { toast("Check in first", "error"); return; }
  if (rec.checkOut) { toast("You already checked out today", "error"); return; }

  rec.checkOut = nowTime();
  rec.outMethod = meta.method;
  const hours = workedHours(rec);
  if (hours < 5) rec.status = "half";                       // under 5 hours = half day
  else rec.status = rec.late ? "late" : "present";
  setData(KEYS.attendance, list);
  toast("Checked out. You worked " + hours.toFixed(1) + " hours");
  refreshEmployee();
}

/* ---------- employee views ---------- */

function renderToday() {
  const rec = getRecord(currentUser.id, todayStr());
  const company = getCompany();
  const info = document.getElementById("today-info");

  if (!rec) info.innerHTML = "You have not checked in yet.";
  else if (!rec.checkOut) info.innerHTML = `Checked in at <strong>${formatTime(rec.checkIn)}</strong> ${attBadge(rec.status)}`;
  else info.innerHTML = `In <strong>${formatTime(rec.checkIn)}</strong> · Out <strong>${formatTime(rec.checkOut)}</strong> · ${workedHours(rec).toFixed(1)} h ${attBadge(rec.status)}`;

  document.getElementById("btn-in").disabled = !!rec;
  document.getElementById("btn-out").disabled = !rec || !!rec.checkOut;

  const camBtn = document.getElementById("btn-cam");
  camBtn.disabled = !!(rec && rec.checkOut);
  camBtn.querySelector("span.lbl").textContent = !rec ? "Check in with camera" : "Check out with camera";

  const [h, m] = company.startTime.split(":").map(Number);
  const lateAfter = new Date(2000, 0, 1, h, m + Number(company.graceMinutes));
  document.getElementById("rules-hint").textContent =
    "Office starts " + formatTime(company.startTime) + " · late after " +
    formatTime(String(lateAfter.getHours()).padStart(2, "0") + ":" + String(lateAfter.getMinutes()).padStart(2, "0")) +
    " · under 5 hours = half day" +
    (company.requireCamera ? " · camera and location check is required" : "");
}

function startClock() {
  function tick() {
    const d = new Date();
    document.getElementById("clock").textContent = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" });
    document.getElementById("clock-date").textContent = d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  }
  tick();
  setInterval(tick, 1000);
}

function renderMyAttendance() {
  const month = document.getElementById("att-month").value || currentMonth();
  const user = getUserById(currentUser.id);
  const ctx = buildContext();
  const { start, end } = monthRange(month);
  const last = end < ctx.today ? end : ctx.today;
  const rows = [];
  for (let d = last; d >= start; d = addDays(d, -1)) rows.push(d);

  document.getElementById("att-body").innerHTML = rows.length
    ? rows.map(d => {
        const st = dayStatus(user, d, ctx);
        const rec = ctx.att.get(user.id + "|" + d);
        return `<tr>
          <td>${formatDate(d)}</td>
          <td>${parseDate(d).toLocaleDateString("en-US", { weekday: "short" })}</td>
          <td>${rec ? formatTime(rec.checkIn) + camTag(rec.method) : "-"}</td>
          <td>${rec ? formatTime(rec.checkOut) + camTag(rec.outMethod) : "-"}</td>
          <td>${rec && rec.checkOut ? workedHours(rec).toFixed(1) : "-"}</td>
          <td>${attBadge(st)}</td>
        </tr>`;
      }).join("")
    : '<tr><td colspan="6" class="empty">No days to show for this month yet.</td></tr>';
}

/* ---------- admin view: attendance for one date + CSV export ---------- */

function renderAdminAttendance() {
  const date = document.getElementById("att-date").value || todayStr();
  const dept = document.getElementById("att-dept").value;
  const ctx = buildContext();
  const list = getEmployees().filter(e => !dept || e.department === dept);

  const counts = { present: 0, late: 0, half: 0, leave: 0, absent: 0, pending: 0 };
  const rows = list.map(u => {
    const st = dayStatus(u, date, ctx);
    if (counts[st] !== undefined) counts[st]++;
    const rec = ctx.att.get(u.id + "|" + date);
    return `<tr>
      <td><div class="person"><div class="avatar sm">${esc(initials(u.name))}</div><div><strong>${esc(u.name)}</strong><span>${esc(u.email)}</span></div></div></td>
      <td>${esc(u.department)}</td>
      <td>${rec ? formatTime(rec.checkIn) + camTag(rec.method) : "-"}</td>
      <td>${rec ? formatTime(rec.checkOut) + camTag(rec.outMethod) : "-"}</td>
      <td>${rec && rec.checkOut ? workedHours(rec).toFixed(1) : "-"}</td>
      <td>${attBadge(st)}</td>
    </tr>`;
  });

  document.getElementById("att-body").innerHTML = rows.length
    ? rows.join("")
    : '<tr><td colspan="6" class="empty">No employees found.</td></tr>';

  document.getElementById("att-summary").innerHTML =
    `<span class="badge present">Present ${counts.present}</span> ` +
    `<span class="badge late">Late ${counts.late}</span> ` +
    `<span class="badge half">Half day ${counts.half}</span> ` +
    `<span class="badge leave">On leave ${counts.leave}</span> ` +
    `<span class="badge absent">Absent ${counts.absent}</span> ` +
    `<span class="badge idle">Not checked in ${counts.pending}</span>`;
}

function fillDepartmentSelect(selectId) {
  const sel = document.getElementById(selectId);
  const current = sel.value;
  const depts = [...new Set(getEmployees().map(e => e.department))].sort();
  sel.innerHTML = '<option value="">All departments</option>' + depts.map(d => `<option value="${esc(d)}">${esc(d)}</option>`).join("");
  sel.value = depts.includes(current) ? current : "";
}

// Export the month of the selected date: one row per employee per day (up to today)
function exportAttendanceCSV() {
  const date = document.getElementById("att-date").value || todayStr();
  const month = date.slice(0, 7);
  const { start, end } = monthRange(month);
  const ctx = buildContext();
  const last = end < ctx.today ? end : ctx.today;
  const rows = [["Employee", "Email", "Department", "Date", "Check in", "Check out", "Hours", "Status", "Check-in method"]];
  getEmployees().forEach(u => {
    eachDate(start, last, d => {
      const st = dayStatus(u, d, ctx);
      if (st === "n/a") return;
      const rec = ctx.att.get(u.id + "|" + d);
      rows.push([u.name, u.email, u.department, d, rec ? rec.checkIn : "", rec && rec.checkOut ? rec.checkOut : "",
        rec && rec.checkOut ? workedHours(rec).toFixed(2) : "", st, rec ? (rec.method || "manual") : ""]);
    });
  });
  if (rows.length === 1) { toast("Nothing to export yet", "error"); return; }
  downloadCSV("attendance-" + month + ".csv", rows);
  toast("Exported " + (rows.length - 1) + " rows");
}

/* ---------- payslip maths (used by payslip page and smart helper) ---------- */

function calcPayslip(user, month) {
  const s = monthSummary(user, month);
  const salary = Number(user.salary);
  const perDay = s.workingDays ? salary / s.workingDays : 0;
  const absentAmount = round2(perDay * s.absent);
  const halfAmount = round2(perDay * 0.5 * s.half);
  const deduction = round2(absentAmount + halfAmount);
  return { summary: s, salary, perDay: round2(perDay), absentAmount, halfAmount, deduction, net: round2(salary - deduction) };
}
