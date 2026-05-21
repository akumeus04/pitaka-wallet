// ==========================================
// 1. DYNAMIC HTML INJECTOR (Keeps frontend clean!)
// ==========================================
function injectFloatingWidgets() {
    // Only inject the Payday and Action Buttons into the left pane
    const widgetHTML = `
        <div id="paydayWidget" class="payday-widget">
          <span id="paydayIcon" class="payday-icon">⏳</span>
          <span id="paydayDetails" class="payday-details">Loading...</span>
        </div>

        <div class="floating-action-container">
          <button class="icon-btn calendar-btn" onclick="openCalendar()" title="Open Calendar">📅</button>
          <button class="icon-btn sync-btn" id="refreshDataBtn" title="Sync Data"><span id="syncIcon" class="sync-icon">🌍</span></button>
          <button class="icon-btn calc-btn" onclick="openCalculator()" title="Calculator">📟</button>
        </div>
    `;
    
    // Inject the Modals directly to the body/appScreen so they maintain full screen size
    const modalHTML = `
        <div id="calculatorModal" class="modal hidden">
          <div class="modal-content" style="max-width: 320px;">
            <span class="close-btn" onclick="closeModal('calculatorModal')">&times;</span>
            <h3 style="margin-top:0; color: #8b5cf6; border-bottom: 2px solid var(--border); padding-bottom: 10px;">🧮 Quick Calc</h3>
            <input type="text" id="calcDisplay" value="0" oninput="calcManualInput(this.value)" style="width: 100%; font-size: 24px; font-weight: bold; text-align: right; padding: 10px; margin-bottom: 10px; background: #ffffff; border: 1px solid var(--border); border-radius: 6px; box-sizing: border-box; color: var(--text);">
            <div style="display: flex; gap: 5px; margin-bottom: 10px;">
                <button class="btn" style="flex: 1; padding: 8px; font-size: 12px; background: var(--success);" onclick="calcConvert('SAR_TO_PHP')">SAR ➔ PHP</button>
                <button class="btn" style="flex: 1; padding: 8px; font-size: 12px; background: #0ea5e9;" onclick="calcConvert('PHP_TO_SAR')">PHP ➔ SAR</button>
            </div>
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px; margin-bottom: 15px;">
              <button class="btn" style="background: #f3f4f6; color: #000; font-size: 16px;" onclick="calcInput('7')">7</button>
              <button class="btn" style="background: #f3f4f6; color: #000; font-size: 16px;" onclick="calcInput('8')">8</button>
              <button class="btn" style="background: #f3f4f6; color: #000; font-size: 16px;" onclick="calcInput('9')">9</button>
              <button class="btn" style="background: #fca5a5; color: #991b1b; font-size: 16px; font-weight: bold;" onclick="calcClear()">C</button>
              <button class="btn" style="background: #f3f4f6; color: #000; font-size: 16px;" onclick="calcInput('4')">4</button>
              <button class="btn" style="background: #f3f4f6; color: #000; font-size: 16px;" onclick="calcInput('5')">5</button>
              <button class="btn" style="background: #f3f4f6; color: #000; font-size: 16px;" onclick="calcInput('6')">6</button>
              <button class="btn" style="background: #e5e7eb; color: #000; font-size: 16px;" onclick="calcOperate('/')">÷</button>
              <button class="btn" style="background: #f3f4f6; color: #000; font-size: 16px;" onclick="calcInput('1')">1</button>
              <button class="btn" style="background: #f3f4f6; color: #000; font-size: 16px;" onclick="calcInput('2')">2</button>
              <button class="btn" style="background: #f3f4f6; color: #000; font-size: 16px;" onclick="calcInput('3')">3</button>
              <button class="btn" style="background: #e5e7eb; color: #000; font-size: 16px;" onclick="calcOperate('*')">×</button>
              <button class="btn" style="background: #f3f4f6; color: #000; font-size: 16px;" onclick="calcInput('0')">0</button>
              <button class="btn" style="background: #f3f4f6; color: #000; font-size: 16px;" onclick="calcInput('.')">.</button>
              <button class="btn" style="background: #e5e7eb; color: #000; font-size: 16px;" onclick="calcOperate('-')">-</button>
              <button class="btn" style="background: #e5e7eb; color: #000; font-size: 16px;" onclick="calcOperate('+')">+</button>
              <button class="btn full-width" style="grid-column: span 4; background: #8b5cf6; font-size: 18px;" onclick="calcCalculate()">=</button>
            </div>
            <div class="form-group" style="margin-bottom: 0;">
                <label style="color: #4b5563;">Scratchpad & Notes (Auto-saves locally)</label>
                <textarea id="calcNotes" rows="3" style="width: 100%; box-sizing: border-box; font-size: 12px; resize: vertical;" oninput="saveCalcNotes()" placeholder="Jot down numbers or thoughts here..."></textarea>
            </div>
          </div>
        </div>

<div id="calendarModal" class="modal hidden">
  <div class="modal-content" style="max-width: 500px; padding: 20px; position: relative;">
    
    <span class="close-btn" onclick="closeModal('calendarModal')" style="position: absolute; top: 10px; right: 15px; z-index: 99; cursor: pointer; font-size: 24px;">&times;</span>

    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding-top: 15px;">
      <div style="display: flex; gap: 5px;">
        <button class="btn" style="width: auto; padding: 6px 15px;" onclick="changeCalendarMonth(-1)">&#9664;</button>
        <button class="btn" style="width: auto; padding: 6px 12px; background: #9ca3af;" onclick="refreshCalendarData()" title="Sync Google Calendar">🔄</button>
      </div>
      <h3 id="calMonthDisplay" style="margin: 0; color: var(--primary); font-size: 18px;">Loading...</h3>
      <button class="btn" style="width: auto; padding: 6px 15px;" onclick="changeCalendarMonth(1)">&#9654;</button>
    </div>
    
    <div style="display: flex; gap: 10px; font-size: 10px; margin-bottom: 15px; justify-content: center; flex-wrap: wrap; font-weight: bold;">
      <span style="background: #fef08a; padding: 3px 6px; border-radius: 4px; color: #854d0e;">🇵🇭 Holiday</span>
      <span style="background: #fed7aa; padding: 3px 6px; border-radius: 4px; color: #9a3412;">🇸🇦 Holiday</span>
      <span style="background: #fdf2f8; padding: 3px 6px; border-radius: 4px; border: 1px solid #f9a8d4; color: #be185d;">📌 Personal</span>
    </div>
    
    <div id="calendarGrid" class="calendar-grid"></div>
    
    <div style="margin-top: 20px; border-top: 1px solid var(--border); padding-top: 10px;">
      <h4 style="margin: 0 0 10px 0; color: #4b5563; font-size: 13px;">📅 This Month's Events</h4>
      <div id="calendarEventsList" style="max-height: 150px; overflow-y: auto;"></div>
    </div>

    <button class="btn full-width" style="margin-top: 15px;" onclick="closeModal('calendarModal')">Close Calendar</button>
  </div>
</div>

        <div id="calendarDayModal" class="modal hidden">
          <div class="modal-content" style="max-width: 350px;">
            <span class="close-btn" onclick="closeModal('calendarDayModal')">&times;</span>
            <h3 style="margin-top:0; color: var(--primary);">Schedule & Notes</h3>
            <p id="dayDateDisplay" style="font-weight: bold; font-size: 14px; margin-bottom: 15px; color: #4b5563;"></p>
            <div id="dayExistingEvents" style="margin-bottom: 15px;"></div>
            <form id="calendarNoteForm" style="border-top: 1px solid var(--border); padding-top: 15px;">
              <input type="hidden" id="noteSelectedDate">
              <div class="form-group full-width" style="margin-bottom: 10px;">
                <label>Add New Note / Event</label>
                <input type="text" id="noteTitle" required placeholder="e.g., Doctor Appointment, Pay Bills">
              </div>
              <div class="form-group full-width">
                <label>Description (Optional)</label>
                <textarea id="noteDesc" rows="2" placeholder="Any extra details..."></textarea>
              </div>
              <button type="submit" class="btn full-width" id="noteSubmitBtn" style="background: #ec4899;">Save & Sync to Google</button>
            </form>
          </div>
        </div>
    `;
    
    // Inject Widgets specifically into the Left Pane
    const injectedContainer = document.getElementById('injectedWidgetsContainer');
    if (injectedContainer) injectedContainer.innerHTML = widgetHTML;

    // Inject Modals into AppScreen
    const appScreen = document.getElementById('appScreen');
    if (appScreen) appScreen.insertAdjacentHTML('beforeend', modalHTML);
    
    const syncBtn = document.getElementById('refreshDataBtn');
    if (syncBtn && typeof loadDatabase === 'function') {
        syncBtn.addEventListener('click', loadDatabase);
    }
}

