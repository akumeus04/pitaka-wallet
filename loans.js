setupCurrencyCalculator('loan');

// SAFETY NET: Prevent user from using '/' and show warning inside the modal
document.getElementById('loanDesc').addEventListener('input', function(e) {
  if (this.value.includes('/')) {
    this.value = this.value.replace(/\//g, '-'); // Swap slash for a dash
    
    // Inject a local warning directly under the input box
    let warning = document.getElementById('loanDescWarning');
    if (!warning) {
        warning = document.createElement('div');
        warning.id = 'loanDescWarning';
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
function toggleLoanReadOnly(isReadOnly) {
    const form = document.getElementById('loanForm');
    form.querySelectorAll('input, select, textarea').forEach(el => {
        // ALWAYS keep the Status dropdown active
        if (el.id === 'loanStatus') {
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
    
    const actionContainer = document.getElementById('loanViewActionContainer');
    const statusGroup = document.getElementById('loanStatusGroup');
    const submitBtn = document.getElementById('loanSubmit');
    const editBtn = document.getElementById('loanEditBtn');

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
        
        if (statusGroup && document.getElementById('loanEditId').value) {
            statusGroup.classList.remove('hidden');
        } else if (statusGroup) {
            statusGroup.classList.add('hidden'); // Hide if it's a brand new entry
        }
        
        submitBtn.innerText = document.getElementById('loanEditId').value ? "Update Record" : "Save Loan";

        const currencySelect = document.getElementById('loanCurrency');
        if (currencySelect) {
            // PRESERVE VALUES before triggering the change event so they don't wipe!
            const oldSar = document.getElementById('loanAmountSAR').value;
            const oldPhp = document.getElementById('loanAmountPHP').value;
            currencySelect.dispatchEvent(new Event('change'));
            document.getElementById('loanAmountSAR').value = oldSar;
            document.getElementById('loanAmountPHP').value = oldPhp;
        }
        
        const title = document.getElementById('loanFormTitle');
        if (title && title.innerText.startsWith('View:')) {
            title.innerText = title.innerText.replace('View:', 'Edit:');
        }
    }
}

function triggerLoanView(id) {
    triggerLoanEdit(id); 
    document.getElementById('loanFormTitle').innerText = "View: " + document.getElementById('loanDesc').value;
    toggleLoanReadOnly(true); 
}

// ==========================================
// EXPLICIT SUBMIT HANDLER
// ==========================================
document.getElementById('loanForm').addEventListener('submit', (e) => {
  e.preventDefault(); 
  
  const editId = document.getElementById('loanEditId').value;
  const currency = document.getElementById('loanCurrency').value;
  
  const amountValue = currency === "SAR" 
    ? document.getElementById('loanAmountSAR').value 
    : document.getElementById('loanAmountPHP').value;

  const desc = document.getElementById('loanDesc').value;
  const duration = parseInt(document.getElementById('loanDuration').value) || 1;
  const baseMonthStr = document.getElementById('loanMonth').value;
  const status = document.getElementById('loanStatus') ? document.getElementById('loanStatus').value : "Pending";
  const notes = document.getElementById('loanNotes').value;
  const entryDate = document.getElementById('loanDate').value;

  if (editId) {
    // Updating an EXISTING record
    const payload = {
      action: "editRecord", sheetName: "Loans", id: editId,
      entryDate: entryDate, startMonth: baseMonthStr,
      description: desc,
      duration: document.getElementById('loanDuration').value, // Keeps original duration for old edits
      currency: currency, totalAmount: amountValue, status: status, notes: notes
    };
    closeModal('loanModal');
    submitToSheet(payload, 'loanForm', 'loanSubmit');
  } else {
    // Creating a NEW record: Auto-Split into individual months!
    closeModal('loanModal');
    let [y, m] = baseMonthStr.split('-').map(Number);

    for (let i = 0; i < duration; i++) {
      let nextMonth = m + i;
      let nextYear = y;
      while (nextMonth > 12) { nextMonth -= 12; nextYear++; }
      let targetMonthStr = `${nextYear}-${String(nextMonth).padStart(2, '0')}`;

      const payload = {
        action: "addLoan", sheetName: "Loans", id: "",
        entryDate: entryDate, startMonth: targetMonthStr,
        description: duration > 1 ? `${desc} (${i+1}/${duration})` : desc,
        duration: 1, // FORCE duration to 1 so each month tracks independently
        currency: currency, totalAmount: amountValue, status: status, notes: notes
      };

      // Stagger the saves so Google Apps script handles them smoothly
      setTimeout(() => {
        submitToSheet(payload, 'loanForm', 'loanSubmit');
      }, i * 500);
    }
  }
});

function renderLoanHistory() {
  const loanBody = document.querySelector('#loanTableBody');
  if(!loanBody) return;
  loanBody.innerHTML = "";
  
  const searchInput = document.getElementById('searchLoans');
  const query = searchInput ? searchInput.value.toLowerCase() : "";

  let filtered = masterData.loans.filter(loan => isItemActiveInMonth(loan, activeBrowserMonth)).reverse();
  
  // Apply Search Filter
  if (query) {
    filtered = filtered.filter(loan => {
      const desc = String(loan["Description"] || "").toLowerCase();
      const notes = String(loan["Notes"] || "").toLowerCase();
      const stat = String(loan["Status"] || "").toLowerCase();
      return desc.includes(query) || notes.includes(query) || stat.includes(query);
    });
  }
  
  // Apply Sorting Logic
  const statusPriority = {
      "Pending": 1,
      "In-Process": 2,
      "Paid": 3,
      "Cancelled": 4
  };

  filtered.sort((a, b) => {
      let priorityA = statusPriority[a["Status"]] || 99;
      let priorityB = statusPriority[b["Status"]] || 99;
      
      if (priorityA !== priorityB) {
          return priorityA - priorityB;
      }
      
      let dateA = new Date(a["Entry Date"] || 0);
      let dateB = new Date(b["Entry Date"] || 0);
      return dateB - dateA; 
  });

  if (filtered.length === 0) {
    loanBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#6b7280;">No matching loans found.</td></tr>`;
    return;
  }

  filtered.forEach(loan => {
    let tr = document.createElement('tr');
    let displayDate = loan["Entry Date"] ? String(loan["Entry Date"]).substring(0, 10) : "N/A";
    
    let rowStyle = (loan["Archived"] === true || loan["Archived"] === "TRUE" || loan["Status"] === "Paid" || loan["Status"] === "Cancelled") ? "opacity: 0.5;" : "";
    
    // Note Bubble Logic
    let rawNote = loan["Notes"] || "";
    let noteText = "";
    if (rawNote.trim() !== "") {
        noteText = `<div class="note-bubble" onclick="openNoteModal('${encodeURIComponent(rawNote)}')">${rawNote}</div>`;
    } else {
        noteText = `<span class="empty-note">-</span>`;
    }
    
    // PHP Sub-Amount Logic
    let subAmountHTML = "";
    if (loan["Currency"] === "PHP") {
      subAmountHTML = `<br><small style="color: #9ca3af; font-size: 11px;">${parseFloat(loan["Total Amount"] || 0).toFixed(2)} PHP</small>`;
    }
    
    // Formatting Logic
    let rawDesc = loan["Description"] || "";
    let cleanDesc = rawDesc;
    let paymentText = "One-time payment"; 

    const descMatch = rawDesc.match(/(.*?)\s*\((\d+)\/(\d+)\)$/);
    if (descMatch) {
      cleanDesc = descMatch[1].trim(); 
      paymentText = `Payment ${descMatch[2]} of ${descMatch[3]}`; 
    } else if (parseInt(loan["Duration (Months)"]) > 1) {
      paymentText = `${loan["Duration (Months)"]} mo(s)`;
    }

    let amountStyle = loan["Status"] === "Cancelled" ? "text-decoration: line-through; color: #9ca3af;" : "color: var(--warning); font-weight: bold;";

    tr.style = rowStyle;
    tr.innerHTML = `
      <td class="mobile-hide"><small>${displayDate}</small><br><strong>${loan["Start Month"] || ""}</strong></td>
      <td><strong>${cleanDesc}</strong><br><small style="color: #6b7280;">${paymentText}</small><br><span class="mobile-status-badge"><span class="badge ${String(loan["Status"]).replace(/\s+/g, '-')}">${loan["Status"]}</span></span></td>
      <td style="${amountStyle}">
        ${parseFloat(loan["Monthly Deduction (SAR)"] || 0).toFixed(2)}
        ${subAmountHTML}
      </td>
      <td class="mobile-hide"><span class="badge ${String(loan["Status"]).replace(/\s+/g, '-')}">${loan["Status"]}</span></td>
      <td>${noteText}</td>
      <td>
         <button class="btn btn-edit" onclick="triggerLoanView('${loan["ID"]}')" style="margin: 0; width: 100%; text-align: center; background: #0ea5e9; color: white;">View / Edit</button>
      </td>
    `;
    loanBody.appendChild(tr);
  });
}

function triggerLoanEdit(id) {
  const loan = masterData.loans.find(i => i["ID"] === id);
  if(!loan) return;
  
  toggleLoanReadOnly(false); 
  
  document.getElementById('loanEditId').value = id;
  document.getElementById('loanDate').value = String(loan["Entry Date"]).substring(0, 10);
  document.getElementById('loanMonth').value = String(loan["Start Month"]).trim().substring(0, 7);
  document.getElementById('loanDesc').value = loan["Description"];
  document.getElementById('loanDuration').value = loan["Duration (Months)"];
  document.getElementById('loanCurrency').value = loan["Currency"];
  
  if (loan["Currency"] === "SAR") {
    document.getElementById('loanAmountSAR').value = loan["Total Amount"];
    document.getElementById('loanAmountPHP').value = (loan["Total Amount"] * livePhpRate).toFixed(2);
  } else {
    document.getElementById('loanAmountPHP').value = loan["Total Amount"];
    document.getElementById('loanAmountSAR').value = (loan["Total Amount"] / livePhpRate).toFixed(2);
  }

  document.getElementById('loanNotes').value = loan["Notes"] || "";
  document.getElementById('loanStatus').value = loan["Status"] || "Pending";
  document.getElementById('loanStatusGroup').classList.remove('hidden');
  document.getElementById('loanFormTitle').innerText = `Edit: ${loan["Description"]}`;
  document.getElementById('loanSubmit').innerText = "Update Record";
  
  openModal('loanModal'); 
}

function cancelLoanEdit() {
  document.getElementById('loanForm').reset();
  document.getElementById('loanEditId').value = "";
  document.getElementById('loanStatusGroup').classList.add('hidden');
  document.getElementById('loanDate').value = today;
  document.getElementById('loanMonth').value = activeBrowserMonth; 
  document.getElementById('loanFormTitle').innerText = "Schedule New Loan";
  document.getElementById('loanSubmit').innerText = "Save Loan";
  
  closeModal('loanModal'); 
}

function openNewLoanModal() {
  document.getElementById('loanForm').reset();
  document.getElementById('loanEditId').value = "";
  
  toggleLoanReadOnly(false); 
  
  document.getElementById('loanDate').value = today;
  document.getElementById('loanMonth').value = activeBrowserMonth; 
  
  document.getElementById('loanStatusGroup').classList.add('hidden');
  document.getElementById('loanFormTitle').innerText = "Schedule New Loan";
  document.getElementById('loanSubmit').innerText = "Save Loan";
  
  const currencySelect = document.getElementById('loanCurrency');
  if(currencySelect) {
    currencySelect.value = "SAR"; 
    currencySelect.dispatchEvent(new Event('change')); 
  }
  
  openModal('loanModal');
}
