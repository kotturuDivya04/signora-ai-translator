// ===========================================================
// SIGNORA — Sign to Speech (FINAL UNIFIED VERSION)
// Static letters + Motion words → Sentence → Pause → Speech
// Static CSV + Motion CSV INCLUDED
// ===========================================================

// ================= GLOBAL FLAGS =================
let isCollecting = false;
let suppressPredictionUI = false;
const MAX_MOTION_FRAMES = 30;
let motionFrameCount = 0; 
let stillFrameCounter = 0;   // 🔑 counts how many continuous still frames
 

// ================= STABILITY =================
let lastDetectedHandCount = null;
let handCountStableSince = 0;

// ================= THRESHOLDS =================
const HAND_STABILITY_TIME = 300;
const STATIC_MOTION_THRESHOLD = 0.05;
const STATIC_TIME_REQUIRED = 500;
const SPEAK_DELAY = 1500;

// ================= HTML =================
const videoElement = document.getElementById("camera");
const canvasElement = document.getElementById("overlay");
const canvasCtx = canvasElement.getContext("2d");

const recordBtn = document.getElementById("recordBtn");
const staticStopBtn = document.getElementById("staticStopBtn");
const downloadBtn = document.getElementById("downloadBtn");
const labelSelect = document.getElementById("labelSelect");
const predictionText = document.getElementById("prediction");
const motionCounter = document.getElementById("motionCounter");


// ================= MEDIAPIPE =================
let camera = null;
let hands = null;
let latestLandmarks = null;

// ================= STATIC CSV =================
let collectedSamples = [];
let staticSampleCount = 0;

// ================= PREDICTION STATE =================
let lastLandmarksSnapshot = null;
let handStaticSince = 0;
let predictionLocked = false;

// ================= SENTENCE BUFFER =================
let currentWord = "";
let sentenceBuffer = "";
let lastPredictedSign = null;

let handWasPresent = false;
let handRemovedTime = null;
let sentenceSpoken = false;

// ================= MOTION DATA =================
let isMotionRecording = false;
let currentMotionFrames = [];
let allMotionClips = [];
let motionLabel = "";
// 🔊 Ensure voices are loaded (FIX for Hindi/Telugu/Tamil)
let availableVoices = [];

speechSynthesis.onvoiceschanged = () => {
  availableVoices = speechSynthesis.getVoices();
};

