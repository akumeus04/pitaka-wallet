// ==========================================
// CORE CONFIGURATION & FIREBASE
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyAc46X6MIXI-moZ2oTy2ShiDv6IrjhVQC4",
  authDomain: "finance-app-23309.firebaseapp.com",
  databaseURL: "https://finance-app-23309-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "finance-app-23309",
  storageBucket: "finance-app-23309.firebasestorage.app",
  messagingSenderId: "268979076437",
  appId: "1:268979076437:web:204abafc00e7558f4e83dc",
};

if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
const auth = firebase.auth();
const db = firebase.database(); 
const todoDB = db; // Alias for your todo.js file

const MAIN_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbw64YW8x6UyAC-qtCJDQw8znaJ8I4zdyi5MelNPmQj45ElBraYPqbPCChRMODkySsxX0A/exec";
const ALLOWANCE_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwkjgQREdqRlWtA9r676BjaUQWEoumUbpFlMtjpZS3uTy2baqrEM0D84_cIJehKlu-tRw/exec";

let masterData = { income: [], expenses: [], loans: [], allowances: [], holidays: [] };
let livePhpRate = 14.8; 
const today = new Date().toLocaleDateString('en-CA');
const currentMonth = today.substring(0, 7);
let activeBrowserMonth = currentMonth; 

// Pre-fill dates on load
['incDate', 'expDate', 'loanDate'].forEach(id => { if(document.getElementById(id)) document.getElementById(id).value = today; });
['incMonth', 'expMonth', 'loanMonth'].forEach(id => { if(document.getElementById(id)) document.getElementById(id).value = currentMonth; });


// ==========================================
// AUTHENTICATION & UI SETUP
// ==========================================
auth.onAuthStateChanged(user => {
  if (user) {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('appScreen').classList.remove('hidden');
    
    document.getElementById('loginError').innerText = ""; 
    
    fetchLiveExchangeRate(); 
    
    // 🎯 TRIGGER BOTH LISTENERS NOW THAT YOU ARE SECURELY LOGGED IN
    startFirebaseListeners();
    
    
    loadDatabase(); 
    startInactivityTracking(); 
	
	// 📅 Wake up the Google Calendar script instantly after login
    if (typeof fetchHolidays === "function") {
        fetchHolidays();
    }
	
	// 📌 Securely fetch personal calendar notes
    if (typeof startCalendarNotesListener === "function") {
        startCalendarNotesListener();
    }
	
	// 💰 Start listening for the global budget limit
    if (typeof startBudgetListener === "function") {
        startBudgetListener();
    }
	
  } else {
    document.getElementById('loginScreen').classList.remove('hidden');
    document.getElementById('appScreen').classList.add('hidden');
    stopInactivityTracking(); 
    
    // Safety measure: Detach all listeners when logged out
    db.ref('income').off();
    db.ref('expenses').off();
    db.ref('loans').off();
    db.ref('allowances').off();
    db.ref('todos').off(); // <-- Clear todos on logout too!
  }
});

document.getElementById('loginForm').addEventListener('submit', (e) => {
  e.preventDefault();
  
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  const errorDiv = document.getElementById('loginError');
  
  // Clear any previous errors and show a loading state
  errorDiv.innerText = "Authenticating...";
  errorDiv.style.color = "#6b7280"; 

  auth.signInWithEmailAndPassword(email, password)
    .catch(err => {
      // Switch text color back to red for errors
      errorDiv.style.color = "var(--danger)"; 
      
      // Convert the entire error to an uppercase string so we can easily scan it
      const errorString = (err.message || err.toString()).toUpperCase();
      const errorCode = (err.code || "").toUpperCase();

      // Intercept the raw JSON, as well as standard Firebase error codes
      if (errorString.includes('INVALID_LOGIN_CREDENTIALS') || 
          errorCode.includes('WRONG-PASSWORD') || 
          errorCode.includes('USER-NOT-FOUND') || 
          errorCode.includes('INVALID-CREDENTIAL')) {
        
        errorDiv.innerText = "Wrong email or password. Please try again.";
        
      } else if (errorCode.includes('INVALID-EMAIL') || errorString.includes('INVALID_EMAIL')) {
        
        errorDiv.innerText = "Please enter a valid email format.";
        
      } else {
        // Fallback: Show a clean error to the user, but log the ugly JSON to the console for you
        errorDiv.innerText = "Login error. Please try again."; 
        console.error("Firebase Auth Error:", err);
      }
    });
});
document.getElementById('logoutBtn').addEventListener('click', () => {
  const confirmLogout = confirm("Are you sure you want to log out of your wallet?");
  if (confirmLogout) {
    auth.signOut();
  }
});

