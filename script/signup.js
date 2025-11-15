(() => {
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

  if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
  const db = firebase.database();

  // allowed: letters + numbers only
  const allowedPattern = /^[A-Za-z0-9]*$/;

  // Elements will exist after DOMContentLoaded
  window.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById("signup");
    const displayInput = document.getElementById("displayName");
    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");
    const error = document.getElementById("error");
    const success = document.getElementById("success");

    if (!form || !displayInput || !usernameInput || !passwordInput || !error || !success) {
      console.error("Signup script: missing DOM elements. Check IDs: signup, displayName, username, password, error, success.");
      return;
    }

    error.style.display = "none";
    success.style.display = "none";

    // helper to show error
    function showError(msg) {
      error.textContent = msg;
      error.style.display = "block";
    }
    function clearError() {
      error.style.display = "none";
      error.textContent = "";
    }

    // live sanitizers: remove invalid chars and enforce max length (8)
    function sanitizeField(inputEl) {
      let v = inputEl.value;
      // remove spaces
      v = v.replace(/\s+/g, '');
      // remove non-alphanumeric
      v = v.replace(/[^A-Za-z0-9]/g, '');
      // enforce max length 8
      if (v.length > 8) v = v.slice(0, 8);
      if (v !== inputEl.value) {
        // replace value without moving caret to end too aggressively
        const pos = inputEl.selectionStart;
        inputEl.value = v;
        // try to preserve caret
        inputEl.setSelectionRange(Math.min(pos, v.length), Math.min(pos, v.length));
      }
    }

    // bind sanitizers to inputs
    displayInput.addEventListener('input', () => {
      sanitizeField(displayInput);
      clearError();
    });
    usernameInput.addEventListener('input', () => {
      sanitizeField(usernameInput);
      clearError();
    });

    // final banned-words check (keeps your list)
    const bannedWords = [
      "fuck","shit","bitch","asshole","cunt","nigger","faggot","dick","cock","pussy",
      "nigga","slut","whore","bastard","penis","vagina","sex","rape","kill","suicide",
      "cum","boob","boobs","fag","retard","jerk","porn","horny","gay","lesbian","dildo"
    ];
    function containsBadWord(str) {
      const lowerStr = str.toLowerCase();
      return bannedWords.some(word => lowerStr.includes(word));
    }

    // on submit: validate again (server-side safety in client)
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearError();
      success.style.display = "none";

      const displayName = displayInput.value.trim();
      const username = usernameInput.value.trim();
      const password = passwordInput.value;

      // Basic presence
      if (!displayName) { showError("Display Name is required."); return; }
      if (!username)     { showError("Username is required."); return; }
      if (!password)     { showError("Password is required."); return; }

      // pattern checks (should already be sanitized)
      if (!allowedPattern.test(displayName) || displayName.length > 10) {
        showError("Display Name must be 1–10 characters, letters and numbers only (no spaces/symbols).");
        return;
      }
      if (!allowedPattern.test(username) || username.length > 8) {
        showError("Username must be 1–8 characters, letters and numbers only (no spaces/symbols).");
        return;
      }

      // banned words check
      if (containsBadWord(displayName) || containsBadWord(username)) {
        showError("Please avoid using offensive words in Display Name or Username.");
        return;
      }

      // password check
      if (password.length < 6) {
        showError("Password must be at least 6 characters long.");
        return;
      }

      try {
        // check username existence (username used as key)
        const snapshot = await db.ref("users/" + username).get();
        if (snapshot.exists()) {
          showError("Username already exists!");
          return;
        }

        // write user (note: you still store password plaintext here; consider hashing)
        const newUser = {
          displayName: displayName,
          password: password,
          createdAt: new Date().toISOString()
        };

        await db.ref("users/" + username).set(newUser);

        success.textContent = "Account created! Redirecting to login...";
        success.style.display = "block";

        setTimeout(() => {
          window.location.href = "login.html";
        }, 1200);

      } catch (err) {
        console.error("Firebase write error:", err);
        showError("Error creating account. Check console for details.");
      }
    });
  });
})();
