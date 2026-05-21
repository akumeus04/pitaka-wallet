// ==========================================
// ALLOWANCE LOGIC (Global Settings Edition)
// ==========================================

// ==========================================
// FORM LOCKING LOGIC (READ-ONLY VIEW)
// ==========================================
function toggleAlwReadOnly(isReadOnly) {
    const form = document.getElementById('allowanceForm');
    form.querySelectorAll('input, select, textarea').forEach(el => {
        if (el.tagName === 'SELECT' || el.type === 'checkbox') el.disabled = isReadOnly;
        else el.readOnly = isReadOnly;
        
        if (el.id === 'alwStartDate' || el.id === 'alwEndDate' || el.id === 'alwDailyAmount') {
            el.readOnly = true;
            el.style.backgroundColor = '#f3f4f6';
        } else {
            el.style.backgroundColor = isReadOnly ? '#f9fafb' : '';
        }
    });
    
    document.getElementById('alwSubmit').style.display = isReadOnly ? 'none' : 'block';
    const editBtn = document.getElementById('alwEditBtn');
    if (editBtn) editBtn.style.display = isReadOnly ? 'block' : 'none';
    
    // Hide interactive math buttons (+/- Days, + Category) during view mode
    const actionBtns = form.querySelectorAll('button[onclick="addNewCategory()"], button[onclick="adjustDays(-1)"], button[onclick="adjustDays(1)"]');
    actionBtns.forEach(btn => btn.style.display = isReadOnly ? 'none' : 'inline-block');

    if (!isReadOnly) {
        const title = document.getElementById('alwFormTitle');
        if (title && title.innerText.startsWith('View:')) {
            title.innerText = title.innerText.replace('View:', 'Edit:');
        }
    }
}

function triggerAlwView(id) {
    triggerAlwEdit(id); 
    document.getElementById('alwFormTitle').innerText = "View: " + document.getElementById('alwStudentName').value;
    toggleAlwReadOnly(true);
}

function triggerAlwEdit(id) {
  const alw = masterData.allowances.find(i => i["ID"] === id);
  if(!alw) return;
  
  toggleAlwReadOnly(false); 
  
  document.getElementById('alwEditId').value = id;
  document.getElementById('alwEntryDate').value = String(alw["Entry Date"]).substring(0, 10);
  document.getElementById('alwMonth').value = alw["Allowance Month"];
  document.getElementById('alwStudentName').value = alw["Student Name"];
  document.getElementById('alwTotalDays').value = alw["Total Workdays"];
  document.getElementById('alwStatus').value = alw["Status"] || "Pending";
  document.getElementById('alwStatusGroup').classList.remove('hidden');
  document.getElementById('alwFormTitle').innerText = `Edit: ${alw["Student Name"]}`;
  document.getElementById('alwSubmit').innerText = "Update Record";

  const [year, month] = String(alw["Allowance Month"]).split('-');
  
  // 🎯 NEW MATH: Forces 26th of current month to 25th of next month
  const editStart = new Date(year, parseInt(month) - 1, 26);
  const editEnd = new Date(year, parseInt(month), 25);
  
  const safeFormat = (d) => {
    let y = d.getFullYear();
    let m = String(d.getMonth() + 1).padStart(2, '0');
    let day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  document.getElementById('alwStartDate').value = safeFormat(editStart);
  document.getElementById('alwEndDate').value = safeFormat(editEnd);
  
  populateDropdowns();
  buildCategoryCheckboxes(alw["Breakdown"]);
  calculateTotalDaily();
  
  openModal('allowanceModal'); 
}

function populateDropdowns() {
  const studentList = document.getElementById('studentNamesList');
  studentList.innerHTML = "";
  if(masterData.students) {
    masterData.students.forEach(s => {
      if(s["Student Name"]) studentList.innerHTML += `<option value="${s["Student Name"]}">`;
    });
  }
}

function buildCategoryCheckboxes(existingBreakdownJSON = "[]") {
  const container = document.getElementById('alwCategoriesContainer');
  container.innerHTML = "";
  
  let existingItems = [];
  try { existingItems = JSON.parse(existingBreakdownJSON); } catch(e){}
  const existingNames = existingItems.map(i => i.name);

  if(!masterData.categories || masterData.categories.length === 0) {
     container.innerHTML = "<small style='color:var(--danger); grid-column: span 2;'>No categories found. Please add them to your Google Sheet.</small>";
     return;
  }

  masterData.categories.forEach(cat => {
    const catName = cat["Category Name"];
    const catAmount = parseFloat(cat["Daily Amount (PHP)"]) || 0;
    const isChecked = existingNames.includes(catName) ? "checked" : "";

    container.innerHTML += `
      <label style="display:flex; align-items:center; gap:8px; font-weight:normal; cursor:pointer;">
        <input type="checkbox" class="alw-cat-checkbox" value="${catAmount}" data-name="${catName}" ${isChecked} onchange="calculateTotalDaily()">
        ${catName} <span style="color:var(--primary); font-size:12px;">(+${catAmount})</span>
      </label>
    `;
  });
}

function calculateTotalDaily() {
  let total = 0;
  document.querySelectorAll('.alw-cat-checkbox:checked').forEach(cb => {
    total += parseFloat(cb.value) || 0;
  });
  document.getElementById('alwDailyAmount').value = total.toFixed(2);
  recalculateTotals();
}

async function addNewCategory() {
  const catName = prompt("Enter the new Category Name (e.g., Internet, Snack):");
  if (!catName) return; 
  
  const catAmt = prompt(`Enter the Daily Amount (PHP) for ${catName}:`);
  if (!catAmt || isNaN(catAmt)) {
    alert("Invalid amount. Please try again.");
    return;
  }

  showStatus("⏳ Saving new category...", false);
  
  const payload = { 
    action: "addCategory", 
    categoryName: catName, 
    categoryAmount: parseFloat(catAmt) 
  };
  
  try {
    await fetch(ALLOWANCE_WEB_APP_URL, { 
      method: "POST", 
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload) 
    });
    
    masterData.categories.push({ "Category Name": catName, "Daily Amount (PHP)": catAmt });
    
    const currentBreakdown = [];
    document.querySelectorAll('.alw-cat-checkbox:checked').forEach(cb => {
      currentBreakdown.push({ name: cb.dataset.name, amount: cb.value });
    });
    
    buildCategoryCheckboxes(JSON.stringify(currentBreakdown));
    showStatus("✅ Category added!", false);
  } catch (e) {
    showStatus("❌ Failed to add category.", true);
  }
}