// Navigation Bar Logic
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.view-section').forEach(v => v.classList.add('hidden'));
    e.target.classList.add('active');
    const targetView = e.target.dataset.target;
    document.getElementById(targetView).classList.remove('hidden');
    
    if(targetView === 'view-dashboard') {
      document.getElementById('globalMonthBrowser').classList.add('hidden');
    } else {
      document.getElementById('globalMonthBrowser').classList.remove('hidden');
    }
  });
});

// Month Browser Logic
function updateBrowserDisplay() {
  const [y, m] = activeBrowserMonth.split('-');
  const date = new Date(y, m - 1);
  // THIS is the missing line that fixes the "Loading..." bug:
  document.getElementById('currentBrowserMonthDisplay').innerText = date.toLocaleString('default', { month: 'short', year: 'numeric' });
}
updateBrowserDisplay();

// Click the center month text to instantly return to Today (Now safely OUTSIDE the function)
document.getElementById('currentBrowserMonthDisplay').addEventListener('click', () => {
  activeBrowserMonth = currentMonth; 
  updateBrowserDisplay();
  updateAllViews();
});

document.getElementById('prevMonthBtn').addEventListener('click', () => {
  let [y, m] = activeBrowserMonth.split('-');
  let d = new Date(y, m - 2); 
  activeBrowserMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  updateBrowserDisplay();
  updateAllViews();
});

document.getElementById('nextMonthBtn').addEventListener('click', () => {
  let [y, m] = activeBrowserMonth.split('-');
  let d = new Date(y, m); 
  activeBrowserMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  updateBrowserDisplay();
  updateAllViews();
});

// ==========================================
// KEYBOARD SHORTCUTS (Left/Right Arrows)
// ==========================================
document.addEventListener('keydown', (e) => {
  // SAFETY CHECK: Don't change months if the user is typing inside a form input!
  const activeTag = document.activeElement.tagName.toLowerCase();
  if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
    return;
  }

  // Trigger the buttons based on the arrow key pressed
  if (e.key === 'ArrowLeft') {
    const prevBtn = document.getElementById('prevMonthBtn');
    if (prevBtn && !document.getElementById('globalMonthBrowser').classList.contains('hidden')) {
      prevBtn.click();
    }
  } else if (e.key === 'ArrowRight') {
    const nextBtn = document.getElementById('nextMonthBtn');
    if (nextBtn && !document.getElementById('globalMonthBrowser').classList.contains('hidden')) {
      nextBtn.click();
    }
  }
});

// Function to block touch events from reaching the background
function blockBackgroundScroll(e) {
    // If the user is touching the dark background overlay itself, stop it
    if (e.target.classList.contains('modal')) {
        e.preventDefault();
    }
}

function openModal(modalId) { 
    const modal = document.getElementById(modalId);
    modal.classList.remove('hidden'); 
    
    // Prevent the background from receiving touch-scroll events
    document.body.style.overflow = 'hidden';
    modal.addEventListener('touchmove', blockBackgroundScroll, { passive: false });
}

function closeModal(modalId) { 
    const modal = document.getElementById(modalId);
    modal.classList.add('hidden'); 
    
    // Restore normal touch-scroll events
    document.body.style.overflow = '';
    modal.removeEventListener('touchmove', blockBackgroundScroll);
}

// ==========================================
// ⬇️ ADD THE NEW NOTE MODAL LOGIC HERE ⬇️
// ==========================================
function openNoteModal(encodedNoteText) {
    const textContainer = document.getElementById('fullNoteText');
    if(textContainer) {
        // Decode the text safely
        textContainer.innerText = decodeURIComponent(encodedNoteText);
        // Trigger your existing openModal function to block background scrolling!
        openModal('noteModal'); 
    }
}

