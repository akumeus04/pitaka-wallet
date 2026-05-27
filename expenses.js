setupCurrencyCalculator('exp');

// SAFETY NET: Prevent user from using '/' and show warning inside the modal
document.getElementById('expDesc').addEventListener('input', function(e) {
  if (this.value.includes('/')) {
    this.value = this.value.replace(/\//g, '-'); // Swap slash for a dash
    
    // Inject a local warning directly under the input box
    let warning = document.getElementById('expDescWarning');
    if (!warning) {
        warning = document.createElement('div');
        warning.id = 'expDescWarning';
        warning.style.color = 'var(--danger)';
        warning.style.fontSize = '11px';
        warning.style.marginTop = '4px';
        warning.style.fontWeight = 'bold';
        this.parentNode.appendChild(warning);
    }
    
    warning.innerText = "⚠️ The '/' character is reserved for auto-numbering!";
    
    // Clear the warning after 3 seconds
    clearTimeout(this.warningTimeout);
    this.warningTimeout = setTimeout(() => { warning.innerText = ''; }, 3000);
  }
});

// ==========================================
// FORM LOCKING LOGIC (READ-ONLY VIEW)
// ==========================================
function toggleExpReadOnly(isReadOnly) {
    const form = document.getElementById('expenseForm');
    form.querySelectorAll('input, select, textarea').forEach(el => {
        // ALWAYS keep the Status dropdown active
        if (el.id === 'expStatus') {
            el.disabled = false;
            el.style.backgroundColor = '';
        } else if (el.tagName === 'SELECT') {
            el.disabled = isReadOnly;
            el.style.backgroundColor = isReadOnly ? '#f9fafb' : '';
        } else {
            el.readOnly = isReadOnly;
            el.style.backgroundColor = isReadOnly ? '#f9fafb' : '';
        }
    });
    
    const actionContainer = document.getElementById('expViewActionContainer');
    const statusGroup = document.getElementById('expStatusGroup');
    const submitBtn = document.getElementById('expSubmit');
    const editBtn = document.getElementById('expEditBtn');

    // Always show the save button so you can save the status update
    submitBtn.style.display = 'block';

    if (isReadOnly) {
        // VIEW MODE: Hide static badge, show active dropdown, rename save button
        if (actionContainer) actionContainer.style.display = 'none';
        if (statusGroup) statusGroup.classList.remove('hidden');
        if (editBtn) editBtn.style.display = 'block';
        
        submitBtn.innerText = "Quick Save Status"; 
    } else {
        // EDIT MODE: Normal behavior
        if (actionContainer) actionContainer.style.display = 'none';
        if (editBtn) editBtn.style.display = 'none';
        
        if (statusGroup && document.getElementById('expEditId').value) {
            statusGroup.classList.remove('hidden');
        } else if (statusGroup) {
            statusGroup.classList.add('hidden'); // Hide if it's a brand new entry
        }
        
        submitBtn.innerText = document.getElementById('expEditId').value ? "Update Record" : "Save Expense";

        const currencySelect = document.getElementById('expCurrency');
        if (currencySelect) {
            // PRESERVE VALUES before triggering the change event so they don't wipe!
            const oldSar = document.getElementById('expAmountSAR').value;
            const oldPhp = document.getElementById('expAmountPHP').value;
            currencySelect.dispatchEvent(new Event('change'));
            document.getElementById('expAmountSAR').value = oldSar;
            document.getElementById('expAmountPHP').value = oldPhp;
        }
        
        const title = document.getElementById('expFormTitle');
        if (title && title.innerText.startsWith('View:')) {
            title.innerText = title.innerText.replace('View:', 'Edit:');
        }
    }
}

function triggerExpView(id) {
    triggerExpEdit(id); 
    document.getElementById('expFormTitle').innerText = "View: " + document.getElementById('expDesc').value;
    toggleExpReadOnly(true); 
}

// ==========================================
// EXPLICIT SUBMIT HANDLER
// ==========================================
document.getElementById('expenseForm').addEventListener('submit', (e) => {
  e.preventDefault(); 
  
  const editId = document.getElementById('expEditId').value;
  const currency = document.getElementById('expCurrency').value;
  
  const amountValue = currency === "SAR" 
    ? document.getElementById('expAmountSAR').value 
    : document.getElementById('expAmountPHP').value;

  const desc = document.getElementById('expDesc').value;
  const duration = parseInt(document.getElementById('expDuration').value) || 1;
  const baseMonthStr = document.getElementById('expMonth').value;
  const status = document.getElementById('expStatus') ? document.getElementById('expStatus').value : "Pending";
  const notes = document.getElementById('expNotes').value;
  const entryDate = document.getElementById('expDate').value;

  if (editId) {
    // Updating an EXISTING record
    const payload = {
      action: "editRecord", sheetName: "Expenses", id: editId,
      entryDate: entryDate, startMonth: baseMonthStr,
      description: desc,
      duration: document.getElementById('expDuration').value, // Keeps original duration for old edits
      currency: currency, totalAmount: amountValue, status: status, notes: notes
    };
    closeModal('expenseModal');
    submitToSheet(payload, 'expenseForm', 'expSubmit');
  } else {
    // Creating a NEW record: Auto-Split into individual months!
    closeModal('expenseModal');
    let [y, m] = baseMonthStr.split('-').map(Number);

    for (let i = 0; i < duration; i++) {
      let nextMonth = m + i;
      let nextYear = y;
      while (nextMonth > 12) { nextMonth -= 12; nextYear++; }
      let targetMonthStr = `${nextYear}-${String(nextMonth).padStart(2, '0')}`;

      const payload = {
        action: "addExpense", sheetName: "Expenses", id: "",
        entryDate: entryDate, startMonth: targetMonthStr,
        // Appends (1/3), (2/3) to the description so you know it's a series!
        description: duration > 1 ? `${desc} (${i+1}/${duration})` : desc,
        duration: 1, // FORCE duration to 1 so each month tracks independently
        currency: currency, totalAmount: amountValue, status: status, notes: notes
      };

      // We stagger the saves by half a second so Google Apps Script doesn't crash from receiving 12 saves at the exact same millisecond
      setTimeout(() => {
        submitToSheet(payload, 'expenseForm', 'expSubmit');
      }, i * 500); 
    }
  }
});

function renderExpenseHistory() {
  const expBody = document.querySelector('#expenseTableBody');
  expBody.innerHTML = "";
  
  // Grab search text
  const searchInput = document.getElementById('searchExpenses');
  const query = searchInput ? searchInput.value.toLowerCase() : "";

  let filtered = masterData.expenses.filter(exp => isItemActiveInMonth(exp, activeBrowserMonth)).reverse();
  
// Apply Search Filter
  if (query) {
    filtered = filtered.filter(exp => {
      const desc = String(exp["Description"] || "").toLowerCase();
      const notes = String(exp["Notes"] || "").toLowerCase();
      const stat = String(exp["Status"] || "").toLowerCase();
      return desc.includes(query) || notes.includes(query) || stat.includes(query);
    });
  }
  
  // ==========================================
  // ⬇️ ADD THIS NEW SORTING LOGIC ⬇️
  // ==========================================
  const statusPriority = {
      "Pending": 1,
      "In-Process": 1,
      "Paid": 2,
      "Cancelled": 3
  };

  filtered.sort((a, b) => {
      // Get the priority number (default to 99 if the status is somehow missing)
      let priorityA = statusPriority[a["Status"]] || 99;
      let priorityB = statusPriority[b["Status"]] || 99;
      
      // Sort by status priority first
      if (priorityA !== priorityB) {
          return priorityA - priorityB;
      }
      
      // If the statuses are the SAME, fallback to sorting by Date (newest first)
      let dateA = new Date(a["Entry Date"] || 0);
      let dateB = new Date(b["Entry Date"] || 0);
      return dateB - dateA; 
  });
  // ==========================================
  // ⬆️ END OF NEW SORTING LOGIC ⬆️
  // ==========================================

  if (filtered.length === 0) {
    expBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#6b7280;">No matching expenses found.</td></tr>`;
    return;
  }
  
filtered.forEach(exp => {
    let tr = document.createElement('tr');
    let displayDate = exp["Entry Date"] ? String(exp["Entry Date"]).substring(0, 10) : "N/A";
    
    // Grey out if Paid or Cancelled
    let rowStyle = (exp["Archived"] === true || exp["Archived"] === "TRUE" || exp["Status"] === "Paid" || exp["Status"] === "Cancelled") ? "opacity: 0.5;" : "";
    // --- NEW NOTE BUBBLE LOGIC ---
    let rawNote = exp["Notes"] || "";
    let noteText = "";
    if (rawNote.trim() !== "") {
        noteText = `<div class="note-bubble" onclick="openNoteModal('${encodeURIComponent(rawNote)}')">${rawNote}</div>`;
    } else {
        noteText = `<span class="empty-note">-</span>`;
    }
    
    let subAmountHTML = "";
    if (exp["Currency"] === "PHP") {
      subAmountHTML = `<br><small style="color: #9ca3af; font-size: 11px;">${parseFloat(exp["Total Amount"] || 0).toFixed(2)} PHP</small>`;
    }

    // --- NEW FORMATTING LOGIC ---
    let rawDesc = exp["Description"] || "";
    let cleanDesc = rawDesc;
    let paymentText = "One-time payment"; // Default for single-month items

    // This scans for the "(X/Y)" pattern at the end of the description
    const descMatch = rawDesc.match(/(.*?)\s*\((\d+)\/(\d+)\)$/);
    if (descMatch) {
      cleanDesc = descMatch[1].trim(); // The clean name (e.g., "Car Loan")
      paymentText = `Payment ${descMatch[2]} out of ${descMatch[3]}`; // The extracted numbers
    } else if (parseInt(exp["Duration (Months)"]) > 1) {
      // Fallback for old legacy entries
      paymentText = `${exp["Duration (Months)"]} mo(s)`;
    }
    // ----------------------------
    
    // Cross out the amount visually if it's Cancelled
    let amountStyle = exp["Status"] === "Cancelled" ? "text-decoration: line-through; color: #9ca3af;" : "color: var(--danger); font-weight: bold;";
    
    tr.style = rowStyle;
    tr.innerHTML = `
      <td><strong>${cleanDesc}</strong><br><small style="color: #6b7280;">${paymentText}</small><br><span class="mobile-status-badge"><span class="badge ${String(exp["Status"]).replace(/\s+/g, '-')}">${exp["Status"]}</span></span></td>
      <td style="${amountStyle}">
        ${parseFloat(exp["Monthly Deduction (SAR)"] || 0).toFixed(2)}
        ${subAmountHTML}
      </td>
      <td class="mobile-hide"><span class="badge ${String(exp["Status"]).replace(/\s+/g, '-')}">${exp["Status"]}</span></td>
      <td>${noteText}</td>
      <td>
         <button class="btn btn-edit" onclick="triggerExpView('${exp["ID"]}')" style="margin: 0; width: 100%; text-align: center; background: #0ea5e9; color: white;">View / Edit</button>
      </td>
    `;
    expBody.appendChild(tr);
  });
}

function triggerExpEdit(id) {
  const exp = masterData.expenses.find(i => i["ID"] === id);
  if(!exp) return;
  
  toggleExpReadOnly(false); 
  
  document.getElementById('expEditId').value = id;
  document.getElementById('expDate').value = String(exp["Entry Date"]).substring(0, 10);
  document.getElementById('expMonth').value = String(exp["Start Month"]).trim().substring(0, 7);
  document.getElementById('expDesc').value = exp["Description"];
  document.getElementById('expDuration').value = exp["Duration (Months)"];
  document.getElementById('expCurrency').value = exp["Currency"];
  
  if (exp["Currency"] === "SAR") {
    document.getElementById('expAmountSAR').value = exp["Total Amount"];
    document.getElementById('expAmountPHP').value = (exp["Total Amount"] * livePhpRate).toFixed(2);
  } else {
    document.getElementById('expAmountPHP').value = exp["Total Amount"];
    document.getElementById('expAmountSAR').value = (exp["Total Amount"] / livePhpRate).toFixed(2);
  }

  document.getElementById('expNotes').value = exp["Notes"] || "";
  document.getElementById('expStatus').value = exp["Status"] || "Pending";
  document.getElementById('expStatusGroup').classList.remove('hidden');
  document.getElementById('expFormTitle').innerText = `Edit: ${exp["Description"]}`;
  document.getElementById('expSubmit').innerText = "Update Record";
  
  openModal('expenseModal');
}

function cancelExpEdit() {
  document.getElementById('expenseForm').reset();
  document.getElementById('expEditId').value = "";
  document.getElementById('expStatusGroup').classList.add('hidden');
  document.getElementById('expDate').value = today;
  document.getElementById('expMonth').value = activeBrowserMonth; 
  document.getElementById('expFormTitle').innerText = "Schedule New Expense";
  document.getElementById('expSubmit').innerText = "Save Expense";
  
  closeModal('expenseModal'); 
}

function openNewExpModal() {
  document.getElementById('expenseForm').reset();
  document.getElementById('expEditId').value = "";
  
  toggleExpReadOnly(false); 
  
  document.getElementById('expDate').value = today;
  document.getElementById('expMonth').value = activeBrowserMonth; 
  
  document.getElementById('expStatusGroup').classList.add('hidden');
  document.getElementById('expFormTitle').innerText = "Schedule New Expense";
  document.getElementById('expSubmit').innerText = "Save Expense";
  
  const currencySelect = document.getElementById('expCurrency');
  if(currencySelect) {
    currencySelect.value = "SAR"; 
    currencySelect.dispatchEvent(new Event('change')); 
  }
  
  openModal('expenseModal');
}
