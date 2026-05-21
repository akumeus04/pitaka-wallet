// ==========================================
// DASHBOARD LOGIC (12-Month Forecaster)
// ==========================================

function calculateActiveBurden(itemsArray, targetMonthStr) {
  const parseMonth = (mStr) => parseInt(mStr.split('-')[0]) * 12 + parseInt(mStr.split('-')[1]);
  const targetInt = parseMonth(targetMonthStr);
  let totalDeduction = 0;

  itemsArray.forEach(item => {
    if (item["Archived"] === true || item["Archived"] === "TRUE") return;
    if (item["Status"] === "Cancelled") return; // 🎯 IGNORE CANCELLED ITEMS
    
    let rawStart = String(item["Start Month"] || "").trim().substring(0, 7);
    if (!rawStart) return;
    
    const startInt = parseMonth(rawStart);
    const duration = parseInt(item["Duration (Months)"]);
    
    if (targetInt >= startInt && targetInt < (startInt + duration)) {
      totalDeduction += parseFloat(item["Monthly Deduction (SAR)"] || 0);
    }
  });
  return totalDeduction;
}

function renderDashboard() {
  const dashBody = document.querySelector('#dashboardTable tbody');
  if(!dashBody) return;
  dashBody.innerHTML = "";

  // 1. Fetch the user's budget limit from the input
  const budgetLimit = parseFloat(document.getElementById('budgetLimitInput').value) || 0;

  let dateCursor = new Date();
  dateCursor.setMonth(dateCursor.getMonth() - 1); // Start from Last Month
  
  for(let i = 0; i < 12; i++) {
    let y = dateCursor.getFullYear();
    let m = String(dateCursor.getMonth() + 1).padStart(2, '0');
    let monthStr = `${y}-${m}`;
    
    // Calculate Income
    let monthIncome = masterData.income
      .filter(inc => String(inc["Applicable Month"] || "").trim().startsWith(monthStr))
      .reduce((sum, inc) => sum + parseFloat(inc["Amount (SAR)"] || 0), 0);

    // Calculate Expenses & Loans
    let monthExp = calculateActiveBurden(masterData.expenses, monthStr);
    let monthLoan = calculateActiveBurden(masterData.loans, monthStr);
    
// Bulletproof Allowance Calculation
    let monthAlw = (masterData.allowances || [])
      .filter(alw => {
        // 1. Skip if Archived
        if (alw["Archived"] === "TRUE" || alw["Archived"] === true) return false;
        
        // 2. ⬇️ ADD THIS LINE: Skip if Cancelled ⬇️
        if (alw["Status"] === "Cancelled") return false; 
        
        // 3. Month checking logic
        let raw = String(alw["Allowance Month"] || "").trim();
        if (raw.startsWith(monthStr)) return true;
        let d = new Date(raw);
        if (!isNaN(d)) {
          let dy = d.getFullYear();
          let dm = String(d.getMonth() + 1).padStart(2, '0');
          return `${dy}-${dm}` === monthStr;
        }
        return false;
      })
      .reduce((sum, alw) => {
        let sheetPHP = parseFloat(alw["Total PHP"] || 0);
        let safeRate = (typeof livePhpRate !== 'undefined' && livePhpRate > 0) ? livePhpRate : 14.8;
        let accurateSAR = sheetPHP / safeRate;
        return sum + accurateSAR;
      }, 0);

    // 2. Determine Total Monthly Obligations
    let totalObligations = monthExp + monthLoan + monthAlw;

    // Subtract everything to get the New Balance
    let newBalance = monthIncome - totalObligations;

    let displayMonth = dateCursor.toLocaleString('default', { month: 'short', year: 'numeric' });
    
    // 3. Logic for Highlights (Budget vs. Current Month)
    let isCurrentMonth = (new Date().getMonth() === dateCursor.getMonth()) ? "background-color: #f0fdf4;" : "";
    let isOverBudget = (totalObligations > budgetLimit) ? "background-color: rgba(220, 38, 38, 0.15) !important;" : "";
    
    // Combine styles (Budget alert takes priority over current month highlight)
    let finalRowStyle = isOverBudget || isCurrentMonth;
    let budgetWarning = isOverBudget ? ' 🚩' : '';

    let tr = document.createElement('tr');
    
    tr.style = finalRowStyle + " cursor: pointer;";
    tr.title = isOverBudget ? "ALERT: Spending exceeds budget limit!" : "Click to view full month summary";
    tr.onmouseover = function() { this.style.opacity = "0.7"; };
    tr.onmouseout = function() { this.style.opacity = "1"; };
    tr.onclick = () => openMonthSummary(displayMonth, monthIncome, monthExp, monthLoan, monthAlw);
    
    tr.innerHTML = `
      <td style="font-weight: bold;">${displayMonth}${budgetWarning}</td>
      <td style="color: var(--success);">${monthIncome.toFixed(2)}</td>
      <td style="color: var(--danger);">${monthExp.toFixed(2)}</td>
      <td style="color: var(--warning);">${monthLoan.toFixed(2)}</td>
      <td style="color: #0ea5e9;">${monthAlw.toFixed(2)}</td>
      <td style="border-left: 2px solid var(--border); color: var(--primary); font-weight: bold;">${newBalance.toFixed(2)}</td>
    `;
    dashBody.appendChild(tr);

    dateCursor.setMonth(dateCursor.getMonth() + 1);
  }
}

