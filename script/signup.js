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

  const bannedWords = [
    "fuck","shit","bitch","asshole","cunt","nigger","faggot","dick","cock","pussy",
    "nigga","slut","whore","bastard","penis","vagina","sex","rape","kill","suicide",
    "cum","boob","boobs","fag","retard","jerk","porn","horny","gay","lesbian","dildo"
  ];

  function containsBadWord(str) {
    const lowerStr = str.toLowerCase();
    return bannedWords.some(word => lowerStr.includes(word));
  }

  document.getElementById("signup").addEventListener("submit", async function (e) {
    e.preventDefault();

    const displayName = document.getElementById("displayName").value.trim();
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    const error = document.getElementById("error");
    const success = document.getElementById("success");

    error.style.display = "none";
    success.style.display = "none";

    if (containsBadWord(displayName) || containsBadWord(username)) {
      error.textContent = "Please avoid using offensive words in Display Name or Username.";
      error.style.display = "block";
      return;
    }

    if (password.length < 6) {
      error.textContent = "Password must be at least 6 characters long.";
      error.style.display = "block";
      return;
    }

    try {
      const snapshot = await db.ref("users/" + username).get();

      if (snapshot.exists()) {
        error.textContent = "Username already exists!";
        error.style.display = "block";
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
      }, 2000);

    } catch (err) {
      console.error("Firebase write error:", err);
      error.textContent = "Error creating account. Check console for details.";
      error.style.display = "block";
    }
  });

})();
