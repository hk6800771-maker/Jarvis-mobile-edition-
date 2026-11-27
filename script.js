// ===========================================
// J.A.R.V.I.S MOBILE EDITION — COMPLETE JS
// 15 TOOLS + WORKING BUTTON CONNECTIONS
// ===========================================

alert("J.A.R.V.I.S SCRIPT LOADED");

// ===== 1. GEMINI API KEY =====
let API_KEY = localStorage.getItem("jarvis_key");

if (!API_KEY) {
  API_KEY = prompt("Enter your Gemini API Key:");
  if (API_KEY) localStorage.setItem("jarvis_key", API_KEY.trim());
}

// ===== 2. MEMORY =====
let MEMORY = JSON.parse(localStorage.getItem("jarvis_memory") || "[]");

function saveMemory() {
  localStorage.setItem("jarvis_memory", JSON.stringify(MEMORY));
}

// ===== 3. GET HTML ELEMENTS =====
const chat = document.getElementById("chat");
const input = document.getElementById("msg");
const sendBtn = document.getElementById("send-btn");
const micBtn = document.getElementById("mic-btn");
const clearBtn = document.getElementById("clear-btn");
const camBtn = document.getElementById("cam-btn");
const galleryBtn = document.getElementById("gallery-btn");
const imgInput = document.getElementById("img-input");

let selectedImage = null;
let voices = [];

// ===== 4. CHAT DISPLAY =====
function addMessage(text, role = "ai") {
  const d = document.createElement("div");
  d.className = "msg " + role;
  d.innerText = (role === "user" ? "YOU: " : "J.A.R.V.I.S: ") + text;
  chat.appendChild(d);
  chat.scrollTop = chat.scrollHeight;
}

function clearChat() {
  chat.innerHTML = "";
}

function addImagePreview(file) {
  const d = document.createElement("div");
  d.className = "msg user";

  const img = document.createElement("img");
  img.src = URL.createObjectURL(file);
  img.style.maxWidth = "220px";
  img.style.maxHeight = "220px";
  img.style.borderRadius = "10px";

  d.appendChild(img);
  chat.appendChild(d);
  chat.scrollTop = chat.scrollHeight;
}

// ===== 5. SPEECH =====
function loadVoices() {
  voices = speechSynthesis.getVoices();
}

loadVoices();
speechSynthesis.onvoiceschanged = loadVoices;

function speak(text) {
  if (!("speechSynthesis" in window)) return;

  speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.0;
  utterance.pitch = 0.85;
  utterance.volume = 1;

  const voice = voices.find(v => v.lang.startsWith("en-IN")) ||
               voices.find(v => v.lang.startsWith("en"));

  if (voice) utterance.voice = voice;

  speechSynthesis.speak(utterance);
}

// ===== 6. GEMINI AI =====
const MODELS = ["gemini-2.5-flash", "gemini-2.0-flash"];

async function callGemini(prompt, imageBase64 = null, mimeType = "image/jpeg") {
  const contents = MEMORY.slice(-12).map(m => ({
    role: m.role === "user" ? "user" : "model",
    parts: [{ text: m.text }]
  }));

  const userParts = [{ text: prompt }];

  if (imageBase64) {
    userParts.push({
      inlineData: {
        mimeType: mimeType,
        data: imageBase64
      }
    });
  }

  contents.push({
    role: "user",
    parts: userParts
  });

  let lastError = null;

  for (const model of MODELS) {
    try {
      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/" +
        model + ":generateContent?key=" + encodeURIComponent(API_KEY),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: contents,
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 1000
            }
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        const err = new Error(data.error?.message || "Gemini request failed");
        err.status = response.status;
        throw err;
      }

      const answer = data.candidates?.[0]?.content?.parts
        ?.map(p => p.text || "")
        .join("");

      if (!answer) throw new Error("Empty AI response");

      return answer;

    } catch (e) {
      lastError = e;

      if (e.status === 400 || e.status === 403) {
        throw e;
      }
    }
  }

  throw lastError || new Error("AI connection failed");
}

