/* ==========================================================================
   helper.js - smart helper chat box
   Matches keywords in the question and answers with real numbers from the app.
   Admin: company data.  Employee: ONLY their own data.
   ========================================================================== */

function initHelper(containerId) {
  const box = document.getElementById(containerId);
  const isAdmin = currentUser.role === "admin";
  const chips = isAdmin
    ? ["How many employees do we have?", "Who is on leave today?", "Who was late today?", "Who has not checked in?"]
    : ["How many leaves do I have left?", "Was I late today?", "How many hours did I work this week?", "Show my attendance this month"];

  box.innerHTML = `
    <div class="chat">
      <div class="chat-messages" id="${containerId}-msgs" aria-live="polite"></div>
      <div class="chips">${chips.map(c => `<button type="button" class="chip">${esc(c)}</button>`).join("")}</div>
      <form class="chat-form" id="${containerId}-form" autocomplete="off">
        <input id="${containerId}-input" placeholder="Ask a question..." aria-label="Ask the smart helper">
        <button class="btn btn-primary" type="submit">Send</button>
      </form>
    </div>`;

  const msgs = document.getElementById(containerId + "-msgs");
  function addMessage(who, text) {
    const div = document.createElement("div");
    div.className = "chat-msg " + who;
    div.innerHTML = esc(text).replace(/\n/g, "<br>");
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  }
  function ask(text) {
    addMessage("user", text);
    setTimeout(() => addMessage("bot", answerQuestion(text)), 250);
  }

  addMessage("bot", "Hi " + currentUser.name.split(" ")[0] + "! " + (isAdmin
    ? "Ask me about employees, attendance and leaves."
    : "Ask me about your own attendance, leaves and salary."));
  box.querySelectorAll(".chip").forEach(c => (c.onclick = () => ask(c.textContent)));
  document.getElementById(containerId + "-form").addEventListener("submit", e => {
    e.preventDefault();
    const input = document.getElementById(containerId + "-input");
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    ask(text);
  });
}

function answerQuestion(question) {
  const t = question.toLowerCase();
  return currentUser.role === "admin" ? adminAnswer(t) : employeeAnswer(t);
}

/* ---------- small helpers ---------- */

function plural(n, word) { return n + " " + word + (n === 1 ? "" : "s"); }

function nameList(names, max = 8) {
  if (!names.length) return "";
  return names.slice(0, max).join(", ") + (names.length > max ? " and " + (names.length - max) + " more" : "");
}

function typeBreakdown(onLeave) {
  const counts = {};
  onLeave.forEach(x => (counts[x.leave.type] = (counts[x.leave.type] || 0) + 1));
  return Object.entries(counts).map(([type, n]) => n + " " + type).join(", ");
}

const HELP_ADMIN = "Try asking:\n• How many employees do we have?\n• Who is on leave today?\n• Who was late today?\n• Who is present today?\n• Who has not checked in?\n• How many leaves are pending?\n• How many employees per department?\n• What is the total monthly payroll?";
const HELP_EMPLOYEE = "Try asking:\n• How many leaves do I have left?\n• Was I late today?\n• How many hours did I work this week?\n• Show my attendance this month\n• What is my salary this month?";

/* ---------- Admin: company data ---------- */

function adminAnswer(t) {
  const snap = todaySnapshot();
  const offDay = snap.working ? "" : "Today is not a working day. ";

  if (/^(hi|hello|hey|salam|assalam)/.test(t) || /\bhelp\b|what can you/.test(t)) return HELP_ADMIN;

  if (/pending/.test(t)) {
    const p = getLeaves().filter(l => l.status === "pending");
    return p.length ? plural(p.length, "leave request") + " waiting for approval (" + p.reduce((s, l) => s + l.days, 0) + " working days in total)." : "There are no pending leave requests.";
  }
  if (/\bleaves?\b|on leave|vacation/.test(t)) {
    if (!snap.onLeave.length) return offDay + "Nobody is on leave today.";
    return plural(snap.onLeave.length, "employee") + " on leave today: " + typeBreakdown(snap.onLeave) + ".\n" + nameList(snap.onLeave.map(x => x.user.name));
  }
  if (/\blate\b/.test(t)) {
    if (!snap.late.length) return snap.present.length ? "Nobody was late today." : offDay + "Nobody has checked in yet.";
    return plural(snap.late.length, "employee") + " late today:\n" + nameList(snap.late.map(x => x.user.name + " (" + formatTime(x.rec.checkIn) + ")"));
  }
  if (/absent|not (checked|in)|missing|haven'?t|yet/.test(t)) {
    if (!snap.working) return "Today is not a working day.";
    return snap.notIn.length ? plural(snap.notIn.length, "employee") + " not checked in yet:\n" + nameList(snap.notIn.map(u => u.name)) : "Everyone has checked in or is on leave.";
  }
  if (/present|checked in|attendance|in office|came/.test(t)) {
    if (!snap.present.length) return offDay + "Nobody has checked in today.";
    return plural(snap.present.length, "employee") + " present today:\n" + nameList(snap.present.map(x => x.user.name));
  }
  if (/department/.test(t)) {
    const counts = {};
    getEmployees().forEach(e => (counts[e.department] = (counts[e.department] || 0) + 1));
    const lines = Object.entries(counts).map(([d, n]) => "• " + d + ": " + n);
    return lines.length ? lines.join("\n") : "No employees yet.";
  }
  if (/payroll|salary|salaries/.test(t)) {
    const total = getEmployees().reduce((s, e) => s + Number(e.salary), 0);
    return "Total monthly payroll for " + plural(getEmployees().length, "employee") + " is " + formatMoney(total) + ".";
  }
  if (/announcement/.test(t)) {
    const a = getAnnouncements().sort((x, y) => y.id - x.id)[0];
    return a ? "Latest announcement: " + a.title + " (" + formatDate(a.date) + ")." : "No announcements yet.";
  }
  if (/(how many|total|number of|count).*(employees?|staff|people)|headcount|employees/.test(t)) {
    return "We have " + plural(getEmployees().length, "employee") + ".";
  }
  return "I did not understand that.\n" + HELP_ADMIN;
}

