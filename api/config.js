// api/config.js (on Vercel)
export default function handler(req, res) {
  res.status(200).json({
    apiKey: "AIza...09s",
    authDomain: "test-da143.firebaseapp.com",
    databaseURL: "https://test-da143-default-rtdb.firebaseio.com",
    projectId: "test-da143",
    storageBucket: "test-da143.firebasestorage.app",
    messagingSenderId: "58366480447",
    appId: "1:58366480447:web:f3dd12850f09952b49688a",
    measurementId: "G-T5HK7JTWHW"
  });
}
