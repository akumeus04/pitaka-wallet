// ==========================================
// INCOME (SALARY) LOGIC
// ==========================================

// Handle Form Submission
document.getElementById('incomeForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const editId = document.getElementById('incEditId').value;
  
  const payload = {
    action: editId ? "editRecord" : "addIncome", 
    sheetName: "Income", 
    id: editId,
    entryDate: document.getElementById('incDate').value,
    applicableMonth: document.getElementById('incMonth').value,
    description: document.getElementById('incDesc').value,
    amount: document.getElementById('incAmount').value,
    notes: document.getElementById('incNotes').value
  };
  
  closeModal('incomeModal'); 
  submitToSheet(payload, 'incomeForm', 'incSubmit');
});

// Render the Ledger (Filtered by the Month Browser)
function renderIncomeHistory() {
  const incBody = document.querySelector('#incomeTableBody');
  incBody.innerHTML = "";
  
  const filtered = masterData.income.filter(inc => String(inc["Applicable Month"]).trim().startsWith(activeBrowserMonth)).reverse();
  
  if (filtered.length === 0) {
    incBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#6b7280;">No income entries for ${document.getElementById('currentBrowserMonthDisplay').innerText}</td></tr>`;
    return;
  }

  filtered.forEach(inc => {
    let tr = document.createElement('tr');
    let displayDate = inc["Entry Date"] ? String(inc["Entry Date"]).substring(0, 10) : "N/A";
    let noteText = inc["Notes"] ? `<span style="font-size: 12px; color: #4b5563;">${inc["Notes"]}</span>` : `<span style="font-size: 12px; color: #9ca3af; font-style: italic;">No note</span>`;
    
    tr.innerHTML = `
      <td class="mobile-hide">${displayDate}</td>
      <td class="mobile-hide">${inc["Applicable Month"]}</td>
      <td>${inc["Description"]}<br><span class="mobile-status-badge"><small style="color:#6b7280;">${inc["Applicable Month"]}</small></span></td>
      <td style="color: var(--success); font-weight: bold;">${parseFloat(inc["Amount (SAR)"] || 0).toFixed(2)}</td>
      <td>${noteText}</td>
      <td>
         <button class="btn btn-edit" onclick="triggerIncEdit('${inc["ID"]}')" style="width: 100%;">Edit / Note</button>
      </td>
    `;
    incBody.appendChild(tr);
  });
}

function openNewIncModal() {
  document.getElementById('incomeForm').reset();
  document.getElementById('incEditId').value = "";
  document.getElementById('incDate').value = today;
  document.getElementById('incMonth').value = activeBrowserMonth; 
  document.getElementById('incFormTitle').innerText = "Add New Income";
  document.getElementById('incSubmit').innerText = "Save Income";
  
  openModal('incomeModal');
}

function triggerIncEdit(id) {
  const inc = masterData.income.find(i => i["ID"] === id);
  if(!inc) return;
  
  document.getElementById('incEditId').value = id;
  document.getElementById('incDate').value = String(inc["Entry Date"]).substring(0, 10);
  document.getElementById('incMonth').value = String(inc["Applicable Month"]).trim().substring(0, 7);
  document.getElementById('incDesc').value = inc["Description"];
  document.getElementById('incAmount').value = inc["Amount (SAR)"];
  document.getElementById('incNotes').value = inc["Notes"] || "";
  
  document.getElementById('incFormTitle').innerText = "Edit Income";
  document.getElementById('incSubmit').innerText = "Update Record";
  
  openModal('incomeModal'); 
}

function cancelIncEdit() {
  document.getElementById('incomeForm').reset();
  document.getElementById('incEditId').value = "";
  document.getElementById('incDate').value = today;
  document.getElementById('incMonth').value = activeBrowserMonth;
  document.getElementById('incFormTitle').innerText = "Add New Income";
  document.getElementById('incSubmit').innerText = "Save Income";
  
  closeModal('incomeModal'); 
}

// ==========================================
// NEW: BULK DUPLICATE ALL INCOME TO NEXT MONTH
// ==========================================
async function duplicateAllIncomeToNextMonth() {
  const currentIncome = masterData.income.filter(inc => String(inc["Applicable Month"]).trim().startsWith(activeBrowserMonth));

  if (currentIncome.length === 0) {
    alert("There are no income entries in this month to duplicate!");
    return;
  }

  let [year, month] = activeBrowserMonth.split('-').map(Number);
  month += 1;
  if (month > 12) { month = 1; year += 1; }
  let nextMonthStr = `${year}-${String(month).padStart(2, '0')}`;

  const initialConfirm = confirm(`Are you sure you want to copy ${currentIncome.length} income entries from ${activeBrowserMonth} to ${nextMonthStr}?`);
  if (!initialConfirm) return; 

  const nextIncome = masterData.income.filter(inc => String(inc["Applicable Month"]).trim().startsWith(nextMonthStr));
  if (nextIncome.length > 0) {
    const proceed = confirm(`⚠️ WARNING: You already have income saved for ${nextMonthStr}! \n\nIf you continue, it will create duplicate entries for the same month. Do you really want to do this?`);
    if (!proceed) return;
  }

  const duplicateBtn = document.querySelector('button[onclick="duplicateAllIncomeToNextMonth()"]');
  if (duplicateBtn) {
    duplicateBtn.disabled = true;
    duplicateBtn.style.opacity = "0.5";
    duplicateBtn.innerText = "⏳ Duplicating...";
  }

  showStatus(`⏳ Duplicating ${currentIncome.length} entries to ${nextMonthStr}...`, false);

  try {
    for (let inc of currentIncome) {
      const payload = {
        action: "addIncome", sheetName: "Income", id: "", 
        entryDate: today, applicableMonth: nextMonthStr,
        description: inc["Description"] || "",
        amount: parseFloat(inc["Amount (SAR)"] || 0),
        notes: inc["Notes"] || ""
      };
      
      // Send to Firebase (Instant)
      payload.id = db.ref('income').push().key;
      await db.ref(`income/${payload.id}`).set(payload);

      // Send to Sheets (Background Backup)
      fetch(MAIN_WEB_APP_URL, {
        method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(payload)
      });
    }

    showStatus("✅ All Income successfully duplicated!", false);
    
    if (duplicateBtn) {
      duplicateBtn.disabled = false;
      duplicateBtn.style.opacity = "1";
      duplicateBtn.innerText = "📑 Duplicate All";
    }
  } catch (error) {
    showStatus("❌ Failed to duplicate income.", true);
    if (duplicateBtn) {
      duplicateBtn.disabled = false;
      duplicateBtn.style.opacity = "1";
      duplicateBtn.innerText = "📑 Duplicate All";
    }
  }
} // <--- This was the missing bracket!