function closeNoteModal() {
    // Trigger your existing closeModal function
    closeModal('noteModal');
}

function showStatus(msg, isError = false) {
  const el = document.getElementById('globalStatus');
  el.innerText = msg; el.style.color = isError ? "var(--danger)" : "var(--success)";
  setTimeout(() => el.innerText = "", 4000);
}

function updateAllViews() {
  if (typeof renderDashboard === "function") renderDashboard();
  if (typeof renderIncomeHistory === "function") renderIncomeHistory();
  if (typeof renderExpenseHistory === "function") renderExpenseHistory();
  if (typeof renderLoanHistory === "function") renderLoanHistory();
  if (typeof renderAllowanceHistory === "function") renderAllowanceHistory();
  if (typeof renderTodoDashboard === "function") renderTodoDashboard();
  
  // NEW: Update the Bills Overview using masterData
  if (typeof updateBillsOverview === "function") {
      updateBillsOverview(masterData.expenses, masterData.loans, activeBrowserMonth);
  }
}

async function fetchLiveExchangeRate() {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/SAR");
    const data = await res.json();
    livePhpRate = data.rates.PHP;
    if(document.getElementById('uiLiveRateExp')) document.getElementById('uiLiveRateExp').innerText = livePhpRate.toFixed(2);
    if(document.getElementById('uiLiveRateLoan')) document.getElementById('uiLiveRateLoan').innerText = livePhpRate.toFixed(2);
  } catch (e) { console.error("Using fallback exchange rate."); }
}

// ==========================================
// HYBRID ENGINE: Firebase (Instant) + Sheets (Backup)
// ==========================================

// 1. REAL-TIME LISTENERS (Replaces slow Google Sheets loading)
function startFirebaseListeners() {
    db.ref('income').on('value', snap => {
        masterData.income = [];
        snap.forEach(child => {
            let p = child.val();
            masterData.income.push({
                "ID": p.id, "Entry Date": p.entryDate, "Applicable Month": p.applicableMonth,
                "Description": p.description, "Amount (SAR)": p.amount, "Notes": p.notes
            });
        });
        updateAllViews();
    });

    db.ref('expenses').on('value', snap => {
        masterData.expenses = [];
        snap.forEach(child => {
            let p = child.val();
            let monthlySAR = p.currency === "SAR" ? p.totalAmount : (parseFloat(p.totalAmount) / livePhpRate);
            masterData.expenses.push({
                "ID": p.id, 
                "Entry Date": p.entryDate, 
                "Start Month": p.startMonth, 
                "Description": p.description, 
                "Duration (Months)": p.duration, 
                "Currency": p.currency,                 
                "Total Amount": p.totalAmount,          
                "Monthly Deduction (SAR)": monthlySAR,  
                "Status": p.status, 
                "Notes": p.notes
            });
        });
        updateAllViews();
    });

    db.ref('loans').on('value', snap => {
        masterData.loans = [];
        snap.forEach(child => {
            let p = child.val();
            let monthlySAR = p.currency === "SAR" ? p.totalAmount : (parseFloat(p.totalAmount) / livePhpRate);
            masterData.loans.push({
                "ID": p.id, 
                "Entry Date": p.entryDate, 
                "Start Month": p.startMonth, 
                "Description": p.description, 
                "Duration (Months)": p.duration, 
                "Currency": p.currency,                 
                "Total Amount": p.totalAmount,          
                "Monthly Deduction (SAR)": monthlySAR,  
                "Status": p.status, 
                "Notes": p.notes
            });
        });
        updateAllViews();
    });

    db.ref('allowances').on('value', snap => {
        masterData.allowances = [];
        snap.forEach(child => {
            let p = child.val();
            masterData.allowances.push({
                "ID": p.id,
                "Entry Date": p.entryDate,
                "Allowance Month": p.allowanceMonth,
                "Student Name": p.studentName,
                "Start Date": p.startDate,
                "End Date": p.endDate,
                "Total Workdays": p.totalDays,
                "Daily Amount (PHP)": p.dailyAmount,
                "Breakdown": p.breakdown,
                "Total PHP": (parseFloat(p.totalDays || 0) * parseFloat(p.dailyAmount || 0)).toFixed(2),
                "Status": p.status || "Pending",
                "Archived": p.archived || false
            });
        });
        updateAllViews();
    });
}

