// ==========================================
// TO-DO & BILLS LOGIC (FIREBASE REALTIME)
// ==========================================
let allTodos = [];
let targetRedMonth = "";    
let targetOrangeMonth = ""; 

// ==========================================
// FORM LOCKING LOGIC (READ-ONLY VIEW)
// ==========================================
function toggleTodoReadOnly(isReadOnly) {
    const form = document.getElementById('todoForm');
    form.querySelectorAll('input, select, textarea').forEach(el => {
        if (el.tagName === 'SELECT') el.disabled = isReadOnly;
        else el.readOnly = isReadOnly;
        el.style.backgroundColor = isReadOnly ? '#f9fafb' : '';
    });
    
    document.getElementById('todoSubmit').style.display = isReadOnly ? 'none' : 'block';
    const editBtn = document.getElementById('todoEditBtn');
    if (editBtn) editBtn.style.display = isReadOnly ? 'block' : 'none';
    
    if (!isReadOnly) {
        const title = document.getElementById('todoFormTitle');
        if (title && title.innerText.startsWith('View:')) {
            title.innerText = title.innerText.replace('View:', 'Edit:');
        }
    }
}

function triggerTodoView(id) {
    triggerTodoEdit(id); 
    document.getElementById('todoFormTitle').innerText = "View: " + document.getElementById('todoName').value;
    toggleTodoReadOnly(true); 
}

function goToTodoView(type) {
  const todoNavBtn = document.querySelector('.nav-btn[data-target="view-todo"]');
  if (todoNavBtn) todoNavBtn.click(); 

  let targetMonth = (type === 'red') ? targetRedMonth : targetOrangeMonth;

  if (targetMonth && typeof activeBrowserMonth !== 'undefined') {
    if (activeBrowserMonth !== targetMonth) {
      activeBrowserMonth = targetMonth;
      if (typeof updateBrowserDisplay === "function") updateBrowserDisplay();
      if (typeof updateAllViews === "function") updateAllViews();
    }
  }
}

// 🎯 THE FIX: Wrapped the listener in a function so main.js can trigger it securely!
function startTodoListener() {
    if (typeof todoDB !== 'undefined') {
      todoDB.ref('todos').on('value', (snapshot) => {
        allTodos = [];
        snapshot.forEach((child) => {
          allTodos.push({ id: child.key, ...child.val() });
        });
        
        // Ensure UI updates as soon as data arrives
        if (typeof renderTodoDashboard === "function") renderTodoDashboard();
        if (typeof updateAllViews === "function") updateAllViews();
      });
    }
}

