
  // 🔒 Local ID-password pairs
  const userPasswords = {
"596923": "pbkdf2_sha256$200000$71ced7fe69aae1465dd666d01e4af024$ad4d225a79f5351cd4080c015648799d2a8bf86f22a0af607abcaf94246ea47f",
  "589533": "pbkdf2_sha256$200000$c82661400c89abbecffea592895ad42e$0ca3abca539fb6a355de3403079e060ce6995263e4aea2612c407059a665575b",
  "589425": "pbkdf2_sha256$200000$8fb9c14efcd07aa75afac90e6944beb7$3f8a7eceab3f2ea80ac18943943a2d69db19adc129e17b7e3ad082b1a0e79dd1",
  "564380": "pbkdf2_sha256$200000$70bca95393cdbbe372cfd2647f8d8307$87664ef979f5b6fd8b1ee439ba5380d62a24944e152dcb6a5245bbfdc8697876",
  "603974": "pbkdf2_sha256$200000$e1d5256c1cca0f4f5777d7eea3df783d$3c2f27ea5b165ef90bcff8a26d2a01d2d5a4f7b89c959f6a9ea31b386cebc83c",
  "546766": "pbkdf2_sha256$200000$20aaad45ab1ddd9c6523ce9b0dc5fa5a$52723dca38b5619a046821a44bc7140268f58bfff6d6d95e52d9904f6c191a29",
  "545208": "pbkdf2_sha256$200000$dd57d5f3e4a6cc3cd2580493f13085f7$86be390c67f156a71d33e71318199afdcb2e6e76c73acda5b061c4d59439f829",
  "547025": "pbkdf2_sha256$200000$5088bc781b51394911402d460dc84c12$5f27a36a67be5ddae57cbfb04833024ef799503123f5f29b88edd823b48164be",
  "600437": "pbkdf2_sha256$200000$bed2845ce2191a763c4ecbf835885eeb$55c352b5e8cb0b5321cdeba87b61f5b310e18ed39f56981d6790b081858b747b",
  "599328": "pbkdf2_sha256$200000$c4c2fbd86b750c3836177ac0c8bbd401$bedfbb52ad0edc9079b312a14a92241a79fbf7dd267e216945625e994eb3e825",
  "592276": "pbkdf2_sha256$200000$d96cf00abc5822de0444053d6dab9c80$f517318869dd34dfff0265e1d3a93a4ba2b6bb8c0a4ed614feb6555f9c9827fb",
  "597627": "pbkdf2_sha256$200000$1a2ede01f53f3f9767269a4fc5644352$334537bcd0d57c6b53fcdd481ab5ddedd4631ea500bb1572203aa3f926770bfc",
  "589475": "pbkdf2_sha256$200000$8688d5e27dc884d86e2966f0c674e1ec$d73d3463aece95c0d74bfda443854dc04d7e4ae2c287560eba823fa47d690453",
  "598292": "pbkdf2_sha256$200000$7c8b61fa312d6d9ece9560442ab587ce$7e87470a1194e05cc4237033622c3fe4004eb362f9c21b061f21476555f857d6"
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
          window.location.href = "./homepage.html";
        })
        .catch(err => alert(err.message));
    });
  });

(function(){
  // Real-time ban watcher - drop into index.html and homepage.html after firebase is initialized.
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