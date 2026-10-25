/* ==========================================================================
   leave.js - apply (employee), approve/reject (admin), balance
   Record: { id, userId, type, from, to, days, reason, status, comment }
   status: "pending" | "approved" | "rejected"
   ========================================================================== */

// Count only the working days between two dates (skips weekends / off days)
function countWorkingDays(from, to) {
  const workingDays = getCompany().workingDays;
  let n = 0;
  eachDate(from, to, d => { if (workingDays.includes(dayOfWeek(d))) n++; });
  return n;
}

// Balance = quota - APPROVED days (pending days are shown separately)
function leaveStats(userId) {
  const quota = Number(getCompany().leaveQuota);
  const mine = getLeaves().filter(l => l.userId === userId);
  const sum = status => mine.filter(l => l.status === status).reduce((t, l) => t + l.days, 0);
  const used = sum("approved");
  const pending = sum("pending");
  return { quota, used, pending, balance: quota - used, available: quota - used - pending };
}

function leaveBadge(status) {
  return `<span class="badge ${status}">${status}</span>`;
}

/* ---------- employee side ---------- */

function initEmployeeLeave() {
  renderLeaveStats();
  renderMyLeaves();
  document.getElementById("leave-form").addEventListener("submit", applyLeave);
}

function applyLeave(e) {
  e.preventDefault();
  const form = e.target;
  clearErrors(form);

  const type = document.getElementById("leaveType").value;
  const from = document.getElementById("fromDate").value;
  const to = document.getElementById("toDate").value;
  const reason = document.getElementById("reason").value.trim();

  let ok = true;
  if (!from) { showFieldError("fromDate", "Select a start date"); ok = false; }
  if (!to) { showFieldError("toDate", "Select an end date"); ok = false; }
  if (!reason) { showFieldError("reason", "Reason is required"); ok = false; }
  if (!ok) return;

  if (from > to) { showFieldError("toDate", "From date must be on or before To date"); return; }

  const days = countWorkingDays(from, to);
  if (days === 0) { showFieldError("toDate", "No working days in this range"); return; }

  const all = getLeaves();
  const mine = all.filter(l => l.userId === currentUser.id);
  if (mine.some(l => l.status !== "rejected" && from <= l.to && l.from <= to)) {
    showFieldError("fromDate", "These dates overlap another leave request");
    return;
  }

  const s = leaveStats(currentUser.id);
  if (days > s.available) {
    showFieldError("toDate", "Not enough balance. You can apply for " + s.available + " more day(s)");
    return;
  }

  all.push({ id: newId(), userId: currentUser.id, type, from, to, days, reason, status: "pending", comment: "" });
  setData(KEYS.leaves, all);
  form.reset();
  toast("Leave applied for " + days + " working day(s)");
  renderLeaveStats();
  renderMyLeaves();
}

function cancelLeave(id) {
  if (!confirm("Cancel this leave request?")) return;
  setData(KEYS.leaves, getLeaves().filter(l => !(l.id === id && l.userId === currentUser.id && l.status === "pending")));
  toast("Leave request cancelled");
  renderLeaveStats();
  renderMyLeaves();
}

function renderLeaveStats() {
  const s = leaveStats(currentUser.id);
  document.getElementById("lv-quota").textContent = s.quota;
  document.getElementById("lv-used").textContent = s.used;
  document.getElementById("lv-pending").textContent = s.pending;
  document.getElementById("lv-balance").textContent = s.balance;
}

function renderMyLeaves() {
  const mine = getLeaves().filter(l => l.userId === currentUser.id).sort((a, b) => b.from.localeCompare(a.from));
  document.getElementById("my-leaves-body").innerHTML = mine.length
    ? mine.map(l => `<tr>
        <td style="text-transform:capitalize">${esc(l.type)}</td>
        <td class="nowrap">${formatDate(l.from)} - ${formatDate(l.to)}</td>
        <td>${l.days}</td>
        <td>${esc(l.reason)}</td>
        <td>${leaveBadge(l.status)}</td>
        <td>${esc(l.comment || "-")}</td>
        <td>${l.status === "pending" ? `<button class="btn btn-ghost btn-sm" onclick="cancelLeave(${l.id})">Cancel</button>` : ""}</td>
      </tr>`).join("")
    : '<tr><td colspan="7" class="empty">No leave requests yet.</td></tr>';
}

/* ---------- admin side ---------- */

let decision = null;

function renderLeaveRequests() {
  const filter = document.getElementById("leave-filter").value;
  const users = getUsers();
  const order = { pending: 0, approved: 1, rejected: 2 };
  const list = getLeaves()
    .filter(l => !filter || l.status === filter)
    .sort((a, b) => order[a.status] - order[b.status] || b.from.localeCompare(a.from));

  document.getElementById("leaves-body").innerHTML = list.length
    ? list.map(l => {
        const u = users.find(x => x.id === l.userId);
        const action = l.status === "pending"
          ? `<div class="actions">
               <button class="btn btn-primary btn-sm" onclick="openDecision(${l.id}, 'approved')">Approve</button>
               <button class="btn btn-outline btn-sm" onclick="openDecision(${l.id}, 'rejected')">Reject</button>
             </div>`
          : esc(l.comment || "-");
        return `<tr>
          <td><div class="person"><div class="avatar sm">${u ? esc(initials(u.name)) : "?"}</div><div><strong>${u ? esc(u.name) : "Deleted user"}</strong><span>${u ? esc(u.department) : ""}</span></div></div></td>
          <td style="text-transform:capitalize">${esc(l.type)}</td>
          <td class="nowrap">${formatDate(l.from)} - ${formatDate(l.to)}</td>
          <td>${l.days}</td>
          <td>${esc(l.reason)}</td>
          <td>${leaveBadge(l.status)}</td>
          <td>${action}</td>
        </tr>`;
      }).join("")
    : '<tr><td colspan="7" class="empty">No leave requests found.</td></tr>';
}

function openDecision(id, status) {
  const l = getLeaves().find(x => x.id === id);
  const u = getUserById(l.userId);
  decision = { id, status };
  clearErrors(document.getElementById("decision-form"));
  document.getElementById("decision-comment").value = "";
  document.getElementById("decision-title").textContent = status === "approved" ? "Approve leave" : "Reject leave";
  document.getElementById("decision-summary").textContent =
    (u ? u.name : "Employee") + " · " + l.type + " · " + formatDate(l.from) + " to " + formatDate(l.to) + " (" + l.days + " day(s))";
  const btn = document.getElementById("decision-confirm");
  btn.textContent = status === "approved" ? "Approve" : "Reject";
  btn.className = "btn " + (status === "approved" ? "btn-primary" : "btn-danger");
  openDialog(document.getElementById("decision-dialog"));
}

function confirmDecision(e) {
  e.preventDefault();
  const form = document.getElementById("decision-form");
  clearErrors(form);
  const comment = document.getElementById("decision-comment").value.trim();
  if (decision.status === "rejected" && !comment) {
    showFieldError("decision-comment", "Write a comment to reject a leave");
    return;
  }
  const all = getLeaves();
  const l = all.find(x => x.id === decision.id);
  l.status = decision.status;
  l.comment = comment;
  setData(KEYS.leaves, all);
  closeDialog(document.getElementById("decision-dialog"));
  toast("Leave " + decision.status);
  renderLeaveRequests();
  renderShell("leaves");                     // refresh pending badge in the sidebar
}