// Inject widgets as soon as the file loads
injectFloatingWidgets();

// ==========================================
// 2. DYNAMIC GREETING LOGIC
// ==========================================
function updateGreeting() {
  const greetingDiv = document.getElementById('floatingGreeting');
  const greetingIcon = document.getElementById('greetingIcon');
  const greetingText = document.getElementById('greetingText');
  if (!greetingDiv) return;

  const now = new Date();
  const timeValue = (now.getHours() * 100) + now.getMinutes(); 
  const name = "Vicente";
  
  let greeting = ""; let icon = "👋";

  if (timeValue >= 501 && timeValue <= 1200) {
    if (timeValue >= 700 && timeValue <= 900) { greeting = `Good Morning ${name}! Time for breakfast and coffee!`; icon = "☕"; } 
    else { greeting = `Good Morning ${name}!`; icon = "🌅"; }
  } else if (timeValue >= 1201 && timeValue <= 1700) {
    if (timeValue >= 1200 && timeValue <= 1400) { greeting = `Good Afternoon ${name}! Enjoy your well-deserved lunch break!`; icon = "🍱"; } 
    else { greeting = `Good Afternoon ${name}!`; icon = "☀️"; }
  } else if (timeValue >= 1701 && timeValue <= 2200) {
    if (timeValue >= 1800 && timeValue <= 2000) { greeting = `Good Evening ${name}! It's dinner time!`; icon = "🍽️"; } 
    else { greeting = `Good Evening ${name}!`; icon = "🌆"; }
  } else {
    greeting = `Sleep well ${name}!`; icon = "🌙";
  }

  greetingText.innerText = greeting;
  greetingIcon.innerText = icon;
  greetingDiv.classList.remove('hidden'); 
}
setInterval(updateGreeting, 60000);