// 2. MODIFIED DATABASE LOADER (With Realistic Animation)
async function loadDatabase() {
  const syncIcon = document.getElementById('syncIcon');
  
  // Start the animation
  if (syncIcon) syncIcon.classList.add('spinning');
  showStatus("🔄 Syncing core systems...", false);
  
  try {
    const alwResponse = await fetch(ALLOWANCE_WEB_APP_URL);
    const alwResult = await alwResponse.json();
    
    if(alwResult.status === "success") { 
      masterData.holidays = alwResult.data.holidays || [];
      masterData.categories = alwResult.data.categories || [];
      masterData.students = alwResult.data.students || [];
      
      if (typeof updateAllViews === "function") updateAllViews();
      showStatus("✅ Data synced."); 
    } 
  } catch (error) { 
    showStatus("❌ Failed to load auxiliary data.", true); 
  } finally {
    // 🎯 THE FIX: Stop the animation whether the sync succeeds OR fails!
    if (syncIcon) syncIcon.classList.remove('spinning');
  }
}

// 3. DUAL-SAVE FUNCTION (Instant UI + Background Backup)
async function submitToSheet(payload, formId, submitBtnId) {
  const btn = document.getElementById(submitBtnId);
  if(btn) { btn.innerText = "Saving..."; btn.disabled = true; }
  
  try {
    // A. FIREBASE PRIMARY SAVE (Instant)
    let fbNode = null;
    if(payload.sheetName === "Income") fbNode = "income";
    if(payload.sheetName === "Expenses") fbNode = "expenses";
    if(payload.sheetName === "Loans") fbNode = "loans";
    if(payload.sheetName === "Allowances" || formId === "allowanceForm") fbNode = "allowances";

    if(fbNode) {
        if(!payload.id) payload.id = db.ref(fbNode).push().key; 
        await db.ref(`${fbNode}/${payload.id}`).set(payload); 
    }

    // 🛡️ THE SECURITY HANDSHAKE
    // This MUST match the EXPECTED_SECRET in your Google Apps Script exactly!
    payload.appSecret = "My_Super_Secret_Passcode_2026!";

    // B. GOOGLE SHEETS BACKUP (Fires silently in the background)
    const targetURL = (formId === 'allowanceForm') ? ALLOWANCE_WEB_APP_URL : MAIN_WEB_APP_URL;
    fetch(targetURL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(payload) })
        .catch(e => console.error("Backup failed", e));

    // C. UI RESET
    showStatus("✅ Instant Save Complete!");
    
    if(formId === 'incomeForm' && typeof cancelIncEdit === "function") cancelIncEdit();
    if(formId === 'expenseForm' && typeof cancelExpEdit === "function") cancelExpEdit();
    if(formId === 'loanForm' && typeof cancelLoanEdit === "function") cancelLoanEdit();
    if(formId === 'allowanceForm' && typeof cancelAlwEdit === "function") cancelAlwEdit();

    // Always ping Google Sheets to ensure static lists (Holidays/Categories) are fresh
    loadDatabase(); 

  } catch (error) {
    showStatus("❌ Save failed.", true);
  } finally {
    if(btn) { btn.innerText = "Save Record"; btn.disabled = false; }
  }
}