// ===== 7. MAIN AI FUNCTION =====
async function askGemini(prompt, image = null) {
  if (!API_KEY) {
    addMessage("API key missing. Reload and enter your API key.", "ai");
    return;
  }

  addMessage(prompt, "user");

  if (image) addImagePreview(image);

  const loading = document.createElement("div");
  loading.className = "msg ai";
  loading.innerText = "J.A.R.V.I.S: Thinking...";
  chat.appendChild(loading);
  chat.scrollTop = chat.scrollHeight;

  try {
    const reply = await callGemini(
      prompt,
      image ? await fileToBase64(image) : null,
      image?.type || "image/jpeg"
    );

    loading.innerText = "J.A.R.V.I.S: " + reply;

    MEMORY.push({ role: "user", text: prompt });
    MEMORY.push({ role: "model", text: reply });
    saveMemory();

    speak(reply);

  } catch (error) {
    loading.innerText = "J.A.R.V.I.S ERROR: " + error.message;
    console.error(error);
  }

  chat.scrollTop = chat.scrollHeight;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result.toString();
      resolve(result.split(",")[1]);
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ===== 8. TOOL ROUTER =====
async function callGeminiWithTools(prompt) {
  const cmd = prompt.toLowerCase().trim();

  // TOOL 14: DATE & TIME
  if (cmd.includes("time") || cmd.includes("date")) {
    return JarvisTools.dateTime();
  }

  // TOOL 7: GOOGLE SEARCH
  if (cmd.includes("google search")) {
    const q = prompt.replace(/google search/i, "").trim();
    JarvisTools.googleSearch(q);
    return "Searching Google for " + q;
  }

  // TOOL 8: YOUTUBE SEARCH
  if (cmd.includes("youtube search")) {
    const q = prompt.replace(/youtube search/i, "").trim();
    JarvisTools.youtubeSearch(q);
    return "Searching YouTube for " + q;
  }

  // TOOL 6: WEATHER
  if (cmd.startsWith("weather")) {
    const city = prompt.replace(/weather/i, "").trim() || "Bengaluru";
    JarvisTools.weather(city);
    return "Checking weather for " + city;
  }

  // TOOL 13: BATTERY
  if (cmd.includes("battery")) {
    return await JarvisTools.battery();
  }

  // TOOL 1: OPEN APP
  if (cmd.startsWith("open ")) {
    const app = prompt.substring(5).trim();
    return JarvisTools.openApp(app);
  }

  // TOOL 2: CALL
  if (cmd.startsWith("call ")) {
    const number = prompt.substring(5).trim();
    JarvisTools.call(number);
    return "Opening phone dialer for " + number;
  }

  // TOOL 3: SMS
  if (cmd.startsWith("sms ") || cmd.startsWith("message ")) {
    const message = prompt.substring(prompt.indexOf(" ") + 1).trim();
    JarvisTools.sms(message);
    return "Opening SMS";
  }

  // TOOL 4: ALARM
  if (cmd.includes("alarm")) {
    JarvisTools.alarm();
    return "Opening alarm clock";
  }

  // TOOL 5: REMINDER
  if (cmd.startsWith("remind ") || cmd.includes("reminder")) {
    JarvisTools.reminder(prompt);
    return "Opening calendar reminder";
  }

  // TOOL 9: MUSIC
  if (cmd.startsWith("play ")) {
    const song = prompt.substring(5).trim();
    JarvisTools.playMusic(song);
    return "Searching music for " + song;
  }

  // TOOL 10: CAMERA
  if (cmd.includes("camera")) {
    JarvisTools.camera();
    return "Opening camera";
  }

  // TOOL 11: GALLERY
  if (cmd.includes("gallery") || cmd.includes("photo")) {
    JarvisTools.gallery();
    return "Opening gallery";
  }

  // TOOL 12: FLASHLIGHT
  if (cmd.includes("flashlight") || cmd.includes("torch")) {
    return JarvisTools.flashlight();
  }

  // TOOL 15: PHONE INFO
  if (cmd.includes("phone info") || cmd.includes("device info")) {
    return JSON.stringify(JarvisTools.phoneInfo(), null, 2);
  }

  // GENERAL AI
  return await callGemini(prompt);
}

// ===== 9. SEND BUTTON =====
sendBtn.addEventListener("click", async () => {
  const text = input.value.trim();

  if (!text) return;

  input.value = "";
  addMessage(text, "user");

  const loading = document.createElement("div");
  loading.className = "msg ai";
  loading.innerText = "J.A.R.V.I.S: Processing...";
  chat.appendChild(loading);
  chat.scrollTop = chat.scrollHeight;

  try {
    const result = await callGeminiWithTools(text);
    loading.innerText = "J.A.R.V.I.S: " + result;
    speak(result);
  } catch (error) {
    loading.innerText = "J.A.R.V.I.S ERROR: " + error.message;
    console.error(error);
  }
});

// Enter key sends
input.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    event.preventDefault();
    sendBtn.click();
  }
});

// ===== 10. CLEAR BUTTON =====
clearBtn.addEventListener("click", () => {
  MEMORY = [];
  saveMemory();
  clearChat();
  addMessage("Memory and chat cleared.", "ai");
});