function adjustDays(delta) {
  const input = document.getElementById('alwTotalDays');
  let current = parseInt(input.value) || 0;
  input.value = current + delta;
  recalculateTotals();
}

function recalculateTotals() {
  const days = parseInt(document.getElementById('alwTotalDays').value) || 0;
  const daily = parseFloat(document.getElementById('alwDailyAmount').value) || 0;
  const totalPHP = days * daily;
  document.getElementById('alwTotalPHP').innerText = totalPHP.toFixed(2);
}

function calculateAllowanceDays() {
  const monthStr = document.getElementById('alwMonth').value; 
  if(!monthStr) return;

  const [year, month] = monthStr.split('-');
  
  // 🎯 NEW MATH: Forces 26th of current month to 25th of next month
  const startDate = new Date(year, parseInt(month) - 1, 26); 
  const endDate = new Date(year, parseInt(month), 25);
  
  const formatLocal = (d) => {
    let y = d.getFullYear();
    let m = String(d.getMonth() + 1).padStart(2, '0');
    let day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  document.getElementById('alwStartDate').value = formatLocal(startDate);
  document.getElementById('alwEndDate').value = formatLocal(endDate);

  const holidayDates = masterData.holidays ? masterData.holidays.map(h => {
    let rawDate = h["Date (YYYY-MM-DD)"] || h["Date"] || Object.values(h)[0];
    if (rawDate) {
      let d = new Date(rawDate);
      if (!isNaN(d)) return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
    return null;
  }).filter(d => d !== null) : [];

  let workDaysCount = 0;
  let cursorDate = new Date(startDate);

  while (cursorDate <= endDate) {
    const dayOfWeek = cursorDate.getDay(); 
    const dateString = formatLocal(cursorDate);
    if (dayOfWeek !== 0 && !holidayDates.includes(dateString)) workDaysCount++;
    cursorDate.setDate(cursorDate.getDate() + 1); 
  }

  document.getElementById('alwTotalDays').value = workDaysCount;
  document.getElementById('autoDaysNote').innerText = `Auto calculated: ${workDaysCount}`;
  recalculateTotals();
}

document.getElementById('allowanceForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const editId = document.getElementById('alwEditId').value;
  
  const breakdownItems = [];
  document.querySelectorAll('.alw-cat-checkbox:checked').forEach(cb => {
    breakdownItems.push({ name: cb.dataset.name, amount: cb.value });
  });

  const payload = {
    action: editId ? "editRecord" : "addAllowance", 
    sheetName: "Allowances", id: editId,
    entryDate: document.getElementById('alwEntryDate').value,
    studentName: document.getElementById('alwStudentName').value,
    allowanceMonth: document.getElementById('alwMonth').value,
    startDate: document.getElementById('alwStartDate').value,
    endDate: document.getElementById('alwEndDate').value,
    dailyAmount: document.getElementById('alwDailyAmount').value,
    totalDays: document.getElementById('alwTotalDays').value,
    breakdown: JSON.stringify(breakdownItems),
    status: document.getElementById('alwStatus') ? document.getElementById('alwStatus').value : "Pending"
  };

  closeModal('allowanceModal');
  submitToSheet(payload, 'allowanceForm', 'alwSubmit');
});

function openNewAlwModal() {
  document.getElementById('allowanceForm').reset();
  document.getElementById('alwEditId').value = "";
  
  toggleAlwReadOnly(false); 
  
  document.getElementById('alwEntryDate').value = today;
  document.getElementById('alwMonth').value = activeBrowserMonth;
  
  document.getElementById('alwStatusGroup').classList.add('hidden');
  document.getElementById('alwFormTitle').innerText = `New Allowance: ${document.getElementById('currentBrowserMonthDisplay').innerText}`;
  document.getElementById('alwSubmit').innerText = "Save Allowance";
  
  populateDropdowns();
  buildCategoryCheckboxes("[]"); 
  calculateTotalDaily();
  calculateAllowanceDays(); 
  openModal('allowanceModal');
}

function triggerAlwDuplicate(id) {
  const alw = masterData.allowances.find(i => i["ID"] === id);
  if(!alw) return;
  
  toggleAlwReadOnly(false); 
  
  document.getElementById('alwEditId').value = "";
  document.getElementById('alwEntryDate').value = today;
  document.getElementById('alwStudentName').value = alw["Student Name"];
  
  let [year, month] = String(alw["Allowance Month"]).split('-').map(Number);
  month += 1;
  if (month > 12) { month = 1; year += 1; }
  let nextMonthStr = `${year}-${String(month).padStart(2, '0')}`;
  
  document.getElementById('alwMonth').value = nextMonthStr;
  document.getElementById('alwStatus').value = "Pending";
  document.getElementById('alwStatusGroup').classList.add('hidden');
  document.getElementById('alwFormTitle').innerText = `Duplicate for: ${alw["Student Name"]}`;
  document.getElementById('alwSubmit').innerText = "Save New Allowance";

  populateDropdowns();
  buildCategoryCheckboxes(alw["Breakdown"] || "[]");
  calculateTotalDaily();
  calculateAllowanceDays();
  
  openModal('allowanceModal'); 
}

function cancelAlwEdit() {
  document.getElementById('allowanceForm').reset();
  closeModal('allowanceModal');
}

function renderAllowanceHistory() {
  const alwBody = document.querySelector('#allowanceTableBody');
  if(!alwBody) return;
  alwBody.innerHTML = "";
  
  if(!masterData.allowances) masterData.allowances = [];
  
  const filtered = masterData.allowances.filter(alw => {
    let raw = String(alw["Allowance Month"] || "").trim();
    if (raw.startsWith(activeBrowserMonth)) return true;
    let d = new Date(raw);
    if (!isNaN(d)) {
      let y = d.getFullYear();
      let m = String(d.getMonth() + 1).padStart(2, '0');
      if (`${y}-${m}` === activeBrowserMonth) return true;
    }
    return false;
  }).reverse(); // Keeps your standard chronological sort!
  
  if (filtered.length === 0) {
    alwBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#6b7280;">No allowances for ${document.getElementById('currentBrowserMonthDisplay').innerText}</td></tr>`;
    return;
  }

  filtered.forEach(alw => {
    let tr = document.createElement('tr');
    
    // 1. NEW: Grey out the whole row if Paid, Cancelled, or Archived
    let archivedStyle = (alw["Archived"] === true || alw["Archived"] === "TRUE" || alw["Status"] === "Paid" || alw["Status"] === "Cancelled") ? "opacity: 0.5;" : "";
    
    // 2. NEW: Cross out the amount visually if it's Cancelled
    let amountStyle = alw["Status"] === "Cancelled" ? "text-decoration: line-through; color: #9ca3af; font-size: 15px;" : "color: var(--success); font-weight: bold; font-size: 15px;";

    let breakdownHTML = "";
    if (alw["Breakdown"]) {
      try {
        const items = JSON.parse(alw["Breakdown"]);
        breakdownHTML = items.map(i => `<br><span class="alw-breakdown-item" style="font-size: 11px;">- ${i.name}: ${i.amount}</span>`).join("");
      } catch(e) {}
    }

    tr.style = archivedStyle;
    tr.innerHTML = `
      <td><strong>${alw["Student Name"]}</strong></td>
      <td>
        <small>${alw["Start Date"]} to ${alw["End Date"]}</small><br>
        <strong>${alw["Total Workdays"]} days</strong> (@ ${alw["Daily Amount (PHP)"]} PHP)
        ${breakdownHTML}
        <br><span class="mobile-status-badge"><span class="badge ${String(alw["Status"]).replace(/\s+/g, '-')}">${alw["Status"]}</span></span>
      </td>
      <td style="${amountStyle}">
        ${parseFloat(alw["Total PHP"] || 0).toFixed(2)} PHP
      </td>
      <td class="mobile-hide"><span class="badge ${String(alw["Status"]).replace(/\s+/g, '-')}">${alw["Status"]}</span></td>
      <td>
         <div style="display: flex; flex-direction: column; gap: 5px; min-width: 80px;">
           <button class="btn btn-edit" onclick="triggerAlwView('${alw["ID"]}')" style="margin: 0; width: 100%; text-align: center; background: #0ea5e9; color: white;">View / Edit</button>
           <button class="btn" onclick="triggerAlwDuplicate('${alw["ID"]}')" style="background: var(--success); color: white; padding: 5px 10px; font-size: 11px; margin: 0; width: 100%; text-align: center;">Duplicate</button>
         </div>
      </td>
    `;
    alwBody.appendChild(tr);
  });
}