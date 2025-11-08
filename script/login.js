  // Firebase config
  const firebaseConfig = {
    apiKey: "AIzaSyBGPFSP0e0oYqKqvJHLB5eGlX9mJ8aU09s",
    authDomain: "test-da143.firebaseapp.com",
    databaseURL: "https://test-da143-default-rtdb.firebaseio.com",
    projectId: "test-da143",
    storageBucket: "test-da143.appspot.com",
    messagingSenderId: "58366480447",
    appId: "1:58366480447:web:f3dd12850f09952b49688a",
    measurementId: "G-T5HK7JTWHW"
  };

  firebase.initializeApp(firebaseConfig);
  const db = firebase.database();


  // 🔒 Local ID-password pairs
  const userPasswords = {
    "596923": "UrWrong67",
    "564380": "CurryLover99",
    "603974": "ninjastar123",
    "545208": "Boondocks697",
    "547025": "IhaveLigma43",
    "600437": "Niggalodian69",
    "599328": "PreFredom88",
    "589475": "IrishLapDance67",
    "598292": "noTherCurry4U"
  };


  const form = document.getElementById("form");
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const username = document.getElementById("usernameInput").value.trim();
    const password = document.getElementById("passwordInput").value.trim();

    if (!/^\d{6}$/.test(username)) {
      alert("User ID must be exactly 6 digits.");
      return;
    }

    if (!userPasswords[username]) {
      alert("User ID not found.");
      return;
    }

    if (userPasswords[username] !== password) {
      alert("Incorrect password. Please try again.");
      return;
    }

    // ✅ Check for active ban
    db.ref(`bans/${username}`).once("value").then(snap => {
      const banData = snap.val();
      if (banData && banData.expires > Date.now()) {
        const expires = new Date(banData.expires).toLocaleString();
        alert(`⛔ You are banned until ${expires}. You cannot sign in.`);
        return;
      } else if (banData) {
        // Ban expired, remove entry
        db.ref(`bans/${username}`).remove();
      }

      // Success login
      sessionStorage.setItem("loginAsk", "true");
      sessionStorage.setItem("username", username);
      localStorage.setItem("username", username);

      db.ref("users").push({ username, timestamp: Date.now() })
        .then(() => {
          form.reset();
          window.location.href = "./chat.html";
        })
        .catch(err => alert(err.message));
    });
  });


(function() {
  // Real-time ban watcher - drop into index.html and chat.html after firebase is initialized.
  let banRef = null;
  let currentWatchedId = null;

  // Helper: get current userid from storage
  function getStoredId() {
    return localStorage.getItem('username') || sessionStorage.getItem('username') || null;
  }

  // Attach a realtime listener for the given user id
  function attachBanListener(userId) {
    if (!userId) return;
    // avoid re-attaching same ref
    if (currentWatchedId === userId && banRef) return;

    // detach previous
    detachBanListener();

    currentWatchedId = userId;
    banRef = db.ref(`bans/${userId}`);
    banRef.on('value', snap => {
      const banData = snap.val();
      if (banData && banData.expires && banData.expires > Date.now()) {
        // user is currently banned
        const expiresStr = new Date(banData.expires).toLocaleString();
        try { alert(`⛔ You are banned until ${expiresStr}.`); } catch(e) { /* ignore */ }
        // force back to index (kick)
        window.location.href = "./index.html";
      } else if (banData && banData.expires && banData.expires <= Date.now()) {
        // ban expired — cleanup server-side record optionally
        db.ref(`bans/${userId}`).remove().catch(()=>{ /* ignore */ });
      }
      // if no banData -> no active ban
    });
  }

  // Detach listener if present
  function detachBanListener() {
    if (banRef) {
      try { banRef.off(); } catch(e) {}
      banRef = null;
    }
    currentWatchedId = null;
  }

  // Keep in sync: attach for current id, detach if none or changed
  function syncBanWatcher() {
    const id = getStoredId();
    if (!id) {
      detachBanListener();
      return;
    }
    attachBanListener(id);
  }

  // React to storage changes in other tabs
  window.addEventListener('storage', (ev) => {
    if (ev.key === 'username') syncBanWatcher();
  });

  // Also check when page becomes visible (user switched tab)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) syncBanWatcher();
  });

  // As fallback, poll every 5s to make sure we are attached (keeps things robust)
  setInterval(syncBanWatcher, 5000);

  // Start immediately (requires db to be defined)
  if (typeof db !== 'undefined') {
    syncBanWatcher();
  } else {
    // if db isn't defined yet, wait until firebase is ready
    const readyInterval = setInterval(() => {
      if (typeof db !== 'undefined') {
        clearInterval(readyInterval);
        syncBanWatcher();
      }
    }, 200);
  }

  // Expose small helper for manual control (optional)
  window.__banWatcher = {
    attach: attachBanListener,
    detach: detachBanListener,
    sync: syncBanWatcher
  };
})();