// ==========================================
// SMART MONTH SUMMARY MODAL (Perfect Sync Version)
// ==========================================
function openMonthSummary(displayMonth, totalIncomeSAR, totalExpSAR, totalLoanSAR, totalAlwSAR) {
    const [monthName, year] = displayMonth.split(' ');
    // Convert short name back to YYYY-MM for filtering
    const monthNum = new Date(Date.parse(monthName +" 1, 2026")).getMonth() + 1;
    const targetMonthStr = `${year}-${String(monthNum).padStart(2, '0')}`;

    const safeRate = (typeof livePhpRate !== 'undefined' && livePhpRate > 0) ? livePhpRate : 14.8;
    
    // Calculate New Balance directly from the passed Dashboard numbers
    const newBalance = totalIncomeSAR - totalExpSAR - totalLoanSAR - totalAlwSAR;

    // --- ACCUMULATORS ---
    let spentSAR = 0; 
    let phpExpensesAndLoansInSAR = 0; 

    // 1. Separate Expenses & Loans using the EXACT Dashboard math
const filterByMonth = (item) => {
        if (item["Archived"] === true || item["Archived"] === "TRUE") return false;
        if (item["Status"] === "Cancelled") return false; // 🎯 IGNORE CANCELLED ITEMS
        let rawStart = String(item["Start Month"] || "").trim().substring(0, 7);
        if (!rawStart) return false;
        
        const parseMonth = (mStr) => parseInt(mStr.split('-')[0]) * 12 + parseInt(mStr.split('-')[1]);
        const startInt = parseMonth(rawStart);
        const targetInt = parseMonth(targetMonthStr);
        const duration = parseInt(item["Duration (Months)"]);
        return targetInt >= startInt && targetInt < (startInt + duration);
    };

    [...masterData.expenses, ...masterData.loans].filter(filterByMonth).forEach(item => {
        // Grab the exact monthly deduction the dashboard calculated
        const monthlySAR = parseFloat(item["Monthly Deduction (SAR)"] || 0);
        
        // Group by currency
        if (item["Currency"] === "PHP") {
            phpExpensesAndLoansInSAR += monthlySAR;
        } else {
            spentSAR += monthlySAR;
        }
    });

    // 2. Combine all PHP Obligations (Expenses + Loans + the Allowance passed from dashboard)
    const totalPhpObligationsInSAR = phpExpensesAndLoansInSAR + totalAlwSAR;
    
    // Reverse engineer the PHP amount to ensure 100% mathematical alignment
    const totalPhpObligations = totalPhpObligationsInSAR * safeRate;

    // --- UPDATE UI ---
    document.getElementById('summaryMonthTitle').innerText = `${displayMonth} Overview`;
    document.getElementById('summaryExchangeRate').innerText = safeRate.toFixed(2);
    document.getElementById('summaryNewBalance').innerText = newBalance.toFixed(2) + " SAR";
    
    // PHP Bucket
    document.getElementById('sumPhpTotal').innerText = totalPhpObligations.toFixed(2) + " PHP";
    document.getElementById('sumPhpConverted').innerText = totalPhpObligationsInSAR.toFixed(2) + " SAR";
    
    // SAR Bucket
    document.getElementById('sumSarTotal').innerText = spentSAR.toFixed(2) + " SAR";

    openModal('monthSummaryModal');
}