// ===== 11. MICROPHONE =====
const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {
  const recognition = new SpeechRecognition();

  recognition.lang = "en-IN";
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onstart = () => {
    micBtn.innerText = "🔴";
  };

  recognition.onresult = event => {
    const spokenText = event.results[0][0].transcript;
    input.value = spokenText;
    sendBtn.click();
  };

  recognition.onerror = event => {
    addMessage("Microphone error: " + event.error, "ai");
  };

  recognition.onend = () => {
    micBtn.innerText = "🎤";
  };

  micBtn.addEventListener("click", () => {
    try {
      recognition.start();
    } catch (e) {
    }
  });

} else {
  micBtn.addEventListener("click", () => {
    addMessage("Speech recognition is not supported in this browser.", "ai");
  });
}

// ===== 12. CAMERA BUTTON =====
camBtn.addEventListener("click", () => {
  imgInput.setAttribute("capture", "environment");
  imgInput.setAttribute("accept", "image/*");
  imgInput.click();
});

// ===== 13. GALLERY BUTTON =====
galleryBtn.addEventListener("click", () => {
  imgInput.removeAttribute("capture");
  imgInput.setAttribute("accept", "image/*");
  imgInput.click();
});

// ===== 14. IMAGE ANALYSIS =====
imgInput.addEventListener("change", async () => {
  const file = imgInput.files[0];

  if (!file) return;

  selectedImage = file;

  const prompt = "Describe this image in detail. Answer naturally in English or Kannada.";

  await askGemini(prompt, selectedImage);

  imgInput.value = "";
});

// ===========================================
// J.A.R.V.I.S MOBILE EDITION — 15 TOOLS
// ===========================================

const JarvisTools = {

  // TOOL 1: OPEN ANDROID APPS
  openApp(name) {
    const apps = {
      youtube: "https://youtube.com",
      google: "https://google.com",
      whatsapp: "https://wa.me/",
      chrome: "https://google.com",
      maps: "https://maps.google.com",
      camera: "intent://camera#Intent;scheme=android-app;end"
    };

    const key = name.toLowerCase();

    if (apps[key]) {
      window.location.href = apps[key];
      return "Opening " + name;
    }

    window.location.href =
      "https://www.google.com/search?q=" + encodeURIComponent("open " + name);

    return "Trying to open " + name;
  },

  // TOOL 2: PHONE CALL
  call(number) {
    window.location.href = "tel:" + number;
    return "Opening dialer";
  },

  // TOOL 3: SMS
  sms(message) {
    window.location.href =
      "sms:?body=" + encodeURIComponent(message);
    return "Opening SMS";
  },

  // TOOL 4: ALARM
  alarm() {
    window.location.href =
      "intent:#Intent;action=android.intent.action.SET_ALARM;end";
    return "Opening alarm";
  },

  // TOOL 5: REMINDER
  reminder(message) {
    window.open(
      "https://calendar.google.com/calendar/u/0/r/eventedit?text=" +
      encodeURIComponent(message),
      "_blank"
    );
    return "Opening calendar";
  },

  // TOOL 6: WEATHER
  weather(city) {
    window.open(
      "https://www.google.com/search?q=" +
      encodeURIComponent("weather " + city),
      "_blank"
    );
    return "Checking weather";
  },

  // TOOL 7: GOOGLE SEARCH
  googleSearch(query) {
    window.open(
      "https://www.google.com/search?q=" +
      encodeURIComponent(query),
      "_blank"
    );
    return "Searching Google";
  },

  // TOOL 8: YOUTUBE SEARCH
  youtubeSearch(query) {
    window.open(
      "https://www.youtube.com/results?search_query=" +
      encodeURIComponent(query),
      "_blank"
    );
    return "Searching YouTube";
  },

  // TOOL 9: MUSIC
  playMusic(song) {
    window.open(
      "https://www.youtube.com/results?search_query=" +
      encodeURIComponent(song + " song"),
      "_blank"
    );
    return "Searching music";
  },

  // TOOL 10: CAMERA
  camera() {
    imgInput.setAttribute("capture", "environment");
    imgInput.click();
    return "Opening camera";
  },

  // TOOL 11: GALLERY
  gallery() {
    imgInput.removeAttribute("capture");
    imgInput.click();
    return "Opening gallery";
  },

  // TOOL 12: FLASHLIGHT
  flashlight() {
    alert("Flashlight control is not supported by this browser. It requires native Android permission access.");
    return "Flashlight requires Android integration";
  },

  // TOOL 13: BATTERY
  async battery() {
    if (!navigator.getBattery) {
      return "Battery information unavailable in this browser.";
    }

    const b = await navigator.getBattery();

    return "Battery: " + Math.round(b.level * 100) + "%" +
      (b.charging ? " — Charging" : " — Not charging");
  },

  // TOOL 14: DATE AND TIME
  dateTime() {
    return new Date().toLocaleString();
  },

  // TOOL 15: PHONE INFORMATION
  phoneInfo() {
    return {
      device: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      online: navigator.onLine
    };
  }

};

// Make tools accessible
window.JarvisTools = JarvisTools;

console.log("JARVIS: 15 tools loaded successfully.");