function generateTodoSummary() {
  const name = document.getElementById('todoName').value || "Entry";
  const amount = parseFloat(document.getElementById('todoAmount').value) || 0;
  const duration = parseInt(document.getElementById('todoDuration').value) || 1;
  const startDateStr = document.getElementById('todoStartDate').value;
  
  const summaryBox = document.getElementById('todoSummaryText');
  
  if (!startDateStr || duration < 1 || amount <= 0) {
    summaryBox.innerText = "Fill out the details above to see the schedule summary.";
    return;
  }

  const addMonths = (dateStr, months) => {
    let [y, m, d] = dateStr.split('-').map(Number);
    m += months;
    while (m > 12) { m -= 12; y++; }
    
    let dateObj = new Date(y, m - 1, d);
    if (dateObj.getMonth() !== m - 1) dateObj = new Date(y, m, 0); 
    
    return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const [startYear, startMonth, startDay] = startDateStr.split('-').map(Number);
  const startDisplay = new Date(startYear, startMonth - 1, startDay).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const nextDisplay = duration > 1 ? addMonths(startDateStr, 1) : "N/A";
  const lastDisplay = addMonths(startDateStr, duration - 1);
  const totalAmount = amount * duration;

  summaryBox.innerText = `${name} has been entered with duration of ${duration} month(s) and billing starts at ${startDisplay}, next billing is on ${nextDisplay}, last payment is ${lastDisplay}, the total amount is ${totalAmount}.`;
}

function renderTodoDashboard() {
  const tbody = document.getElementById('todoTableBody');
  const alertContainer = document.getElementById('todoAlertsContainer');
  if(!tbody || !alertContainer) return;

  tbody.innerHTML = "";
  alertContainer.innerHTML = "";
  
  let hasRedAlert = false;
  let today = new Date();
  today.setHours(0, 0, 0, 0);

  let globalRedCount = 0;
  let globalOrangeCount = 0;
  let earliestRedDate = null;
  let earliestOrangeDate = null;
  
  targetRedMonth = "";
  targetOrangeMonth = "";
  
  allTodos.forEach(todo => {
    if (todo.status !== "Paid") {
      let [y, m, d] = String(todo.startDate).split('-').map(Number);
      let due = new Date(y, m - 1, d);
      due.setHours(0,0,0,0);
      
      let diffDays = Math.round((due - today) / (1000 * 60 * 60 * 24));
      let targetMonthStr = `${y}-${String(m).padStart(2, '0')}`;
      
      if (diffDays < 0) {
        globalRedCount++;
        if (!earliestRedDate || due < earliestRedDate) {
          earliestRedDate = due;
          targetRedMonth = targetMonthStr;
        }
      } else if (diffDays <= 5) {
        globalOrangeCount++;
        if (!earliestOrangeDate || due < earliestOrangeDate) {
          earliestOrangeDate = due;
          targetOrangeMonth = targetMonthStr;
        }
      }
    }
  });

  const redBtn = document.getElementById('globalTodoRedBtn');
  const orangeBtn = document.getElementById('globalTodoOrangeBtn');

  if (redBtn) {
    if (globalRedCount > 0) {
      redBtn.classList.remove('hidden');
      redBtn.innerHTML = `<span class="alert-icon">⚠️</span><span class="alert-text">${globalRedCount} Past Due!</span>`; 
    } else {
      redBtn.classList.add('hidden'); 
    }
  }

  if (orangeBtn) {
    if (globalOrangeCount > 0) {
      orangeBtn.classList.remove('hidden');
      orangeBtn.innerHTML = `<span class="alert-icon">⏳</span><span class="alert-text">${globalOrangeCount} Due Soon</span>`; 
    } else {
      orangeBtn.classList.add('hidden'); 
    }
  }

// Filter items to show ONLY the ones matching the browser's current month
  const filteredTodos = allTodos.filter(todo => {
     let targetMonth = typeof activeBrowserMonth !== 'undefined' ? activeBrowserMonth : today.toISOString().substring(0, 7);
     return String(todo.startDate).startsWith(targetMonth);
  });

  filteredTodos.sort((a,b) => new Date(a.startDate) - new Date(b.startDate));

  filteredTodos.forEach(todo => {
    let [y, m, d] = String(todo.startDate).split('-').map(Number);
    let dueDate = new Date(y, m - 1, d);
    dueDate.setHours(0,0,0,0);
    
    let diffDays = Math.round((dueDate - today) / (1000 * 60 * 60 * 24));
    
    let alertBadge = "";
    let trStyle = "";

    if (todo.status !== "Paid") {
      if (diffDays < 0) {
        hasRedAlert = true;
        alertBadge = `<span class="badge" style="background: #ef4444; color: white; animation: pulse 2s infinite;">Past Due!</span>`;
        trStyle = "background-color: #fef2f2;"; 
      } else if (diffDays <= 5) {
        alertBadge = `<span class="badge" style="background: #f97316; color: white;">Nearing (${diffDays} days)</span>`;
        trStyle = "background-color: #fff7ed;"; 
      }
    } else {
        trStyle = "opacity: 0.7;"; 
    }

    let statusBadge = `<span class="badge ${todo.status.replace(/\s+/g, '-')}">${todo.status}</span>`;

    let tr = document.createElement('tr');
    tr.style = trStyle;
    tr.innerHTML = `
      <td><strong>${todo.name}</strong><br><span class="mobile-status-badge">${statusBadge} ${alertBadge}</span></td>
      <td><small>${todo.description}</small></td>
      <td class="mobile-hide" style="font-weight: bold;">${todo.startDate}</td>
      <td>${todo.amount}</td>
      <td class="mobile-hide">${statusBadge} ${alertBadge}</td>
      <td>
         <button class="btn btn-edit" onclick="triggerTodoView('${todo.id}')" style="margin: 0; width: 100%; text-align: center; background: #0ea5e9; color: white;">View / Edit</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  if (hasRedAlert) {
    alertContainer.innerHTML = `
      <div style="background: #ef4444; color: white; padding: 12px; border-radius: 6px; margin-bottom: 12px; display: flex; align-items: center; font-weight: bold; font-size: 13px;">
        ⚠️ URGENT: You have To-Do entries or bills that are PAST DUE! Please review the red entries below immediately.
      </div>
    `;
  }
}

function openNewTodoModal() {
  document.getElementById('todoForm').reset();
  document.getElementById('todoEditId').value = "";
  
  toggleTodoReadOnly(false); 
  
  document.getElementById('todoFormTitle').innerText = "Add New To-Do Entry";
  document.getElementById('todoSummaryText').innerText = "Fill out the details above to see the schedule summary.";
  openModal('todoModal');
}

function triggerTodoEdit(id) {
  const todo = allTodos.find(t => t.id === id);
  if (!todo) return;
  
  toggleTodoReadOnly(false); 
  
  document.getElementById('todoEditId').value = todo.id;
  document.getElementById('todoName').value = todo.name;
  document.getElementById('todoDesc').value = todo.description;
  document.getElementById('todoAmount').value = todo.amount;
  document.getElementById('todoDuration').value = todo.duration || 1;
  document.getElementById('todoStartDate').value = todo.startDate;
  document.getElementById('todoStatus').value = todo.status;
  
  document.getElementById('todoFormTitle').innerText = `Edit: ${todo.name}`;
  generateTodoSummary(); 
  
  openModal('todoModal');
}

document.getElementById('todoForm').addEventListener('submit', (e) => {
  e.preventDefault(); 
  
  const id = document.getElementById('todoEditId').value;
  const name = document.getElementById('todoName').value;
  const description = document.getElementById('todoDesc').value;
  const amount = parseFloat(document.getElementById('todoAmount').value);
  const duration = parseInt(document.getElementById('todoDuration').value);
  const baseStartDateStr = document.getElementById('todoStartDate').value;
  const status = document.getElementById('todoStatus').value;
  const summary = document.getElementById('todoSummaryText').innerText;

  if (id) {
    // Editing an existing single entry
    const payload = { name, description, amount, duration: 1, startDate: baseStartDateStr, status, summary };
    todoDB.ref('todos/' + id).update(payload);
  } else {
    // Adding NEW recurring entries
    const [y, m, d] = baseStartDateStr.split('-').map(Number);

    for (let i = 0; i < duration; i++) {
        // THE SAFE FIX: Use Date object directly to handle month/year rollovers
        let dateObj = new Date(y, (m - 1) + i, d);
        
        // Handle "Month Overflow" (e.g., jumping from Jan 31 to Feb 28 instead of Mar 3)
        let expectedMonth = (m - 1 + i) % 12;
        if (dateObj.getMonth() !== expectedMonth) {
            dateObj = new Date(y, (m + i), 0); 
        }
        
        const targetDateStr = dateObj.toISOString().split('T')[0];

        const payload = {
            name, 
            description, 
            amount, 
            duration: 1, 
            startDate: targetDateStr, 
            status, 
            summary
        };
        todoDB.ref('todos').push(payload);
    }
  }
  
  closeModal('todoModal');
});

// ==========================================
// 🎯 THE FIX: Self-Starting Auth Listener
// ==========================================
// This ensures To-Dos load instantly on first load, 
// even if main.js fires the auth state quickly!
auth.onAuthStateChanged(user => {
  if (user && typeof startTodoListener === "function") {
    startTodoListener();
  }
});