// ==========================================
// 3. PAYDAY COUNTDOWN LOGIC
// ==========================================
function updatePaydayCountdown() {
  const widget = document.getElementById('paydayWidget');
  const icon = document.getElementById('paydayIcon');
  const details = document.getElementById('paydayDetails');
  if (!widget) return;

  const now = new Date();
  let targetDate = new Date(now.getFullYear(), now.getMonth(), 25);
  let isPayday = false;
  
  if (now.getDate() === 25) { isPayday = true; } 
  else if (now.getDate() > 25) { targetDate = new Date(now.getFullYear(), now.getMonth() + 1, 25); }

  if (isPayday) {
    widget.classList.add('is-payday');
    icon.innerText = "💸"; details.innerHTML = "<strong>It's Payday!</strong>";
  } else {
    widget.classList.remove('is-payday');
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffDays = Math.ceil((targetDate - todayMidnight) / (1000 * 60 * 60 * 24));
    icon.innerText = `${diffDays}d`;
    details.innerHTML = `until <strong>${targetDate.toLocaleString('default', { month: 'short' })} 25</strong>`;
  }
}
setInterval(updatePaydayCountdown, 60 * 60 * 1000);
setTimeout(updatePaydayCountdown, 1000); // Run slightly delayed to ensure HTML injection finished

// ==========================================
// 4. CALCULATOR & SCRATCHPAD LOGIC
// ==========================================
let calcCurrentInput = "";
let calcPreviousInput = "";
let calcOperation = null;
let calcJustCalculated = false; 

function openCalculator() {
    document.getElementById('calcNotes').value = localStorage.getItem('wallet_calc_notes') || "";
    openModal('calculatorModal');
}

function updateCalcDisplay(val) { document.getElementById('calcDisplay').value = val || "0"; }

function calcInput(num) {
    if (num === '.' && calcCurrentInput.includes('.')) return; 
    if (calcJustCalculated) { calcCurrentInput = (num === '.') ? "0." : num; calcJustCalculated = false; } 
    else { calcCurrentInput += num; }
    updateCalcDisplay(calcCurrentInput);
}

function calcClear() {
    calcCurrentInput = ""; calcPreviousInput = ""; calcOperation = null; calcJustCalculated = false;
    updateCalcDisplay("0");
}

function calcOperate(op) {
    if (calcCurrentInput === "" && calcPreviousInput === "") return;
    if (calcPreviousInput !== "" && calcCurrentInput !== "" && !calcJustCalculated) calcCalculate();
    calcOperation = op;
    calcPreviousInput = calcCurrentInput !== "" ? calcCurrentInput : document.getElementById('calcDisplay').value;
    calcCurrentInput = ""; calcJustCalculated = false;
}