// ==========================================
// DYNAMIC CURRENCY CALCULATOR
// ==========================================
function setupCurrencyCalculator(type) {
  const sarInput = document.getElementById(`${type}AmountSAR`);
  const phpInput = document.getElementById(`${type}AmountPHP`);
  const currencySelect = document.getElementById(`${type}Currency`);
  
  if(!sarInput || !phpInput || !currencySelect) return;

  // Toggle visual focus, required states, and read-only based on primary currency
  const updateActiveInput = () => {
     if (currencySelect.value === "SAR") {
         sarInput.readOnly = false;
         sarInput.style.backgroundColor = "#ffffff";
         sarInput.required = true;
         
         phpInput.readOnly = true;
         phpInput.style.backgroundColor = "#e5e7eb"; 
         phpInput.required = false;
     } else {
         phpInput.readOnly = false;
         phpInput.style.backgroundColor = "#ffffff";
         phpInput.required = true;

         sarInput.readOnly = true;
         sarInput.style.backgroundColor = "#e5e7eb"; 
         sarInput.required = false;
     }
  };

  currencySelect.addEventListener('change', () => {
    updateActiveInput();
    sarInput.value = "";
    phpInput.value = "";
  });
  
  updateActiveInput();

  sarInput.addEventListener('input', () => { 
    if(sarInput.value) {
      phpInput.value = (parseFloat(sarInput.value) * livePhpRate).toFixed(2); 
    } else {
      phpInput.value = ""; 
    }
  });
  
  phpInput.addEventListener('input', () => { 
    if(phpInput.value) {
      sarInput.value = (parseFloat(phpInput.value) / livePhpRate).toFixed(2); 
    } else {
      sarInput.value = ""; 
    }
  });
}

// ==========================================
// DATE MATH HELPER (For Expenses & Loans)
// ==========================================
function isItemActiveInMonth(item, targetMonthStr) {
  if (item["Archived"] === true || item["Archived"] === "TRUE") return false;
  
  let rawStart = String(item["Start Month"] || "").trim().substring(0, 7);
  if (!rawStart) return false;
  
  const parseMonth = (mStr) => parseInt(mStr.split('-')[0]) * 12 + parseInt(mStr.split('-')[1]);
  
  const startInt = parseMonth(rawStart);
  const targetInt = parseMonth(targetMonthStr);
  const duration = parseInt(item["Duration (Months)"]) || 1;
  
  return targetInt >= startInt && targetInt < (startInt + duration);
}


// ==========================================
// AUTO-LOGOUT (30-MINUTE INACTIVITY TIMER)
// ==========================================
var inactivityTimer;
const INACTIVITY_LIMIT = 30 * 60 * 1000; // 30 minutes in milliseconds

function logoutDueToInactivity() {
  auth.signOut().then(() => {
    const errorDiv = document.getElementById('loginError');
    if(errorDiv) {
      errorDiv.innerText = "You were logged out due to 30 minutes of inactivity.";
      errorDiv.style.color = "var(--warning)"; 
    }
  });
}

function resetInactivityTimer() {
  clearTimeout(inactivityTimer);
  // Only start the countdown if a user is actively logged in
  if (auth.currentUser) {
    inactivityTimer = setTimeout(logoutDueToInactivity, INACTIVITY_LIMIT);
  }
}

function startInactivityTracking() {
  const activityEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
  activityEvents.forEach(event => document.addEventListener(event, resetInactivityTimer));
  resetInactivityTimer(); // Start the initial countdown
}

function stopInactivityTracking() {
  const activityEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
  activityEvents.forEach(event => document.removeEventListener(event, resetInactivityTimer));
  clearTimeout(inactivityTimer);
}


