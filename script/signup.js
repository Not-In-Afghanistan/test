(() => {
  const firebaseConfig = {
    apiKey: "AIzaSyAZgBE5NSV_ueySIMEzI5sSMiXWXgIEAm0",
    authDomain: "schoolwebapp-f387b.firebaseapp.com",
    databaseURL: "https://schoolwebapp-f387b-default-rtdb.firebaseio.com",
    projectId: "schoolwebapp-f387b",
    storageBucket: "schoolwebapp-f387b.firebasestorage.app",
    messagingSenderId: "586089938810",
    appId: "1:586089938810:web:571725c421c9d9365220c3",
    measurementId: "G-N116PDW0M4"
  };

  if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
  const db = firebase.database();

  // allowed: letters + numbers only
  const allowedPattern = /^[A-Za-z0-9]*$/;

  window.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById("signup");
    const displayInput = document.getElementById("displayName");
    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");
    const error = document.getElementById("error");
    const success = document.getElementById("success");

    error.style.display = "none";
    success.style.display = "none";

    function showError(msg) {
      error.textContent = msg;
      error.style.display = "block";
    }
    function clearError() {
      error.style.display = "none";
      error.textContent = "";
    }



    displayInput.addEventListener('input', () => {
      sanitizeField(displayInput);
      clearError();
    });
    usernameInput.addEventListener('input', () => {
      sanitizeField(usernameInput);
      clearError();
    });

    const bannedWords = [
      "fuck","shit","bitch","asshole","cunt","nigger","faggot","dick","cock","pussy",
      "nigga","slut","whore","bastard","penis","vagina","sex","rape","kill","suicide",
      "cum","boob","boobs","fag","retard","jerk","porn","horny","gay","lesbian","femboy","ass","kkk","masturbate","dildo"
    ];

    function containsBadWord(str) {
      const lowerStr = str.toLowerCase();
      return bannedWords.some(word => lowerStr.includes(word));
    }

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearError();
      success.style.display = "none";

      const displayName = displayInput.value.trim();
      const username = usernameInput.value.trim();
      const password = passwordInput.value;

      if (!displayName) { showError("Display Name is required."); return; }
      if (!username) { showError("Username is required."); return; }
      if (!password) { showError("Password is required."); return; }

      if (!allowedPattern.test(displayName) || displayName.length > 13) {
        showError("Display Name must be 1–15 characters, letters and numbers only.");
        return;
      }
      if (!allowedPattern.test(username) || username.length > 8) {
        showError("Username must be 1–8 characters, letters and numbers only.");
        return;
      }

      if (containsBadWord(displayName) || containsBadWord(username)) {
        showError("Please avoid offensive words in Display Name or Username.");
        return;
      }

      if (password.length < 6) {
        showError("Password must be at least 6 characters long.");
        return;
      }

      try {
        const snapshot = await db.ref("users/" + username).get();
        if (snapshot.exists()) {
          showError("Username already exists!");
          return;
        }

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
