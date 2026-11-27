
 // ===== 1. API KEY =====
let API_KEY = localStorage.getItem('jarvis_key');
if (!API_KEY) {
  API_KEY = prompt('Enter your Gemini API Key:');
  if (API_KEY) localStorage.setItem('jarvis_key', API_KEY);
}

const MODELS = ["gemini-3.6-flash", "gemini-flash-latest"];

// ===== 2. MEMORY =====
let MEMORY = JSON.parse(localStorage.getItem('jarvis_memory') || '[]');

function saveMemory() {
  localStorage.setItem('jarvis_memory', JSON.stringify(MEMORY));
}

const chat = document.getElementById('chat');
const input = document.getElementById('msg');
const micBtn = document.getElementById('mic-btn');
const clearBtn = document.getElementById('clear-btn');
const camBtn = document.getElementById('cam-btn');
const imgInput = document.getElementById('img-input');
const sendBtn = document.getElementById('send-btn');

MEMORY.forEach(m => add((m.role === 'user' ? 'YOU: ' : 'J.A.R.V.I.S: ') + m.text, m.role === 'user' ? 'user' : 'ai'));

// ===== 3. GEMINI BRAIN =====
async function callGemini(p) {
 // ===== JARVIS LOCAL TOOL ROUTER =====
const cmd = p.toLowerCase();

if (
  cmd.includes("time") ||
  cmd.includes("date")
) {
  return JarvisTools.dateTime();
}
 // GOOGLE SEARCH
if (cmd.includes("google search")) {
  const q = p.replace(/google search/i, "").trim();
  JarvisTools.googleSearch(q);
  return "Searching Google for " + q;
}

// YOUTUBE SEARCH
if (cmd.includes("youtube search")) {
  const q = p.replace(/youtube search/i, "").trim();
  JarvisTools.youtubeSearch(q);
  return "Searching YouTube for " + q;
}

// WEATHER
if (cmd.startsWith("weather")) {
  const city = p.replace(/weather/i, "").trim() || "Bengaluru";
  JarvisTools.weather(city);
  return "Checking weather for " + city;
}

// BATTERY
if (cmd.includes("battery")) {
  return await JarvisTools.battery();
}
  const contents = MEMORY.slice(-12).map(m => ({
    role: m.role,
    parts: [{ text: m.text }]
  }));

  contents.push({ role: 'user', parts: [{ text: p }] });

  let lastErr;

  for (const m of MODELS) {
    try {
      const res = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/' + m + ':generateContent?key=' + API_KEY,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: contents })
        }
      );

      const data = await res.json();

      if (data.error) {
        lastErr = new Error(data.error.message);
        if (/high demand|temporar|quota|rate|unavailable|deprecated/i.test(data.error.message)) continue;
        throw lastErr;
      }

      return data.candidates[0].content.parts[0].text;
    } catch (e) {
      lastErr = e;
    }
  }

  throw lastErr;
}

async function askGemini(p) {
  add('J.A.R.V.I.S: Thinking...', 'ai');

  try {
    const reply = await callGemini(p);
    MEMORY.push({ role: 'user', text: p });
    MEMORY.push({ role: 'model', text: reply });
    saveMemory();

    chat.lastChild.innerText = 'J.A.R.V.I.S: ' + reply;
    speak(reply);
  } catch (e) {
    chat.lastChild.innerText = 'J.A.R.V.I.S: ERROR - ' + e.message;
  }
}

// ===== 4. VISION (EYES) =====
camBtn.onclick = () => imgInput.click();

imgInput.onchange = () => {
  const file = imgInput.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = () => {
    const base64 = reader.result.split(',')[1];
    const q = input.value.trim() || 'What do you see? Describe in Kannada. You may mix Kannada and English naturally.';
    add('YOU: [IMAGE] ' + q, 'user');
    input.value = '';
    askVision(base64, file.type, q);
  };

  reader.readAsDataURL(file);
};

async function askVision(base64, mime, q) {
  add('J.A.R.V.I.S: Analyzing image...', 'ai');

  let lastErr;

  for (const m of MODELS) {
    try {
      const res = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/' + m + ':generateContent?key=' + API_KEY,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: q },
                {
                  inline_data: {
                    mime_type: mime,
                    data: base64
                  }
                }
              ]
            }]
          })
        }
      );

      const data = await res.json();

      if (data.error) {
        lastErr = new Error(data.error.message);
        if (/high demand|temporar|quota|rate|unavailable|deprecated/i.test(data.error.message)) continue;
        throw lastErr;
      }

      const reply = data.candidates[0].content.parts[0].text;
      chat.lastChild.innerText = 'J.A.R.V.I.S: ' + reply;
      speak(reply);
      return;
    } catch (e) {
      lastErr = e;
    }
  }

  chat.lastChild.innerText = 'J.A.R.V.I.S: ERROR - ' + lastErr.message;
}