/* ---------- Employee: own data only ---------- */

function mentionsAnotherPerson(t) {
  return getUsers().some(u => u.id !== currentUser.id &&
    u.name.toLowerCase().split(/\s+/).some(w => w.length >= 3 && new RegExp("\\b" + w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b").test(t)));
}

function employeeAnswer(t) {
  const user = getUserById(currentUser.id);
  const company = getCompany();
  const today = todayStr();

  if (/^(hi|hello|hey|salam|assalam)/.test(t) || /\bhelp\b|what can you/.test(t)) return HELP_EMPLOYEE;

  // Privacy: employees cannot ask about other people or company-wide data
  if (/\b(employees?|everyone|everybody|colleagues?|coworkers?|teammates?|staff|team|others?|company|payroll|who|department|departments)\b/.test(t) || mentionsAnotherPerson(t)) {
    return "Sorry, I can only answer questions about your own data.\n" + HELP_EMPLOYEE;
  }

  if (/\blate\b/.test(t)) {
    if (/month/.test(t)) {
      const month = currentMonth();
      const n = getAttendance().filter(a => a.userId === user.id && a.date.startsWith(month) && a.late).length;
      return "You were late " + plural(n, "time") + " in " + formatMonth(month) + ".";
    }
    const rec = getRecord(user.id, today);
    if (!rec) return "You have not checked in today.";
    return rec.late
      ? "Yes. You checked in at " + formatTime(rec.checkIn) + ", after the office start time plus grace minutes."
      : "No. You checked in on time at " + formatTime(rec.checkIn) + ".";
  }
  if (/pending/.test(t)) {
    const s = leaveStats(user.id);
    return s.pending ? "You have " + plural(s.pending, "day") + " of leave waiting for approval." : "You have no pending leave requests.";
  }
  if (/\bleaves?\b|balance|quota/.test(t)) {
    const s = leaveStats(user.id);
    return "You have " + plural(s.balance, "leave day") + " left out of " + s.quota + " this year (" + s.used + " approved used" + (s.pending ? ", " + s.pending + " pending" : "") + ").";
  }
  if (/hours?|worked|work\b/.test(t)) {
    const from = /week/.test(t) ? weekStart() : today;
    const recs = getAttendance().filter(a => a.userId === user.id && a.date >= from && a.date <= today);
    const total = recs.reduce((s, a) => s + workedHours(a), 0);
    return "You worked " + total.toFixed(1) + " hours " + (/week/.test(t) ? "this week" : "today") + " across " + plural(recs.filter(a => a.checkOut).length, "completed day") + ".";
  }
  if (/check|in office/.test(t)) {
    const rec = getRecord(user.id, today);
    if (!rec) return "You have not checked in today.";
    return "You checked in at " + formatTime(rec.checkIn) + (rec.checkOut ? " and checked out at " + formatTime(rec.checkOut) + "." : ". You have not checked out yet.");
  }
  if (/present|attendance|absent|attended/.test(t)) {
    const s = monthSummary(user, currentMonth());
    return formatMonth(currentMonth()) + ": you attended " + s.attended + " of " + s.workingDays + " working days.\nOn time " + s.onTime + " · Late " + s.late + " · Half days " + s.half + " · Absent " + s.absent + " · On leave " + s.leave + ".";
  }
  if (/salary|payslip|pay\b|deduction|net/.test(t)) {
    const p = calcPayslip(user, currentMonth());
    return "Your monthly salary is " + formatMoney(p.salary) + ".\nSo far this month: deductions " + formatMoney(p.deduction) + ", net " + formatMoney(p.net) + ".";
  }
  if (/announcement/.test(t)) {
    const a = getAnnouncements().sort((x, y) => y.id - x.id)[0];
    return a ? "Latest announcement: " + a.title + " (" + formatDate(a.date) + ")." : "No announcements yet.";
  }
  return "I did not understand that.\n" + HELP_EMPLOYEE;
}
