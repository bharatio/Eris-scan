/* =====================================================
   ERIS SCAN – ADVANCED APP LOGIC
   QR SCANNER + HISTORY + SMART LINKS + FLASH + IMAGE SCAN + OCR
   ===================================================== */

let lastScan = "";
let historyList = [];
let scanner = null;
let flashOn = false;

/* ================= ELEMENTS ================= */

const resultBox        = document.getElementById("result");
const openBtn          = document.getElementById("openLink");
const copyBtn          = document.getElementById("copyText");
const shareBtn         = document.getElementById("shareBtn");
const historyContainer = document.getElementById("history");
const scanBtn          = document.getElementById("scanBtn");
const historyBtn       = document.getElementById("historyBtn");
const settingsBtn      = document.getElementById("settingsBtn");
const flashBtn         = document.getElementById("flashBtn");
const imageBtn         = document.getElementById("imageBtn");
const clearBtn         = document.getElementById("clearHistory");
const imageInput       = document.getElementById("imageScan");
const scannerSection   = document.querySelector(".camera-section");
const historySection   = document.querySelector(".history-section");
const translateBar     = document.getElementById("translateBar");
const fromLangBox      = document.getElementById("fromLang");   /* ✅ source language display */
const toLangBox        = document.getElementById("toLang");     /* ✅ target language display */

/* =====================================================
   SMART TYPE DETECTION
   ===================================================== */

function detectType(text) {
    text = text.trim();

    let phone = text.match(/\+?[0-9]{7,15}/);
    if (phone) return { type: "phone", value: phone[0] };

    let url = text.match(/https?:\/\/[^\s]+/);
    if (url) return { type: "url", value: url[0] };

    let email = text.match(/[a-zA-Z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/);
    if (email) return { type: "email", value: email[0] };

    let upi = text.match(/[a-zA-Z0-9.\-_]+@[a-zA-Z]+/);
    if (upi) return { type: "upi", value: upi[0] };

    return { type: "text", value: text };
}

/* =====================================================
   HISTORY — LOAD / SAVE / ADD / CLEAR / RENDER
   ===================================================== */

function loadHistory() {
    let saved = localStorage.getItem("scanHistory");
    if (saved) {
        historyList = JSON.parse(saved);
        renderHistory();
    }
}

function saveHistory() {
    localStorage.setItem("scanHistory", JSON.stringify(historyList));
}

function addHistory(text) {
    historyList.unshift({ text, time: new Date().toLocaleString() });
    if (historyList.length > 30) historyList.pop();
    saveHistory();
    renderHistory();
}

if (clearBtn) {
    clearBtn.onclick = function () {
        historyList = [];
        saveHistory();
        renderHistory();
    };
}

function renderHistory() {
    historyContainer.innerHTML = "";

    if (historyList.length === 0) {
        historyContainer.innerHTML = `<div class="history-item"><p>No scans yet</p></div>`;
        return;
    }

    historyList.forEach(scan => {
        let item = document.createElement("div");
        item.className = "history-item";

        let type = detectType(scan.text);
        let typeIcon = { phone: "📞", url: "🌐", email: "📧", upi: "💳" }[type.type] || "📄";

        item.innerHTML = `<p>${typeIcon} ${scan.text}</p><small>${scan.time}</small>`;
        item.onclick = function () {
            resultBox.innerText = scan.text;
            document.querySelector(".result-floating").style.display = "block";
        };

        historyContainer.appendChild(item);
    });
}

loadHistory();

/* =====================================================
   OPEN LINK / PERFORM ACTION
   ===================================================== */

openBtn.onclick = function () {
    let result = detectType(resultBox.innerText);

    if (result.type === "phone")  { window.location.href = "tel:" + result.value; return; }
    if (result.type === "url")    { window.open(result.value, "_blank"); return; }
    if (result.type === "email")  { window.location.href = "mailto:" + result.value; return; }
    if (result.type === "upi")    { window.location.href = "upi://pay?pa=" + result.value; return; }

    alert("No action available for this type");
};

/* =====================================================
   COPY
   ===================================================== */

copyBtn.onclick = function () {
    navigator.clipboard.writeText(resultBox.innerText);
    copyBtn.innerText = "Copied";
    setTimeout(() => { copyBtn.innerText = "Copy"; }, 2000);
};

/* =====================================================
   SHARE
   ===================================================== */

if (shareBtn) {
    shareBtn.onclick = function () {
        if (navigator.share) {
            navigator.share({ title: "QR Result", text: resultBox.innerText });
        } else {
            alert("Share not supported");
        }
    };
}

/* =====================================================
   QR SCAN SUCCESS
   ===================================================== */

function onScanSuccess(decodedText) {
    let result = detectType(decodedText);
    if (result.value === lastScan) return;

    lastScan = result.value;
    resultBox.innerText = result.value;
    document.querySelector(".result-floating").style.display = "block";

    if (navigator.vibrate) navigator.vibrate([80, 40, 80]);
    addHistory(result.value);
}

/* =====================================================
   START QR SCANNER
   ===================================================== */

function startScanner() {
    scanner = new Html5Qrcode("reader");
    scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 250 },
        onScanSuccess
    ).catch(err => {
        resultBox.innerText = "Camera Error: " + err;
    });
}