// ==========================================
// POWER USER KEYBOARD SHORTCUTS & ESCAPE KEY
// ==========================================
document.addEventListener('keydown', (e) => {
  
  // --- 1. ESCAPE KEY LOGIC (Close Everything) ---
  if (e.key === 'Escape') {
    // A. Close all standard modals (Add Forms, Overviews, Month Summaries)
    document.querySelectorAll('.modal').forEach(modal => {
      modal.classList.add('hidden');
    });

    // B. Close floating widgets (Calculator & Calendar)
    // We look for common IDs they might have, or trigger their close buttons directly
    const calcWidget = document.getElementById('floatingCalc') || document.getElementById('calculatorWidget');
    if (calcWidget) calcWidget.remove(); // Removes the calculator if it's open

    const calWidget = document.getElementById('floatingCalendar') || document.getElementById('calendarWidget');
    if (calWidget) calWidget.remove(); // Removes the calendar if it's open
    
    // Safety fallback: click any 'X' buttons inside floating widgets
    document.querySelectorAll('.close-widget-btn').forEach(btn => btn.click());
    
    return; // Stop running code here since we handled ESC
  }

  // --- 2. ALT KEY SHORTCUTS (Alt + 1-9) ---
  // Only proceed below this point if the Alt key is being held down
  if (!e.altKey) return;
  
  // Prevent shortcuts from working if the Privacy Blur screen is currently active
  if (document.body.classList.contains('privacy-locked') && e.key.toLowerCase() !== 'p') return;

  switch(e.key) {
    case '1': e.preventDefault(); document.querySelector('.nav-btn[data-target="view-dashboard"]')?.click(); break;
    case '2': e.preventDefault(); document.querySelector('.nav-btn[data-target="view-income"]')?.click(); break;
    case '3': e.preventDefault(); document.querySelector('.nav-btn[data-target="view-expenses"]')?.click(); break;
    case '4': e.preventDefault(); document.querySelector('.nav-btn[data-target="view-loans"]')?.click(); break;
    case '5': e.preventDefault(); document.querySelector('.nav-btn[data-target="view-allowance"]')?.click(); break;
    case '6': e.preventDefault(); document.querySelector('.nav-btn[data-target="view-todo"]')?.click(); break;
    
    case '7':
      e.preventDefault();
      // Toggle Calendar: If it is already on screen, remove it. If not, click the button to open it.
      const existingCal = document.getElementById('floatingCalendar') || document.getElementById('calendarWidget');
      if (existingCal) {
          existingCal.remove(); 
      } else {
          document.querySelector('.calendar-btn')?.click();
      }
      break;
      
    case '8':
      e.preventDefault();
      if (typeof loadDatabase === "function") loadDatabase();
      break;
      
    case '9':
      e.preventDefault();
      // Toggle Calculator: If it is already on screen, remove it. If not, click the button to open it.
      const existingCalc = document.getElementById('floatingCalc') || document.getElementById('calculatorWidget');
      if (existingCalc) {
          existingCalc.remove();
      } else {
          document.querySelector('.calc-btn')?.click();
      }
      break;
  }
});


// ==========================================
// DARK/LIGHT MODE TOGGLE
// ==========================================
const themeToggleBtn = document.getElementById('themeToggleBtn');
const themeIcon = document.getElementById('themeIcon');

// Check if the user previously chose dark mode
const currentTheme = localStorage.getItem('walletTheme');

if (currentTheme === 'dark') {
  document.body.classList.add('dark-theme');
  themeIcon.innerText = '☀️';
}

themeToggleBtn.addEventListener('click', () => {
  document.body.classList.toggle('dark-theme');
  
  if (document.body.classList.contains('dark-theme')) {
    themeIcon.innerText = '☀️';
    localStorage.setItem('walletTheme', 'dark');
  } else {
    themeIcon.innerText = '🌙';
    localStorage.setItem('walletTheme', 'light');
  }
});

// ==========================================
// GLOBAL BUDGET LIMIT (FIREBASE)
// ==========================================
let budgetTimeout;

function startBudgetListener() {
    if (typeof db !== 'undefined') {
        db.ref('settings/monthlyBudgetLimit').on('value', snap => {
            const val = snap.val();
            if (val !== null) {
                // Only update the input if it's not currently active, so it doesn't interrupt typing
                if (document.activeElement !== document.getElementById('budgetLimitInput')) {
                    document.getElementById('budgetLimitInput').value = val;
                }
                if (typeof updateAllViews === 'function') updateAllViews();
            }
        });
    }
}

function saveBudgetLimit() {
    const limit = document.getElementById('budgetLimitInput').value;
    
    // 1. Update the UI colors instantly so it feels fast
    if (typeof updateAllViews === 'function') updateAllViews();

    // 2. Wait 1 second after the user stops typing before saving to Firebase
    clearTimeout(budgetTimeout);
    budgetTimeout = setTimeout(() => {
        if (typeof db !== 'undefined' && limit !== "") {
            db.ref('settings/monthlyBudgetLimit').set(limit);
        }
    }, 1000); 
}