// ==========================================
// CATEGORY SPECIFIC OVERVIEW MODAL
// ==========================================
function openCategoryOverview(type) {
    const monthStr = activeBrowserMonth; 
    const displayMonth = document.getElementById('currentBrowserMonthDisplay').innerText;
    const safeRate = (typeof livePhpRate !== 'undefined' && livePhpRate > 0) ? livePhpRate : 14.8;

    let title = `${displayMonth} Overview`;
    let htmlContent = "";

    if (type === 'income') {
        let total = 0;
        const filtered = masterData.income.filter(inc => String(inc["Applicable Month"]).trim().startsWith(monthStr));
        filtered.forEach(inc => total += parseFloat(inc["Amount (SAR)"] || 0));
        
        title = `${displayMonth} Income Overview`;
        htmlContent = `
            <div style="background: #f0fdf4; padding: 12px; border-radius: 8px; border: 1px solid #bbf7d0; margin-bottom: 10px;">
               <div style="font-weight: bold; color: var(--success); margin-bottom: 8px; font-size: 14px;">Total Income</div>
               <div style="display: flex; justify-content: space-between;"><span>Amount:</span> <strong style="color: var(--success);">${total.toFixed(2)} SAR</strong></div>
            </div>
        `;
    } else if (type === 'expenses' || type === 'loans') {
        const data = type === 'expenses' ? masterData.expenses : masterData.loans;
        let sarTotal = 0;
        let phpTotal = 0;
        let combinedSAR = 0;

const filtered = data.filter(item => isItemActiveInMonth(item, monthStr) && item["Status"] !== "Cancelled"); // 🎯 IGNORE CANCELLED ITEMS
        filtered.forEach(item => {
            const deduction = parseFloat(item["Monthly Deduction (SAR)"] || 0);
            combinedSAR += deduction;
            if (item["Currency"] === "PHP") {
                phpTotal += parseFloat(item["Total Amount"] || 0);
            } else {
                sarTotal += parseFloat(item["Total Amount"] || 0);
            }
        });

        const phpConverted = phpTotal / safeRate;

        title = `${displayMonth} ${type === 'expenses' ? 'Expenses' : 'Loans'} Overview`;
        htmlContent = `
            <div style="display: flex; justify-content: space-between; margin-bottom: 15px; font-size: 13px; font-weight: bold; color: #4b5563;">
              <span>Exchange Rate:</span> <span style="color: var(--primary);">${safeRate.toFixed(2)} PHP/SAR</span>
            </div>
            
            <div style="background: #fef2f2; padding: 12px; border-radius: 8px; border: 1px solid #fecaca; margin-bottom: 10px;">
               <div style="font-weight: bold; color: var(--danger); margin-bottom: 8px; font-size: 14px;">PHP Based ${type === 'expenses' ? 'Expenses' : 'Loans'}</div>
               <div style="display: flex; justify-content: space-between; margin-bottom: 4px;"><span>Amount in PHP:</span> <strong style="color: var(--danger);">${phpTotal.toFixed(2)} PHP</strong></div>
               <div style="display: flex; justify-content: space-between;"><span>Converted to SAR:</span> <strong>${phpConverted.toFixed(2)} SAR</strong></div>
            </div>

            <div style="background: #f0fdf4; padding: 12px; border-radius: 8px; border: 1px solid #bbf7d0; margin-bottom: 10px;">
               <div style="font-weight: bold; color: var(--success); margin-bottom: 8px; font-size: 14px;">SAR Based ${type === 'expenses' ? 'Expenses' : 'Loans'}</div>
               <div style="display: flex; justify-content: space-between;"><span>Amount in SAR:</span> <strong style="color: var(--success);">${sarTotal.toFixed(2)} SAR</strong></div>
            </div>
            
            <div style="padding: 12px; border-top: 2px solid var(--border); font-size: 14px;">
               <div style="display: flex; justify-content: space-between; font-weight: bold;"><span>Total Monthly Burden:</span> <span style="color: var(--primary);">${combinedSAR.toFixed(2)} SAR</span></div>
            </div>
        `;
} else if (type === 'allowances') {
        let totalPHP = 0;
        let totalDays = 0;
        const filtered = masterData.allowances.filter(alw => {
            if (alw["Archived"] === "TRUE" || alw["Archived"] === true) return false;
            
            // ⬇️ ADD THIS LINE: Skip Cancelled Allowances ⬇️
            if (alw["Status"] === "Cancelled") return false; 
            
            let raw = String(alw["Allowance Month"] || "").trim();
            if (raw.startsWith(monthStr)) return true;
            let d = new Date(raw);
            if (!isNaN(d)) {
              let dy = d.getFullYear();
              let dm = String(d.getMonth() + 1).padStart(2, '0');
              return `${dy}-${dm}` === monthStr;
            }
            return false;
        });

        filtered.forEach(alw => {
            totalPHP += parseFloat(alw["Total PHP"] || 0);
            totalDays += parseInt(alw["Total Workdays"] || 0);
        });

        const combinedSAR = totalPHP / safeRate;

        title = `${displayMonth} Allowances Overview`;
        htmlContent = `
            <div style="display: flex; justify-content: space-between; margin-bottom: 15px; font-size: 13px; font-weight: bold; color: #4b5563;">
              <span>Exchange Rate:</span> <span style="color: var(--primary);">${safeRate.toFixed(2)} PHP/SAR</span>
            </div>

            <div style="background: #fef2f2; padding: 12px; border-radius: 8px; border: 1px solid #fecaca; margin-bottom: 10px;">
               <div style="font-weight: bold; color: var(--danger); margin-bottom: 8px; font-size: 14px;">Allowance Breakdown</div>
               <div style="display: flex; justify-content: space-between; margin-bottom: 4px;"><span>Total Workdays:</span> <strong>${totalDays} Days</strong></div>
               <div style="display: flex; justify-content: space-between; margin-bottom: 4px;"><span>Amount in PHP:</span> <strong style="color: var(--danger);">${totalPHP.toFixed(2)} PHP</strong></div>
               <div style="display: flex; justify-content: space-between;"><span>Converted to SAR:</span> <strong>${combinedSAR.toFixed(2)} SAR</strong></div>
            </div>
        `;
    } else if (type === 'todos') {
        let totalUnpaid = 0;
        let totalPaid = 0;
        let countUnpaid = 0;
        let countPaid = 0;

        const filtered = allTodos.filter(todo => {
             let [y, m, d] = String(todo.startDate).split('-').map(Number);
             let due = new Date(y, m - 1, d);
             due.setHours(0,0,0,0);
             
             let today = new Date(); today.setHours(0,0,0,0);
             if (String(todo.startDate).startsWith(monthStr)) return true;
             // Ensure past-due items are always included in the math, exactly like the table shows!
             if (todo.status !== "Paid" && due < today) return true; 
             
             return false;
        });

        filtered.forEach(todo => {
            const amt = parseFloat(todo.amount || 0);
            if (todo.status === "Paid") {
                totalPaid += amt;
                countPaid++;
            } else {
                totalUnpaid += amt;
                countUnpaid++;
            }
        });

        title = `To-Dos & Bills Overview`;
        htmlContent = `
            <div style="background: #fef2f2; padding: 12px; border-radius: 8px; border: 1px solid #fecaca; margin-bottom: 10px;">
               <div style="font-weight: bold; color: var(--danger); margin-bottom: 8px; font-size: 14px;">Unpaid / Pending Bills</div>
               <div style="display: flex; justify-content: space-between; margin-bottom: 4px;"><span>Items count:</span> <strong>${countUnpaid}</strong></div>
               <div style="display: flex; justify-content: space-between;"><span>Total Amount:</span> <strong style="color: var(--danger);">${totalUnpaid.toFixed(2)}</strong></div>
            </div>
            <div style="background: #f0fdf4; padding: 12px; border-radius: 8px; border: 1px solid #bbf7d0; margin-bottom: 10px;">
               <div style="font-weight: bold; color: var(--success); margin-bottom: 8px; font-size: 14px;">Paid Bills</div>
               <div style="display: flex; justify-content: space-between; margin-bottom: 4px;"><span>Items count:</span> <strong>${countPaid}</strong></div>
               <div style="display: flex; justify-content: space-between;"><span>Total Amount:</span> <strong style="color: var(--success);">${totalPaid.toFixed(2)}</strong></div>
            </div>
            <div style="padding: 12px; border-top: 2px solid var(--border); font-size: 14px;">
               <div style="display: flex; justify-content: space-between; font-weight: bold;"><span>Total Obligation:</span> <span style="color: var(--primary);">${(totalUnpaid + totalPaid).toFixed(2)}</span></div>
            </div>
        `;
    }

    document.getElementById('catSummaryTitle').innerText = title;
    document.getElementById('catSummaryContent').innerHTML = htmlContent;
    openModal('categorySummaryModal');
}


