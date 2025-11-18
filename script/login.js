// Firebase config
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

// Initialize Firebase only if not already initialized
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.database();

document.getElementById("login").addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  const error = document.getElementById("error");
  error.style.display = "none";

  try {
    const snapshot = await db.ref("users/" + username).get();

    if (!snapshot.exists() || snapshot.val().password !== password) {
      error.textContent = "Invalid username or password.";
      error.style.display = "block";
      return;
    }

    const userData = snapshot.val();

    // Store login info
    localStorage.setItem("currentUser", username);
    localStorage.setItem("displayName", userData.displayName);

    console.log(`Logged in as ${username}`);

    // Redirect to dashboard
    window.location.href = "./dash.html";

  } catch (err) {
    console.error("Firebase login error:", err);
    error.textContent = "Error connecting to database. Please try again.";
    error.style.display = "block";
  }
});
