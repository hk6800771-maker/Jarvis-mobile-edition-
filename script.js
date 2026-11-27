// =================================
// JARVIS MOBILE - VOICE SYSTEM 1.0
// =================================

const initializeButton = document.getElementById("initializeBtn");
const voiceButton = document.getElementById("voiceBtn");

const statusText = document.querySelector(".status span");
const systemPanel = document.querySelector(".panel");
const statusDot = document.querySelector(".dot");

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

let recognition;
let listening = false;

// ---------- JARVIS SPEAK ----------

function jarvisSpeak(message) {
  if (!("speechSynthesis" in window)) {
    return;
  }

  window.speechSynthesis.cancel();

  const speech = new SpeechSynthesisUtterance(message);
  speech.lang = "en-IN";
  speech.rate = 1;
  speech.pitch = 1;
  speech.volume = 1;

  window.speechSynthesis.speak(speech);
}

// ---------- INITIALIZE BUTTON ----------

initializeButton.addEventListener("click", function () {
  statusText.textContent = "SYSTEM ACTIVE";

  statusDot.style.background = "#00eaff";
  statusDot.style.boxShadow = "0 0 12px #00eaff";

  systemPanel.innerHTML = `
    <h2>SYSTEM STATUS</h2>
    <p>JARVIS is now active.</p>
    <p>System initialized successfully.</p>
    <p>Awaiting your command...</p>
  `;

  initializeButton.textContent = "JARVIS ACTIVATED";

  jarvisSpeak("Hello. Jarvis system initialized. I am ready.");
});

// ---------- SPEECH RECOGNITION SETUP ----------

if (SpeechRecognition) {
  recognition = new SpeechRecognition();

  recognition.lang = "en-IN";
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onstart = function () {
    listening = true;
    voiceButton.textContent = "🔴 LISTENING...";
    statusText.textContent = "LISTENING";

    systemPanel.innerHTML = `
      <h2>SYSTEM STATUS</h2>
      <p>JARVIS is listening to you...</p>
      <p>Speak now.</p>
    `;
  };

  recognition.onresult = function (event) {
    const transcript =
      event.results[0][0].transcript.trim();

    systemPanel.innerHTML = `
      <h2>YOU SAID</h2>
      <p>${transcript}</p>
      <p>Voice received successfully.</p>
    `;

    jarvisSpeak("I heard you say " + transcript);
  };

  recognition.onerror = function (event) {
    systemPanel.innerHTML = `
      <h2>VOICE ERROR</h2>
      <p>${event.error}</p>
      <p>Please try again.</p>
    `;
  };

  recognition.onend = function () {
    listening = false;
    voiceButton.textContent = "🎤 START VOICE";
    statusText.textContent = "SYSTEM ONLINE";
  };

} else {
  voiceButton.textContent = "VOICE NOT SUPPORTED";

  voiceButton.disabled = true;
}

// ---------- VOICE BUTTON ----------

voiceButton.addEventListener("click", function () {
  if (!recognition) {
    jarvisSpeak("Speech recognition is not supported in this browser.");
    return;
  }

  if (listening) {
    recognition.stop();
    return;
  }

  try {
    recognition.start();
  } catch (error) {
    systemPanel.innerHTML = `
      <h2>VOICE SYSTEM</h2>
      <p>Voice system is busy.</p>
      <p>Please try again.</p>
    `;
  }
});