function calcCalculate() {
    if (calcPreviousInput === "" || calcCurrentInput === "" || !calcOperation) return;
    let prev = parseFloat(calcPreviousInput), curr = parseFloat(calcCurrentInput), result = 0;
    switch(calcOperation) {
        case '+': result = prev + curr; break;
        case '-': result = prev - curr; break;
        case '*': result = prev * curr; break;
        case '/': result = curr !== 0 ? prev / curr : 0; break;
    }
    calcCurrentInput = (Math.round(result * 10000) / 10000).toString();
    calcOperation = null; calcPreviousInput = ""; calcJustCalculated = true; 
    updateCalcDisplay(calcCurrentInput);
}

function calcConvert(direction) {
    if (calcPreviousInput !== "" && calcCurrentInput !== "" && !calcJustCalculated) calcCalculate();
    let val = parseFloat(calcCurrentInput || document.getElementById('calcDisplay').value || 0);
    if (isNaN(val) || val === 0) return;
    const safeRate = (typeof livePhpRate !== 'undefined' && livePhpRate > 0) ? livePhpRate : 14.8;
    calcCurrentInput = (direction === 'SAR_TO_PHP' ? val * safeRate : val / safeRate).toFixed(2);
    calcOperation = null; calcPreviousInput = ""; calcJustCalculated = true; 
    updateCalcDisplay(calcCurrentInput);
}

function saveCalcNotes() { localStorage.setItem('wallet_calc_notes', document.getElementById('calcNotes').value); }

function calcManualInput(val) {
    let cleanNumber = val.replace(/[^0-9.]/g, '');
    const parts = cleanNumber.split('.');
    if (parts.length > 2) cleanNumber = parts[0] + '.' + parts.slice(1).join('');
    calcCurrentInput = cleanNumber; calcJustCalculated = false;
    document.getElementById('calcDisplay').value = cleanNumber;
}