startScanner();

/* =====================================================
   FLASH TOGGLE
   ===================================================== */

if (flashBtn) {
    flashBtn.onclick = async function () {
        try {
            if (!scanner) return;
            flashOn = !flashOn;
            await scanner.applyVideoConstraints({ advanced: [{ torch: flashOn }] });
        } catch (e) {
            alert("Flash not supported");
        }
    };
}

/* =====================================================
   ✅ HIGH-ACCURACY OCR — Tesseract.js v5
      + Canvas Pre-Processing (Google Lens Style)
   ===================================================== */

async function runOCR(file) {
    resultBox.innerText = "Eris AI is analyzing... 🧠";
    document.querySelector(".result-floating").style.display = "block";

    try {
        const image  = await createImageBitmap(file);
        const canvas = document.createElement("canvas");
        const ctx    = canvas.getContext("2d");

        const scale   = Math.max(1, 1200 / Math.max(image.width, image.height));
        canvas.width  = image.width  * scale;
        canvas.height = image.height * scale;

        ctx.filter = "grayscale(100%) contrast(160%) brightness(110%)";
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

        const worker = await Tesseract.createWorker("eng+hin");
        const { data: { text } } = await worker.recognize(canvas);
        await worker.terminate();

        let cleaned = text.replace(/\s+/g, " ").trim();

        if (!cleaned) {
            resultBox.innerText = "Text nahi mila. Thoda aur clear image try karo.";
            return;
        }

        resultBox.innerText = cleaned;
        addHistory(cleaned);

    } catch (e) {
        console.error("OCR Error:", e);
        resultBox.innerText = "OCR Error. Net ya browser issue check karo.";
    }
}

/* =====================================================
   IMAGE SCAN — QR first, OCR fallback
   ===================================================== */

if (imageBtn) {
    imageBtn.onclick = function () { imageInput.click(); };
}

if (imageInput) {
    imageInput.onchange = function () {
        let file = imageInput.files[0];
        if (!file) return;

        let html5Qr = new Html5Qrcode("reader");
        html5Qr.scanFile(file, true)
            .then(decodedText => {
                let result = detectType(decodedText);
                resultBox.innerText = result.value;
                document.querySelector(".result-floating").style.display = "block";
                addHistory(result.value);
                imageInput.value = "";
            })
            .catch(async () => {
                await runOCR(file);
                imageInput.value = "";
            });
    };
}

/* =====================================================
   BOTTOM NAVIGATION
   ===================================================== */

scanBtn.onclick = function () {
    scanBtn.classList.add("active");
    historyBtn.classList.remove("active");
    settingsBtn.classList.remove("active");

    scannerSection.style.display = "block";
    historySection.style.display = "none";
    document.querySelector(".result-floating").style.display = "none";

    if (!scanner) startScanner();
};

historyBtn.onclick = function () {
    scanBtn.classList.remove("active");
    historyBtn.classList.add("active");
    settingsBtn.classList.remove("active");

    scannerSection.style.display = "none";
    historySection.style.display = "block";
};

settingsBtn.onclick = function () {
    scanBtn.classList.remove("active");
    historyBtn.classList.remove("active");
    settingsBtn.classList.add("active");
    alert("Settings coming soon");
};

/* =====================================================
   PWA INSTALL
   ===================================================== */

let installPrompt;
const installBtn = document.getElementById("installApp");

window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    installPrompt = e;
    installBtn.style.display = "block";
});

installBtn.onclick = async function () {
    if (!installPrompt) return;
    installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") console.log("App Installed");
    installPrompt = null;
    installBtn.style.display = "none";
};

/* =====================================================
   ✅ FIXED: LANGUAGE SELECT + SOURCE DETECTION
   
   Problems fixed:
   1. targetLang change nahi ho raha tha — ab popup item
      click pe targetLang update hoga + toLangBox text bhi
   2. fromLang hamesha "Detecting..." tha — ab translate ke
      baad Google API se detected source lang show hoga
   3. toLangBox click → popup open — correctly wired
   ===================================================== */

let targetLang     = "en";            /* default: English */
let targetLangName = "English";       /* display name */