// ==========================================
// BILLS OVERVIEW CALCULATION (Perfect Dashboard Sync)
// ==========================================
function updateBillsOverview(expensesData, loansData, targetMonthStr) {
    let paidCount = 0; let paidSar = 0; let paidPhp = 0;
    let unpaidCount = 0; let unpaidSar = 0; let unpaidPhp = 0;

    // Use your global live exchange rate
    const safeRate = (typeof livePhpRate !== 'undefined' && livePhpRate > 0) ? livePhpRate : 14.8;

    // 1. EXACT DASHBOARD MATH: Convert YYYY-MM into an integer
    const parseMonth = (mStr) => parseInt(mStr.split('-')[0]) * 12 + parseInt(mStr.split('-')[1]);
    const targetInt = parseMonth(targetMonthStr);

    // Helper function that matches your `calculateActiveBurden` logic
    const processItems = (items) => {
        if (!items) return;
        const itemsArray = Array.isArray(items) ? items : Object.values(items);

        itemsArray.forEach(item => {
            if (!item) return;

            // 2. Ignore archived and cancelled items (same as dashboard)
            if (item["Archived"] === true || String(item["Archived"]).toUpperCase() === "TRUE") return;
            const status = String(item["Status"] || "").trim().toUpperCase();
            if (status === "CANCELLED" || status === "CANCELED") return;

            // 3. EXACT DASHBOARD MATH: Calculate Start Window and Duration
            let rawStart = String(item["Start Month"] || "").trim().substring(0, 7);
            if (!rawStart) return;
            
            const startInt = parseMonth(rawStart);
            const duration = parseInt(item["Duration (Months)"]) || 1;

            // 4. WINDOW CHECK: Is the screen month active for this item?
            if (targetInt >= startInt && targetInt < (startInt + duration)) {
                
                // Get the exact deduction amount your dashboard uses
                const sar = parseFloat(item["Monthly Deduction (SAR)"] || 0);
                
                // Calculate PHP equivalent (because your DB only stores SAR)
                let php = parseFloat(item["Monthly Deduction (PHP)"] || 0);
                if (item["Currency"] === "PHP" && php === 0) {
                    php = sar * safeRate;
                }

                // 5. Sort the Active items into Paid vs Unpaid
                if (status === "PAID") {
                    paidCount++; 
                    paidSar += sar; 
                    paidPhp += php;
                } else if (status === "PENDING" || status === "IN-PROCESS" || status === "IN PROCESS") {
                    unpaidCount++; 
                    unpaidSar += sar; 
                    unpaidPhp += php;
                }
            }
        });
    };

    // Process both using the exact same logic
    processItems(expensesData);
    processItems(loansData);

    // Update HTML
    if(document.getElementById('paidCount')) document.getElementById('paidCount').innerText = paidCount;
    if(document.getElementById('paidSar')) document.getElementById('paidSar').innerText = paidSar.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + " SAR";
    if(document.getElementById('paidPhp')) document.getElementById('paidPhp').innerText = paidPhp.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + " PHP";

    if(document.getElementById('unpaidCount')) document.getElementById('unpaidCount').innerText = unpaidCount;
    if(document.getElementById('unpaidSar')) document.getElementById('unpaidSar').innerText = unpaidSar.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + " SAR";
    if(document.getElementById('unpaidPhp')) document.getElementById('unpaidPhp').innerText = unpaidPhp.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + " PHP";
}


// Function to calculate and open the modal based on which button is clicked
function openBillsOverviewModal(type) {
    const titleEl = document.getElementById('billsOverviewTitle');

    if (type === 'expenses') {
        // Change title and send ONLY Expenses data (send null for loans)
        if (titleEl) titleEl.innerText = "🧾 Expenses Bills Overview";
        updateBillsOverview(masterData.expenses, null, activeBrowserMonth);
        
    } else if (type === 'loans') {
        // Change title and send ONLY Loans data (send null for expenses)
        if (titleEl) titleEl.innerText = "🧾 Loans Bills Overview";
        updateBillsOverview(null, masterData.loans, activeBrowserMonth);
    }
    
    // Open the popup modal
    openModal('billsOverviewModal');
}