/* ==========================================================================
   payslip.js - monthly salary slip
   Per day   = monthly salary / working days in the month
   Deduction = per day x (absent days + 0.5 x half days)
   Net       = salary - deduction
   ========================================================================== */

function initPayslip() {
  const params = new URLSearchParams(location.search);
  const monthInput = document.getElementById("slip-month");
  monthInput.value = params.get("month") || currentMonth();
  monthInput.max = currentMonth();
  monthInput.addEventListener("change", renderPayslip);

  const sel = document.getElementById("slip-user");
  if (currentUser.role === "admin") {
    const emps = getEmployees();
    sel.innerHTML = emps.map(e => `<option value="${e.id}">${esc(e.name)} (${esc(e.department)})</option>`).join("");
    const wanted = Number(params.get("user"));
    if (emps.some(e => e.id === wanted)) sel.value = wanted;
    sel.addEventListener("change", renderPayslip);
  } else {
    document.getElementById("slip-user-field").hidden = true;   // employees only see their own
  }
  renderPayslip();
}

function renderPayslip() {
  const box = document.getElementById("slip-area");
  const month = document.getElementById("slip-month").value || currentMonth();
  const userId = currentUser.role === "admin" ? Number(document.getElementById("slip-user").value) : currentUser.id;
  const user = getUserById(userId);
  document.getElementById("print-btn").disabled = true;

  if (!user) { box.innerHTML = '<div class="card empty">No employees yet. Add an employee first.</div>'; return; }
  if (month > currentMonth()) { box.innerHTML = '<div class="card empty">This month has not started yet.</div>'; return; }
  if (user.joinDate && monthRange(month).end < user.joinDate) {
    box.innerHTML = `<div class="card empty">${esc(user.name)} joined on ${formatDate(user.joinDate)}. There is no payslip for earlier months.</div>`;
    return;
  }

  const p = calcPayslip(user, month);
  const s = p.summary;
  const company = getCompany();
  const slipNo = "PS-" + month.replace("-", "") + "-" + String(user.id).slice(-4);

  box.innerHTML = `
    <div class="slip">
      <div class="slip-head">
        <div><div class="slip-company">${esc(company.name)}</div><div style="color:#6a7590">Payslip for ${formatMonth(month)}</div></div>
        <div class="slip-no">No. ${slipNo}<br>Generated ${formatDate(todayStr())}</div>
      </div>
      <div class="slip-meta">
        <div><span>Employee</span><strong>${esc(user.name)}</strong></div>
        <div><span>Department</span>${esc(user.department)}</div>
        <div><span>Email</span>${esc(user.email)}</div>
        <div><span>Joining date</span>${user.joinDate ? formatDate(user.joinDate) : "-"}</div>
      </div>

      <div class="slip-summary">
        <div><strong>${s.workingDays}</strong><span>Working days</span></div>
        <div><strong>${s.onTime + s.late}</strong><span>Full days present</span></div>
        <div><strong>${s.late}</strong><span>Late (full days)</span></div>
        <div><strong>${s.half}</strong><span>Half days</span></div>
        <div><strong>${s.absent}</strong><span>Absent days</span></div>
        <div><strong>${s.leave}</strong><span>Approved leave days</span></div>
      </div>

      <table>
        <thead><tr><th>Earnings</th><th class="num">Amount</th></tr></thead>
        <tbody><tr><td>Monthly salary</td><td class="num">${formatMoney(p.salary)}</td></tr></tbody>
      </table>
      <table>
        <thead><tr><th>Deductions</th><th class="num">Amount</th></tr></thead>
        <tbody>
          <tr><td>Absent: ${s.absent} day(s) × ${formatMoney(p.perDay)}</td><td class="num">${formatMoney(p.absentAmount)}</td></tr>
          <tr><td>Half days: ${s.half} × 0.5 × ${formatMoney(p.perDay)}</td><td class="num">${formatMoney(p.halfAmount)}</td></tr>
          <tr class="total"><td>Total deductions</td><td class="num">${formatMoney(p.deduction)}</td></tr>
        </tbody>
      </table>

      <div class="slip-net"><span>Net salary</span><span>${formatMoney(p.net)}</span></div>
      <p class="slip-note">
        Per day = monthly salary ÷ ${s.workingDays} working days. Approved leave days are not deducted.
        ${month === currentMonth() ? "For the current month, absences are counted up to yesterday." : ""}
        This is a computer-generated payslip.
      </p>
    </div>`;
  document.getElementById("print-btn").disabled = false;
}