/* Language code → readable name map */
const langNames = {
    en: "English", hi: "Hindi",   es: "Spanish", fr: "French",
    de: "German",  ru: "Russian", ar: "Arabic",  zh: "Chinese",
    ja: "Japanese", ko: "Korean"
};

/* Google lang code → display name (for source detection) */
const googleLangNames = {
    en: "English", hi: "Hindi",   es: "Spanish", fr: "French",
    de: "German",  ru: "Russian", ar: "Arabic",  zh: "Chinese",
    ja: "Japanese", ko: "Korean", ur: "Urdu",    pt: "Portuguese",
    it: "Italian", bn: "Bengali", ta: "Tamil",   te: "Telugu",
    ml: "Malayalam", mr: "Marathi", pa: "Punjabi", gu: "Gujarati",
    auto: "Auto"
};

const popup = document.getElementById("languagePopup");

/* toLangBox click → popup kholo */
if (toLangBox && popup) {
    toLangBox.onclick = function () {
        popup.style.display = "block";
    };
}

/* Language items — selection + toLangBox update */
document.querySelectorAll(".lang-item").forEach(item => {
    item.onclick = function () {
        targetLang     = item.dataset.lang;
        targetLangName = item.innerText.trim();

        /* ✅ Update toLangBox with selected language name */
        if (toLangBox) toLangBox.innerText = targetLangName;

        /* Close popup */
        if (popup) popup.style.display = "none";

        console.log("Target language set:", targetLang, targetLangName);
    };
});

/* =====================================================
   ✅ FIXED TRANSLATOR — Google GTX Mirror
   + Source language auto-detect → fromLang box update
   + Target language correctly applied from targetLang var
   + Loader, double-click guard, finally restore
   ===================================================== */

const translateBtn = document.getElementById("translateBtn");

if (translateBtn) {
    translateBtn.onclick = async function () {
        let text = resultBox.innerText;

        /* Sanity checks */
        if (!text
            || text.includes("Waiting")
            || text.includes("reading")
            || text.includes("analyzing")
            || text.includes("translating")
        ) {
            alert("Bhai, scan toh hone de pehle! 🤫");
            return;
        }

        /* Show translate bar */
        if (translateBar) translateBar.style.display = "flex";

        /* Reset fromLang to detecting while we fetch */
        if (fromLangBox) fromLangBox.innerText = "Detecting...";
        if (toLangBox)   toLangBox.innerText   = targetLangName;

        let originalText = text;

        /* Disable button */
        translateBtn.style.opacity      = "0.5";
        translateBtn.style.pointerEvents = "none";
        resultBox.innerText = "Eris AI is translating... ⏳";
        document.querySelector(".result-floating").style.display = "block";

        try {
            /* ✅ dt=ld added — source language detection response milegi */
            const url =
                `https://translate.googleapis.com/translate_a/single?client=gtx` +
                `&sl=auto&tl=${targetLang}&dt=t&dt=ld` +
                `&q=${encodeURIComponent(text)}`;

            const res = await fetch(url);
            if (!res.ok) throw new Error("API error: " + res.status);

            const data = await res.json();

            /* ✅ Translated text — data[0] array join */
            if (data && data[0]) {
                let translated = data[0]
                    .filter(item => item && item[0])
                    .map(item => item[0])
                    .join("");
                resultBox.innerText = translated;
            } else {
                throw new Error("Empty translation response");
            }

            /* ✅ Source language detect — Google returns it in data[8][0][0] or data[2] */
            let detectedCode = null;

            /* Method 1: data[8][0][0] — most common position */
            if (data[8] && data[8][0] && data[8][0][0]) {
                detectedCode = data[8][0][0];
            }
            /* Method 2: data[2] — fallback */
            else if (data[2] && typeof data[2] === "string") {
                detectedCode = data[2];
            }

            if (detectedCode && fromLangBox) {
                let detectedName = googleLangNames[detectedCode] || detectedCode.toUpperCase();
                fromLangBox.innerText = detectedName;
                console.log("Detected source lang:", detectedCode, "→", detectedName);
            } else if (fromLangBox) {
                fromLangBox.innerText = "Auto";
            }

            console.log("Translation Successful ✅");

        } catch (e) {
            console.error("Translation Error:", e);
            alert("Net check kar bhai, ya phir text bahut bada hai!");
            resultBox.innerText = originalText;
            if (fromLangBox) fromLangBox.innerText = "Error";

        } finally {
            translateBtn.style.opacity      = "1";
            translateBtn.style.pointerEvents = "auto";
        }
    };
}

/* =====================================================
   APP READY
   ===================================================== */

console.log("Eris Scan — Tesseract v5 + Canvas OCR + Fixed Translator ✅");
        