// ===========================================================
// 1️⃣ MEDIAPIPE SETUP
// ===========================================================
function setupMediaPipe() {
  hands = new Hands({
    locateFile: file =>
      `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
  });

  hands.setOptions({
    selfieMode: true,
    maxNumHands: 2,
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.7,
  });

  hands.onResults(onResults);
}

// ===========================================================
// 2️⃣ CAMERA START
// ===========================================================
async function startCamera() {
  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  videoElement.srcObject = stream;

  videoElement.addEventListener("loadedmetadata", () => {
    canvasElement.width = videoElement.videoWidth;
    canvasElement.height = videoElement.videoHeight;
  });

  camera = new Camera(videoElement, {
    onFrame: async () => {
      await hands.send({ image: videoElement });
    },
    width: 640,
    height: 480,
  });

  camera.start();
}

// ===========================================================
// 3️⃣ MEDIAPIPE RESULTS
// ===========================================================
function onResults(results) {
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

  latestLandmarks = null;

  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    handWasPresent = true;

    latestLandmarks =
      results.multiHandLandmarks.length === 1
        ? results.multiHandLandmarks[0]
        : [
            ...results.multiHandLandmarks[0],
            ...results.multiHandLandmarks[1],
          ];

    results.multiHandLandmarks.forEach(hand => {
      hand.forEach(pt => {
        canvasCtx.beginPath();
        canvasCtx.arc(
          pt.x * canvasElement.width,
          pt.y * canvasElement.height,
          4, 0, Math.PI * 2
        );
        canvasCtx.fillStyle = "#00FF00";
        canvasCtx.fill();
      });
    });

  } else {
    // ---- HAND REMOVED → FINALIZE WORD ----
   if (handWasPresent && currentWord.length > 0) {
  sentenceBuffer += currentWord + " ";
  currentWord = "";

  handRemovedTime = Date.now();
  sentenceSpoken = false;
  lastPredictedSign = null; // 🔑 allows PLEASE, HELP, etc.
}


   handWasPresent = false;
latestLandmarks = null;
predictionLocked = false;

// 🔑 FULL RESET when hand removed
mode = "STATIC";
suppressStatic = false;
currentMotionFrames = [];
motionFrameCount = 0;
motionStartCounter = 0;
motionSent = false;

if (motionCounter) motionCounter.innerText = "";

  }
}

// ===========================================================
// 4️⃣ MOTION CALCULATION
// ===========================================================
function calculateMotion(curr, prev) {
  if (!prev) return Infinity;
  let sum = 0;
  for (let i = 0; i < curr.length; i++) {
    sum += Math.abs(curr[i] - prev[i]);
  }
  return sum / curr.length;
}

// ===========================================================
// 5️⃣ STATIC + MOTION LIVE PREDICTION (STRICT NO-OVERFLOW VERSION)
// ===========================================================

let mode = "STATIC";              // "STATIC" or "MOTION"
let motionStartCounter = 0;
let suppressStatic = false;
let motionSent = false;          // 🔑 prevents double sending

setInterval(async () => {

  // ---------------- BASIC SAFETY ----------------
  if (isCollecting || suppressPredictionUI) return;
  if (!latestLandmarks) return;

  const flat = [];
  latestLandmarks.forEach(pt => flat.push(pt.x));
  latestLandmarks.forEach(pt => flat.push(pt.y));

  const handCount = flat.length === 84 ? 2 : 1;

  // ---------------- HAND COUNT STABILITY ----------------
  if (handCount !== lastDetectedHandCount) {
    lastDetectedHandCount = handCount;
    handCountStableSince = Date.now();
    handStaticSince = 0;
    lastLandmarksSnapshot = null;
    predictionLocked = false;

    // Hard reset
    mode = "STATIC";
    suppressStatic = false;
    currentMotionFrames = [];
    motionFrameCount = 0;
    motionStartCounter = 0;
    motionSent = false;
    lastLandmarksSnapshot = null;   // 🔑 ADD THIS

    if (motionCounter) motionCounter.innerText = "";
    return;
  }

  if (Date.now() - handCountStableSince < HAND_STABILITY_TIME) {
    lastLandmarksSnapshot = flat;
    return;
  }

  // ---------------- MOTION VALUE ----------------
  const motion = calculateMotion(flat, lastLandmarksSnapshot);
  lastLandmarksSnapshot = flat;

  // =======================================================
  // ===================== MOTION MODE =====================
  // =======================================================

  if (mode === "MOTION") {

    // 🔒 If already sent, DO NOTHING until reset by static
    if (motionSent) {
      return;
    }

    // 🔹 Collect ONLY if less than 30
    if (currentMotionFrames.length < MAX_MOTION_FRAMES) {
      currentMotionFrames.push(flat);
      motionFrameCount = currentMotionFrames.length;

      if (motionCounter) {
        motionCounter.innerText = `Motion frames: ${motionFrameCount} / 30`;
      }

      return; // 🔴 never go to static here
    }

    // 🔥 EXACTLY 30 FRAMES → SEND ONCE
    if (currentMotionFrames.length === MAX_MOTION_FRAMES && !motionSent) {

      motionSent = true;   // 🔑 block further sending immediately

      const flatMotion = [];
      for (let f = 0; f < MAX_MOTION_FRAMES; f++) {
        flatMotion.push(...currentMotionFrames[f]);
      }

      try {
        const res = await fetch("/predict", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            landmarks: flatMotion,
            handCount: 1,
            isMotion: true
          })
        });

        const data = await res.json();

        if (data.prediction) {
          predictionText.innerText = data.prediction;
          pushMotionWord(data.prediction);
        }

      } catch (e) {
        console.log("Motion error:", e);
      }

      // 🔁 RESET TO STATIC MODE (HARD RESET)
      mode = "STATIC";
      suppressStatic = false;
      currentMotionFrames = [];
      motionFrameCount = 0;
      motionStartCounter = 0;
      motionSent = false;
      handStaticSince=0;
      predictionLocked=false;
      lastLandmarksSnapshot = null;   // 🔑 prevent false motion after reset
      if (motionCounter) motionCounter.innerText = "";

      return; // 🔴 exit after motion
    }

    return; // stay in motion mode
  }

  // =======================================================
  // ===================== STATIC MODE =====================
  // =======================================================
// 🔹 Detect real motion start (ignore noise)

// If motion is above threshold → count it
if (motion > STATIC_MOTION_THRESHOLD) {
  motionStartCounter++;
} else {
  // If hand is still → reset counter
  motionStartCounter = 0;
}

// 🔥 Switch to MOTION MODE only after 2 strong frames
if (motionStartCounter >= 2) {
  mode = "MOTION";
  suppressStatic = true;

  currentMotionFrames = [];
  motionFrameCount = 0;
  motionStartCounter = 0;
  motionSent = false;

  // 🔑 Clear unfinished static word so motion is clean
  currentWord = "";
  sentenceBuffer = "";   // 🔑 ADD THIS
  lastPredictedSign = null;
  handStaticSince = 0;
  predictionLocked = false;

  if (motionCounter) {
    motionCounter.innerText = `Motion frames: 0 / 30`;
  }

  return;
}


// ---------------- STATIC PREDICTION ----------------
if (mode === "MOTION") return;
if (suppressStatic) return;

// 🔑 Strong filter: require continuous stillness

if (motion < STATIC_MOTION_THRESHOLD) {
  stillFrameCounter++;   // count still frames
} else {
  stillFrameCounter = 0;
  handStaticSince = 0;  // reset timer
  return;              // block static
}

// 🔑 Require at least 5 continuous still frames (~1 sec at 200ms)
if (stillFrameCounter < 3) return;

if (!handStaticSince) handStaticSince = Date.now();
if (Date.now() - handStaticSince < STATIC_TIME_REQUIRED) return;
if (predictionLocked) return;

  try {
    const res = await fetch("/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        landmarks: flat,
        handCount: handCount,
        isMotion: false
      })
    });

    const data = await res.json();
    if (!data.prediction) return;

  if (!handRemovedTime) {
  predictionText.innerText = data.prediction;
}



    if (data.prediction !== lastPredictedSign) {
      currentWord += data.prediction;
      lastPredictedSign = data.prediction;
    }

    predictionLocked = true;

    setTimeout(() => {
      predictionLocked = false;
    }, 400);

    handStaticSince = 0;

  } catch {
    predictionText.innerText = "Error";
  }

}, 200);
// ===========================================================
// 6️⃣ PUSH MOTION WORD (CALL FROM MOTION MODEL)
// ===========================================================
function pushMotionWord(word) {
  if (!word) return;
// 👀 Show ENGLISH word only
predictionText.innerText = word;

// 🧠 English buffer
sentenceBuffer += word + " ";
handRemovedTime = Date.now();
sentenceSpoken = false;
lastPredictedSign = null;
}


let selectedLanguage = "en";

const languageSelect = document.getElementById("languageSelect");
if (languageSelect) {
  languageSelect.addEventListener("change", e => {
    selectedLanguage = e.target.value;
  });
}


// ===========================================================
// 🌐 MULTILINGUAL SENTENCE TRANSLATIONS
// ===========================================================
const SENTENCE_TRANSLATIONS = {
  "Thank you": {
    hi: "धन्यवाद",
    te: "ధన్యవాదాలు",
    ta: "நன்றி"
  },
  "I am sorry": {
    hi: "मुझे माफ़ करें",
    te: "క్షమించండి",
    ta: "மன்னிக்கவும்"
  },
  "How are you?": {
    hi: "आप कैसे हैं?",
    te: "మీరు ఎలా ఉన్నారు?",
    ta: "நீங்கள் எப்படி இருக்கிறீர்கள்?"
  },
  "Are you okay now?": {
    hi: "क्या आप अभी ठीक हैं?",
    te: "మీరు ఇప్పుడు బాగున్నారా?",
    ta: "நீங்கள் இப்போது நலமாக இருக்கிறீர்களா?"
  },
  "I am okay": {
    hi: "मैं ठीक हूँ",
    te: "నేను బాగున్నాను",
    ta: "நான் நன்றாக இருக்கிறேன்"
  },
  "My name is": {
    hi: "मेरा नाम है",
    te: "నా పేరు",
    ta: "என் பெயர்"
  },
  "What is your name?": {
    hi: "आपका नाम क्या है?",
    te: "మీ పేరు ఏమిటి?",
    ta: "உங்கள் பெயர் என்ன?"
  },
  "I need water": {
    hi: "मुझे पानी चाहिए",
    te: "నాకు నీరు కావాలి",
    ta: "எனக்கு தண்ணீர் வேண்டும்"
  },
  "Do you need water?": {
    hi: "क्या आपको पानी चाहिए?",
    te: "మీకు నీరు కావాలా?",
    ta: "உங்களுக்கு தண்ணீர் வேண்டுமா?"
  },
  "I want food": {
    hi: "मुझे खाना चाहिए",
    te: "నాకు భోజనం కావాలి",
    ta: "எனக்கு உணவு வேண்டும்"
  },
  "Do you want food?": {
    hi: "क्या आपको खाना चाहिए?",
    te: "మీకు భోజనం కావాలా?",
    ta: "உங்களுக்கு உணவு வேண்டுமா?"
  },
  "I need help": {
    hi: "मुझे मदद चाहिए",
    te: "నాకు సహాయం కావాలి",
    ta: "எனக்கு உதவி வேண்டும்"
  },
  "How can I help you?": {
    hi: "मैं आपकी कैसे मदद कर सकता हूँ?",
    te: "నేను మీకు ఎలా సహాయం చేయగలను?",
    ta: "நான் உங்களுக்கு எப்படி உதவலாம்?"
  },
  "Please wait": {
    hi: "कृपया प्रतीक्षा करें",
    te: "దయచేసి వేచి ఉండండి",
    ta: "தயவுசெய்து காத்திருங்கள்"
  },
  "Please come here": {
    hi: "कृपया यहाँ आइए",
    te: "దయచేసి ఇక్కడికి రండి",
    ta: "தயவுசெய்து இங்கே வாருங்கள்"
  },
  "I want to go": {
    hi: "मैं जाना चाहता हूँ",
    te: "నేను వెళ్లాలనుకుంటున్నాను",
    ta: "நான் போக விரும்புகிறேன்"
  },
  "Do you want to go?": {
    hi: "क्या आप जाना चाहते हैं?",
    te: "మీరు వెళ్లాలనుకుంటున్నారా?",
    ta: "நீங்கள் போக விரும்புகிறீர்களா?"
  }
 


};
// ===========================================================
// 🌐 WORD TRANSLATIONS (STATIC + MOTION)
// ===========================================================
const WORD_TRANSLATIONS = {
  "HELP": { hi: "मदद", te: "సహాయం", ta: "உதவி" },
  "WATER": { hi: "पानी", te: "నీరు", ta: "தண்ணீர்" },
  "FOOD": { hi: "खाना", te: "భోజనం", ta: "உணவு" },
  "PLEASE": { hi: "कृपया", te: "దయచేసి", ta: "தயவுசெய்து" },
  "GO": { hi: "जाओ", te: "వెళ్ళు", ta: "போ" },
  "COME": { hi: "आओ", te: "రండి", ta: "வா" },
  "WAIT": { hi: "रुको", te: "ఆగండి", ta: "காத்திரு" },
  "STOP": { hi: "रुको", te: "ఆపు", ta: "நిల్లు" },
  "YES": { hi: "हाँ", te: "అవును", ta: "ஆம்" },
  "NO": { hi: "नहीं", te: "కాదు", ta: "இல்லை" },

  // 🔹 Added missing words
  "WANT": { hi: "चाहिए", te: "కావాలి", ta: "வேண்டும்" },
  "HOW": { hi: "कैसे", te: "ఎలా", ta: "எப்படி" },
  "WHAT": { hi: "क्या", te: "ఏమి", ta: "என்ன" },
  "NAME": { hi: "नाम", te: "పేరు", ta: "பெயர்" },
  "ME": { hi: "मुझे", te: "నాకు", ta: "எனக்கு" },
  "NOW": { hi: "अभी", te: "ఇప్పుడు", ta: "இப்போது" },
  "HI": { hi: "नमस्ते", te: "హాయ్", ta: "வணக்கம்" },
  "SORRY": { hi: "माफ़ करें", te: "క్షమించండి", ta: "மன்னிக்கவும்" },
  "YOU": { hi: "आप", te: "మీరు", ta: "நீங்கள்" },
  "HOPE": { hi: "आशा", te: "ఆశ", ta: "நம்பிக்கை" },
  "OKAY": { hi: "ठीक है", te: "సరే", ta: "சரி" }
};


// ===========================================================
// 🌐 TRANSLATION HELPER (SAFE FALLBACK)
// ===========================================================
function translateSentence(sentence) {
  if (selectedLanguage === "en") return sentence;

  // 🔑 try exact match first
  if (
    SENTENCE_TRANSLATIONS[sentence] &&
    SENTENCE_TRANSLATIONS[sentence][selectedLanguage]
  ) {
    return SENTENCE_TRANSLATIONS[sentence][selectedLanguage];
  }

  // 🔑 fallback: case-insensitive match WITHOUT changing sentence
  const key = Object.keys(SENTENCE_TRANSLATIONS).find(
    k => k.toLowerCase() === sentence.toLowerCase()
  );

  if (key && SENTENCE_TRANSLATIONS[key][selectedLanguage]) {
    return SENTENCE_TRANSLATIONS[key][selectedLanguage];
  }

  // fallback → English
  return sentence;
}

// ===========================================================
// 🌐 WORD TRANSLATION HELPER (SAFE FALLBACK)
// ===========================================================
function translateWord(word) {
  if (selectedLanguage === "en") return word;

  const key = word.toUpperCase();

  if (
    WORD_TRANSLATIONS[key] &&
    WORD_TRANSLATIONS[key][selectedLanguage]
  ) {
    return WORD_TRANSLATIONS[key][selectedLanguage];
  }

  // 🔑 fallback (A, B, DIVYA, unknown words)
  return word;
}


// ===========================================================
// 🔹 RULE-BASED INFERENCE ENGINE
// ===========================================================
function inferSentence(rawSentence) {
  const text = rawSentence.trim().toUpperCase();

  const hasI = text.includes("I") || text.includes("ME");
  const hasYou = text.includes("YOU");

  if (text.includes("THANK")) return "Thank you";
  if (text.includes("SORRY")) return "I am sorry";

  if (text.includes("HOW") && hasYou) return "How are you?";
  if (text.includes("OKAY") && hasYou) return "Are you okay now?";
  if (text.includes("OKAY") && hasI) return "I am okay";
  if (text.includes("HOPE") && hasYou) return "Hope you are okay?";

  if (text.includes("NAME")) {
    if (hasYou) return "What is your name?" ;
    if(hasI) return "My Name Is";
  }

  if (text.includes("WATER")) {
    if (hasI) return "I need water";
    if (hasYou) return "Do you need water?";
    return "I need water";
  }

  if (text.includes("FOOD")) {
    if (hasI) return "I want food";
    if (hasYou) return "Do you want food?";
    return "Do you want food?";
  }

  if (text.includes("HELP")) {
    if (hasI) return "I need help";
    if (hasYou && text.includes("ME")) return "Do you want me to help?";
    if (hasYou) return "How can I help you?";
    return "Please help me";
  }

  if (text.includes("WHAT") && text.includes("WANT")) {
    return "What do you want?";
  }

  if (text.includes("GO")) {
    if (hasI && text.includes("NOW")) return "I want to go now";
    if (hasYou && text.includes("NOW")) return "Do you want to go now?";
    if (hasI) return "I want to go";
    return "Do you want to go?";
  }

  if (text.includes("COME")) {
    if (hasYou && text.includes("NOW")) return "Can you come now?";
    if (hasYou) return "Can you come?";
    return "Please come here";
  }

  if (text.includes("WAIT")) {
    if (text.includes("NOW")) return "Should I wait now?";
    return "Please wait";
  }

  return rawSentence; // 🔑 fallback (DIVYA, names, unknowns)
}
// ===========================================================
// 7️⃣ FINAL OUTPUT AFTER PAUSE (INFERENCE FIRST, THEN WORDS)
// ===========================================================
setInterval(() => {
  if (mode === "MOTION") return; 
  if (!sentenceBuffer || sentenceSpoken || !handRemovedTime) return;

  if (Date.now() - handRemovedTime > SPEAK_DELAY) {

    // 🔹 Raw ENGLISH sentence from buffer
    const rawSentence = sentenceBuffer.trim();

    // 🔹 ALWAYS try inference first
    const inferredSentence = inferSentence(rawSentence);

    let finalOutput = "";

    // 🔹 If inference actually changed meaning → use it
    if (inferredSentence !== rawSentence) {
      finalOutput =
        selectedLanguage === "en"
          ? inferredSentence
          : translateSentence(inferredSentence);
    }
    // 🔹 Else → fallback to word-by-word translation
    else {
      if (selectedLanguage === "en") {
        finalOutput = rawSentence;
      } else {
        finalOutput = rawSentence
          .split(" ")
          .map(w => translateWord(w))
          .join(" ");
      }
    }

    // 1️⃣ Show English first
predictionText.innerText = inferredSentence;

// 2️⃣ Replace with selected language
setTimeout(() => {
  const translated =
    selectedLanguage === "en"
      ? inferredSentence
      : (inferredSentence !== rawSentence
          ? translateSentence(inferredSentence)
          : inferredSentence
              .split(" ")
              .map(w => translateWord(w))
              .join(" "));

  predictionText.innerText = translated;
  speakPrediction(translated);
}, 150);

    // 🔁 Reset
    sentenceBuffer = "";
    currentWord = "";
    lastPredictedSign = null;
    handRemovedTime = null;
    sentenceSpoken = true;
  }
}, 300);


// ===========================================================
// 🔊 TEXT TO SPEECH (MULTILINGUAL)
// ===========================================================
function speakPrediction(text) {
  if (!text) return;

  const u = new SpeechSynthesisUtterance(text);

  // language code
  let langCode = "en-IN";
  if (selectedLanguage === "hi") langCode = "hi-IN";
  else if (selectedLanguage === "te") langCode = "te-IN";
  else if (selectedLanguage === "ta") langCode = "ta-IN";

  u.lang = langCode;

  // 🔑 Get fresh voices list (important)
 const voices = availableVoices.length
  ? availableVoices
  : speechSynthesis.getVoices();


  let voice = null;

  // 1️⃣ Exact match first
  voice = voices.find(v => v.lang === langCode);

  // 2️⃣ Fallback by language prefix
  if (!voice && selectedLanguage === "hi") {
    voice = voices.find(v => v.lang.toLowerCase().startsWith("hi"));
  }

  if (!voice && selectedLanguage === "te") {
    voice = voices.find(v => v.lang.toLowerCase().startsWith("te"));
  }

  if (!voice && selectedLanguage === "ta") {
    voice = voices.find(v => v.lang.toLowerCase().startsWith("ta"));
  }

  // 3️⃣ Final fallback → English voice
  if (!voice) {
    voice = voices.find(v => v.lang.startsWith("en"));
    u.lang = "en-IN";  // avoid silent speech
  }

  if (voice) {
    u.voice = voice;
    console.log("Using voice:", voice.lang, voice.name);
  } else {
    console.warn("No suitable voice found, using default");
  }

  speechSynthesis.speak(u);
}



// ===========================================================
// 8️⃣ STATIC CSV DOWNLOAD
// ===========================================================
recordBtn.addEventListener("click", () => {
  if (!latestLandmarks) return alert("❌ No hand detected");

  const row = [labelSelect.value];
  latestLandmarks.forEach(lm => row.push(lm.x));
  latestLandmarks.forEach(lm => row.push(lm.y));

  collectedSamples.push(row);
  staticSampleCount++;
  predictionText.innerText = `📥 Static samples: ${staticSampleCount}`;
});

staticStopBtn.addEventListener("click", () => {
  staticSampleCount = 0;
  predictionText.innerText = "✅ Static recording stopped";
});

downloadBtn.addEventListener("click", () => {
  if (!collectedSamples.length) return alert("No samples");

  const header = ["label"];
  for (let i = 0; i < collectedSamples[0].length - 1; i++) {
    header.push(`p${i}`);
  }

  const rows = [header, ...collectedSamples];
  const csv = rows.map(r => r.join(",")).join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "static_dataset.csv";
  a.click();
});

// ===========================================================
// 9️⃣ MOTION CSV DOWNLOAD (UNCHANGED)
// ===========================================================
function startMotion(label) {
  isMotionRecording = true;
  motionLabel = label;
  currentMotionFrames = [];
}

function stopMotion() {
  if (!currentMotionFrames.length) return alert("❌ No motion recorded");

  allMotionClips.push({
    label: motionLabel,
    frames: currentMotionFrames
  });

  isMotionRecording = false;
}

function downloadMotionCSV() {
  if (!allMotionClips.length) return alert("❌ No motion samples");

  const rows = [];
  const featureCount = allMotionClips[0].frames[0].length;

  const header = ["label"];
  for (let f = 0; f < MAX_MOTION_FRAMES; f++) {
    for (let i = 0; i < featureCount; i++) {
      header.push(`f${f}_${i}`);
    }
  }
  rows.push(header);

  allMotionClips.forEach(clip => {
    const row = [clip.label];
    for (let f = 0; f < MAX_MOTION_FRAMES; f++) {
      if (f < clip.frames.length) row.push(...clip.frames[f]);
      else row.push(...Array(featureCount).fill(0));
    }
    rows.push(row);
  });

  const csv = rows.map(r => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "motion_dataset.csv";
  a.click();
}
