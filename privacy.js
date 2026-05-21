const dummyGoogleHTML = `
  <div id="fakeGoogleScreen">
    <img src="https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png" alt="Google" class="google-logo">
    
    <div class="search-container">
      <svg class="search-icon" focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"></path></svg>
      <input type="text" class="search-bar" id="fakeSearchInput" autocomplete="off" title="Search">
    </div>
    
    <div class="google-btns">
      <button class="google-btn" type="button" id="fakeSearchBtn">Google Search</button>
      <button class="google-btn" type="button">I'm Feeling Lucky</button>
    </div>
  </div>
`;

// 1. Inject the new Image HTML alongside the Google HTML
const dummyImageHTML = `
  <div id="fakeImageScreen">
    <img id="dummyJpgTarget" src="" alt="System Interface">
  </div>
`;

document.body.insertAdjacentHTML('beforeend', dummyGoogleHTML);
document.body.insertAdjacentHTML('beforeend', dummyImageHTML);

const fakeSearchInput = document.getElementById('fakeSearchInput');
const fakeSearchBtn = document.getElementById('fakeSearchBtn');
const dummyJpgTarget = document.getElementById('dummyJpgTarget');

// 2. Fetch the Dummy JPG URL from Firebase
// This will auto-update the image if you ever change the link in the database!
if (typeof db !== 'undefined') {
  db.ref('settings/dummyImageUrl').on('value', snap => {
    const url = snap.val();
    if (url) {
      dummyJpgTarget.src = url;
    }
  });
}

function executeSearch() {
  const query = fakeSearchInput.value.trim();
  if (query) {
    const searchUrl = 'https://www.google.com/search?q=' + encodeURIComponent(query);
    window.open(searchUrl, '_blank'); 
    fakeSearchInput.value = '';       
  }
}

fakeSearchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') executeSearch();
});

fakeSearchBtn.addEventListener('click', executeSearch);

// 3. Handle Keyboard Shortcuts
document.addEventListener('keydown', (e) => {
  const activeTag = document.activeElement.tagName.toLowerCase();
  
  if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
      if (!e.altKey && document.activeElement !== fakeSearchInput) return; 
  }

  // Alt + P (Google Screen)
  if (e.altKey && (e.key === 'p' || e.key === 'P')) {
    e.preventDefault(); 
    document.body.classList.remove('image-locked'); // Clear image lock if active
    document.body.classList.toggle('privacy-locked');
    
    if (document.body.classList.contains('privacy-locked')) {
        setTimeout(() => fakeSearchInput.focus(), 50);
    } else {
        fakeSearchInput.value = "";
    }
  }

  // Alt + O (Image Screen)
  if (e.altKey && (e.key === 'o' || e.key === 'O')) {
    e.preventDefault(); 
    document.body.classList.remove('privacy-locked'); // Clear Google lock if active
    document.body.classList.toggle('image-locked');
  }
});