// ==========================================
// CALCULATOR KEYBOARD SUPPORT
// ==========================================
document.addEventListener('keydown', (e) => {
  const calcModal = document.getElementById('calculatorModal');

  // 1. If the calculator is NOT open, let the keyboard act normally
  if (!calcModal || calcModal.classList.contains('hidden')) {
    return;
  }

  // 2. If the user is actively typing in the Scratchpad Notes, let them type normally!
  const activeElement = document.activeElement;
  if (activeElement && activeElement.id === 'calcNotes') {
      return;
  }

  const key = e.key;

  // Numbers & Decimals
  if (['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '.'].includes(key)) {
    e.preventDefault(); 
    calcInput(key); 
  } 
  
  // Mathematical Operators
  else if (['+', '-', '*', '/'].includes(key)) {
    e.preventDefault();
    calcOperate(key); 
  } 
  
  // Calculate Result (Enter or = key)
  else if (key === 'Enter' || key === '=') {
    e.preventDefault();
    calcCalculate(); 
  } 
  
  // Backspace (Delete the last typed character)
  else if (key === 'Backspace') {
      // Only do this if we aren't already naturally typing in the main display input
      if (activeElement.id !== 'calcDisplay') {
          e.preventDefault();
          let currentDisplay = document.getElementById('calcDisplay').value;
          // If there's more than one number, slice off the last one. Otherwise, reset to 0.
          if (currentDisplay.length > 1) {
              calcManualInput(currentDisplay.slice(0, -1));
          } else {
              calcClear();
          }
      }
  } 
  
  // Clear Calculator (Press 'C' or 'Delete')
  else if (key.toLowerCase() === 'c' || key === 'Delete') {
    e.preventDefault();
    calcClear(); 
  }
});



// ==========================================
// 5. CALENDAR & GOOGLE SYNC LOGIC
// ==========================================
const CALENDAR_API_URL = "https://script.google.com/macros/s/AKfycbz5bRtVHyNUh0BUZ5M-_yLn3ZqFIfNpojdD_2cBy_ikQhISryN0WIYeVTa1Vr1wcDDx4Q/exec";
let calHolidays = [];
let calPersonalNotes = [];
let currentCalDate = new Date(); 

async function fetchHolidays() {
    try {
        const res = await fetch(CALENDAR_API_URL);
        const json = await res.json();
        if (json.status === "success") { calHolidays = json.data; renderCalendar(); }
    } catch(e) { console.error("Failed to load holidays", e); }
}

async function refreshCalendarData() {
    if (typeof showStatus === 'function') showStatus("🔄 Syncing Google Calendar...");
    calHolidays = []; 
    await fetchHolidays();
    if (typeof showStatus === 'function') showStatus("✅ Calendar up to date!");
}

function startCalendarNotesListener() {
    if (typeof db !== 'undefined') {
        db.ref('calendar_notes').on('value', snap => {
            calPersonalNotes = [];
            snap.forEach(child => { calPersonalNotes.push({ id: child.key, ...child.val() }); });
            if (typeof renderCalendar === 'function') renderCalendar(); 
        });
    }
}

function openCalendar() {
    openModal('calendarModal');
    if (calHolidays.length === 0) fetchHolidays();
    else renderCalendar();
}

function changeCalendarMonth(offset) {
    currentCalDate.setMonth(currentCalDate.getMonth() + offset);
    renderCalendar();
}

function renderCalendar() {
    const grid = document.getElementById('calendarGrid');
    const monthDisplay = document.getElementById('calMonthDisplay');
    if (!grid) return;

    const year = currentCalDate.getFullYear(), month = currentCalDate.getMonth();
    monthDisplay.innerText = currentCalDate.toLocaleString('default', { month: 'long', year: 'numeric' });

    let html = '';
    ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach((h, i) => {
        html += `<div class="cal-header ${i === 0 ? 'sunday' : ''}">${h}</div>`;
    });

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for(let i = 0; i < firstDay; i++) html += `<div class="cal-day empty"></div>`;

    const formatStr = (d) => `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const _now = new Date();
    const todayStr = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, '0')}-${String(_now.getDate()).padStart(2, '0')}`;
    let monthlyEventsLog = [];

    for(let d = 1; d <= daysInMonth; d++) {
        const dateStr = formatStr(d);
        const dayOfWeek = new Date(year, month, d).getDay(); 
        let classes = ["cal-day"];
        
        if (dayOfWeek === 0) classes.push("sunday-text"); 
        if (dayOfWeek === 5 || dayOfWeek === 6) classes.push("weekend"); 
        if (dateStr === todayStr) classes.push("today");

        const dayHolidays = calHolidays.filter(h => h.date === dateStr);
        const dayNotes = calPersonalNotes.filter(n => n.date === dateStr);
        
        const hasGoogleEntry = dayHolidays.some(h => h.country === 'Personal_Entry');
        if (dayNotes.length > 0 || hasGoogleEntry) {
            classes.push("has-personal");
        }

        let hasPH = false, hasSA = false;
        dayHolidays.forEach(h => {
            let type = 'google'; 
            if (h.country === 'Philippines') { hasPH = true; type = 'ph'; } 
            else if (h.country === 'Saudi Arabia') { hasSA = true; type = 'sa'; } 
            else if (h.country === 'Personal_Entry') { type = 'personal-sync'; }
            
            monthlyEventsLog.push({ date: dateStr, title: h.name, type: type, day: d });
        });

        if (hasPH && hasSA) classes.push("both-holiday");
        else if (hasPH) classes.push("ph-holiday");
        else if (hasSA) classes.push("sa-holiday");

        let indicatorHtml = (dayNotes.length > 0 || hasGoogleEntry) ? `<div class="cal-indicator" style="display:block;"></div>` : "";
        dayNotes.forEach(n => { monthlyEventsLog.push({ date: dateStr, title: n.title, type: 'personal', day: d }); });

        html += `<div class="${classes.join(' ')}" onclick="openDayView('${dateStr}', ${d})">${d}${indicatorHtml}</div>`;
    }

    grid.innerHTML = html;
    
    const logContainer = document.getElementById('calendarEventsList');
    monthlyEventsLog.sort((a, b) => a.day - b.day);
    logContainer.innerHTML = monthlyEventsLog.length === 0 
        ? `<div style="color:#9ca3af; text-align:center;">No entries this month.</div>`
        : monthlyEventsLog.map(ev => {
            let badge = ev.type === 'ph' ? '🇵🇭' : (ev.type === 'sa' ? '🇸🇦' : '📌');
            return `<div class="event-log-item ${ev.type}"><strong>${ev.day}:</strong> ${badge} ${ev.title}</div>`;
        }).join('');
}

function openDayView(dateStr, dayNum) {
    document.getElementById('calendarNoteForm').reset();
    document.getElementById('noteSelectedDate').value = dateStr;
    document.getElementById('dayDateDisplay').innerText = new Date(dateStr).toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    
    let existingHtml = "";
    calHolidays.filter(h => h.date === dateStr).forEach(h => {
        let badge = '📌'; 
        if (h.country === 'Philippines') badge = '🇵🇭';
        else if (h.country === 'Saudi Arabia') badge = '🇸🇦';

        let cssClass = 'personal'; 
        if (h.country === 'Philippines') cssClass = 'ph';
        else if (h.country === 'Saudi Arabia') cssClass = 'sa';

        let prefix = (h.country === 'Personal_Entry') ? '' : 'Holiday: ';
        
        existingHtml += `<div class="event-log-item ${cssClass}">${badge} <strong>${prefix}${h.name}</strong></div>`;
    });
    calPersonalNotes.filter(n => n.date === dateStr).forEach(n => {
        let descHtml = n.notes ? `<br><span style="color:#6b7280; font-size:11px;">${n.notes}</span>` : "";
        existingHtml += `<div class="event-log-item personal">📌 <strong>${n.title}</strong>${descHtml}</div>`;
    });
    
    document.getElementById('dayExistingEvents').innerHTML = existingHtml || `<span style="color:#9ca3af; font-size:12px; font-style:italic;">Nothing scheduled for this day.</span>`;
    openModal('calendarDayModal');
}

document.getElementById('calendarNoteForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('noteSubmitBtn');
    btn.innerText = "Syncing..."; btn.disabled = true;

    const payload = { 
        date: document.getElementById('noteSelectedDate').value, 
        title: document.getElementById('noteTitle').value, 
        notes: document.getElementById('noteDesc').value 
    };

    try {
        await db.ref('calendar_notes').push(payload);
        await fetch(CALENDAR_API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) });
        if (typeof showStatus === 'function') showStatus("✅ Note synced to Google Calendar!");
    } catch(err) {
        if (typeof showStatus === 'function') showStatus("❌ Failed to sync to Google Calendar", true);
        console.error("Calendar Sync Error:", err);
    } finally {
        btn.innerText = "Save & Sync to Google"; btn.disabled = false;
        closeModal('calendarDayModal');
    }
});