// ===== 5. SPEECH & UTILS =====
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
const rec = new SR();
rec.lang = 'en-US';

rec.onresult = (e) => {
  const t = e.results[0][0].transcript;
  add('YOU: ' + t, 'user');
  askGemini(t);
};

micBtn.onclick = () => {
  rec.start();
  micBtn.innerText = 'LISTENING...';
};

rec.onend = () => {
  micBtn.innerText = '🎙️';
};

let voices = [];

function loadVoices() {
  voices = speechSynthesis.getVoices();
}

loadVoices();
speechSynthesis.onvoiceschanged = loadVoices;

function speak(t) {
  const u = new SpeechSynthesisUtterance(t);
  u.rate = 1.05;
  u.pitch = 0.85;

  const v = voices.find(v => v.lang.startsWith('en'));
  if (v) u.voice = v;

  speechSynthesis.speak(u);
}

document.getElementById('send').onclick = () => {
  const t = input.value.trim();
  if (!t) return;

  add('YOU: ' + t, 'user');
  input.value = '';
  askGemini(t);
};

clearBtn.onclick = () => {
  MEMORY = [];
  saveMemory();
  chat.innerHTML = '';
  add('SYSTEM: Memory cleared.', 'ai');
};

function add(t, w) {
  const d = document.createElement('div');
  d.className = 'msg ' + w;
  d.innerText = t;
  chat.appendChild(d);
  chat.scrollTop = chat.scrollHeight;
}


// =====================================
// JARVIS MOBILE EDITION - 15 TOOLS
// =====================================

const JarvisTools = {

  // 1. Open Android applications
  openApp(name) {
    const apps = {
      youtube: "https://youtube.com",
      google: "https://google.com",
      whatsapp: "https://wa.me/",
      chrome: "https://google.com",
      maps: "https://maps.google.com",
      camera: "intent://camera#Intent;scheme=android-app;end"
    };
    if (apps[name.toLowerCase()]) {
      window.location.href = apps[name.toLowerCase()];
      return "Opening " + name;
    }
    return "App not configured";
  },

  // 2. Phone call
  call(number) {
    window.location.href = "tel:" + number;
  },

  // 3. Send SMS
  sms(number, message) {
    window.location.href =
      "sms:" + number + "?body=" +
      encodeURIComponent(message);
  },

  // 4. Set alarm (Android clock intent)
  alarm() {
    window.location.href =
      "intent:#Intent;action=android.intent.action.SET_ALARM;end";
  },

  // 5. Set reminder
  reminder(message) {
    window.location.href =
      "https://calendar.google.com/calendar/u/0/r/eventedit?text=" +
      encodeURIComponent(message);
  },

  // 6. Weather
  weather(city) {
    window.open(
      "https://www.google.com/search?q=weather+" +
      encodeURIComponent(city), "_blank"
    );
  },

  // 7. Google search
  googleSearch(query) {
  window.location.href =
    "https://www.google.com/search?q=" +
    encodeURIComponent(query);
},
  },

  // 8. YouTube search
  youtubeSearch(query) {
  window.location.href =
    "https://www.youtube.com/results?search_query=" +
    encodeURIComponent(query);
},
  },

  // 9. Music player
  playMusic(song) {
    window.open(
      "https://www.youtube.com/results?search_query=" +
      encodeURIComponent(song + " song"), "_blank"
    );
  },

  // 10. Camera
  camera() {
    window.location.href =
      "intent:#Intent;action=android.media.action.IMAGE_CAPTURE;end";
  },

  // 11. Gallery
  gallery() {
    window.location.href =
      "intent:#Intent;action=android.intent.action.GET_CONTENT;type=image/*;end";
  },

  // 12. Flashlight (browser support varies)
  flashlight() {
    alert("Flashlight requires Android app permission/API integration.");
  },

  // 13. Battery status
  async battery() {
    if (!navigator.getBattery) {
      return "Battery information unavailable";
    }
    const b = await navigator.getBattery();
    return "Battery: " + Math.round(b.level * 100) + "%";
  },

  // 14. Date and time
  dateTime() {
    return new Date().toLocaleString();
  },

  // 15. Phone information
  phoneInfo() {
    return {
      device: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language
    };
  }
};

// Make tools accessible to JARVIS
window.JarvisTools = JarvisTools;

console.log("JARVIS: 15 tools loaded successfully.");