// ==========================================
// 6. MOBILE FLOATING AUTO-HIDE LOGIC (UPGRADED)
// ==========================================
function initMobileScrollHide() {
    // Increased delay slightly to guarantee all HTML is injected first
    setTimeout(() => {
        const actionContainer = document.querySelector('.floating-action-container');
        const paydayWidget = document.getElementById('paydayWidget');

        let lastScrollTop = 0;
        const scrollThreshold = 10; 

        // The 'true' at the end of this listener forces it to catch scrolling inside ANY div
        window.addEventListener('scroll', function(e) {
            // Only trigger on mobile screens
            if (window.innerWidth <= 768) {
                
                // Get the scroll position whether it's the whole window or a specific div inside your app
                let currentScroll = 0;
                if (e.target === document || e.target === window) {
                    currentScroll = window.scrollY || document.documentElement.scrollTop;
                } else {
                    currentScroll = e.target.scrollTop;
                }

                if (currentScroll === undefined) return;

                // Ignore tiny accidental scrolls
                if (Math.abs(lastScrollTop - currentScroll) <= scrollThreshold) return;

                if (currentScroll > lastScrollTop && currentScroll > 50) {
                    // Scrolling DOWN -> Hide the elements
                    if (actionContainer) actionContainer.classList.add('floating-hidden-down');
                    if (paydayWidget) paydayWidget.classList.add('floating-hidden-up'); 
                } else {
                    // Scrolling UP -> Show the elements again
                    if (actionContainer) actionContainer.classList.remove('floating-hidden-down');
                    if (paydayWidget) paydayWidget.classList.remove('floating-hidden-up');
                }
                
                lastScrollTop = currentScroll <= 0 ? 0 : currentScroll; 
            } else {
                // Desktop view safety reset
                if (actionContainer) actionContainer.classList.remove('floating-hidden-down');
                if (paydayWidget) paydayWidget.classList.remove('floating-hidden-up');
            }
        }, true); // <-- This 'true' (useCapture) is the secret weapon!

    }, 1000); 
}

// Start the listener
initMobileScrollHide();