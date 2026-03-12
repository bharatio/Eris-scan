/* =====================================================
   ERIS SCAN – ADVANCED APP LOGIC
   QR SCANNER + HISTORY + SMART LINKS + FLASH + IMAGE SCAN + OCR
   ===================================================== */

let lastScan = "";
let historyList = [];
let scanner = null;
let flashOn = false;

/* =====================================================
   OCR WORKER CACHE
   ===================================================== */
let ocrWorker = null;

async function getOCRWorker() {
    if (!ocrWorker) {
        ocrWorker = await Tesseract.createWorker("eng+hin");
    }
    return ocrWorker;
}

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
const fromLangBox      = document.getElementById("fromLang");

/* =====================================================
   ✅ INSTANT LANGUAGE SELECT — native <select>
   No popup, no network, zero delay, works on all phones
   ===================================================== */

const langSelect = document.getElementById("langSelect");

/* targetLang directly from select value — always in sync */
function getTargetLang() {
    return langSelect ? langSelect.value : "en";
}

function getTargetLangName() {
    if (!langSelect) return "English";
    return langSelect.options[langSelect.selectedIndex].text.replace(/^.{1,4}\s/, "").trim();
}

/* Log on change — instant, no delay */
if (langSelect) {
    langSelect.addEventListener("change", function () {
        console.log("✅ Language instantly changed to:", langSelect.value, getTargetLangName());
    });
}

/* =====================================================
   SOURCE LANGUAGE NAMES (for fromLang display)
   ===================================================== */

const googleLangNames = {
    en: "English", hi: "Hindi",   es: "Spanish", fr: "French",
    de: "German",  ru: "Russian", ar: "Arabic",  zh: "Chinese",
    ja: "Japanese", ko: "Korean", ur: "Urdu",    pt: "Portuguese",
    it: "Italian", bn: "Bengali", ta: "Tamil",   te: "Telugu",
    ml: "Malayalam", mr: "Marathi", pa: "Punjabi", gu: "Gujarati",
    auto: "Auto"
};

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
   HISTORY
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
    let plainText = text.replace(/^• /gm, "").trim();
    historyList.unshift({ text: plainText, time: new Date().toLocaleString() });
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
   OPEN LINK
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

/* Warm up OCR worker silently */
getOCRWorker().catch(() => {});

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
   SMART OCR TEXT CLEANER → Bullet Points
   ===================================================== */

function cleanOCRText(raw) {
    let lines = raw.split("\n");
    let seen  = new Set();
    let clean = [];

    lines.forEach(line => {
        line = line.trim();

        if (line.length < 4) return;

        let alphaCount = (line.match(/[a-zA-Z\u0900-\u097F]/g) || []).length;
        let totalCount = line.replace(/\s/g, "").length;
        let alphaRatio = totalCount > 0 ? alphaCount / totalCount : 0;
        if (alphaRatio < 0.40) return;

        if (/^[\s\W\d]+$/.test(line)) return;

        line = line.replace(/^[-–—•*>|]+\s*/, "").trim();
        if (line.length < 4) return;

        let key = line.toLowerCase().replace(/\s+/g, " ");
        if (seen.has(key)) return;
        seen.add(key);

        clean.push(line);
    });

    if (clean.length === 0) return "";

    return clean.map(l => "• " + l).join("\n");
}

/* =====================================================
   HIGH-ACCURACY OCR — Tesseract v5 + Canvas
   ===================================================== */

async function runOCR(file) {
    resultBox.innerText = "Eris AI is analyzing... 🧠";
    document.querySelector(".result-floating").style.display = "block";

    try {
        const image  = await createImageBitmap(file);
        const canvas = document.createElement("canvas");
        const ctx    = canvas.getContext("2d");

        const scale   = Math.max(1, 1600 / Math.max(image.width, image.height));
        canvas.width  = image.width  * scale;
        canvas.height = image.height * scale;

        ctx.filter = "grayscale(100%) contrast(160%) brightness(110%)";
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

        const worker = await getOCRWorker();
        await worker.setParameters({ tessedit_pageseg_mode: "3" });

        const { data: { text } } = await worker.recognize(canvas);

        let formatted = cleanOCRText(text);

        if (!formatted) {
            resultBox.innerText = "Koi kaam ka text nahi mila. Clear image try karo.";
            return;
        }

        resultBox.innerText = formatted;
        addHistory(formatted);

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
   ✅ TRANSLATOR — Google GTX Mirror
   Language ab <select> se seedha milta hai — zero delay
   ===================================================== */

const translateBtn = document.getElementById("translateBtn");

if (translateBtn) {
    translateBtn.onclick = async function () {
        let text = resultBox.innerText;

        if (!text
            || text.includes("Waiting")
            || text.includes("reading")
            || text.includes("analyzing")
            || text.includes("translating")
        ) {
            alert("Bhai, pehle kuch scan toh kar! 🤫");
            return;
        }

        /* Show translate bar */
        if (translateBar) translateBar.style.display = "flex";
        if (fromLangBox)  fromLangBox.innerText = "Detecting...";

        let originalText = text;
        let currentTargetLang = getTargetLang(); /* ✅ Always fresh from <select> */

        translateBtn.style.opacity       = "0.5";
        translateBtn.style.pointerEvents = "none";
        resultBox.innerText = "Eris AI is translating... ⏳";
        document.querySelector(".result-floating").style.display = "block";

        try {
            /* Strip bullet points before API call */
            let plainText = text.replace(/^• /gm, "").trim();

            const url =
                `https://translate.googleapis.com/translate_a/single?client=gtx` +
                `&sl=auto&tl=${currentTargetLang}&dt=t&dt=ld` +
                `&q=${encodeURIComponent(plainText)}`;

            const res = await fetch(url);
            if (!res.ok) throw new Error("API error: " + res.status);

            const data = await res.json();

            if (data && data[0]) {
                let translated = data[0]
                    .filter(item => item && item[0])
                    .map(item => item[0])
                    .join("");
                resultBox.innerText = translated;
            } else {
                throw new Error("Empty response");
            }

            /* Detect source language */
            let detectedCode = null;
            if (data[8] && data[8][0] && data[8][0][0]) {
                detectedCode = data[8][0][0];
            } else if (data[2] && typeof data[2] === "string") {
                detectedCode = data[2];
            }

            if (fromLangBox) {
                fromLangBox.innerText = detectedCode
                    ? (googleLangNames[detectedCode] || detectedCode.toUpperCase())
                    : "Auto";
            }

            console.log("✅ Translated:", detectedCode, "→", currentTargetLang);

        } catch (e) {
            console.error("Translation Error:", e);
            alert("Net check kar bhai!");
            resultBox.innerText = originalText;
            if (fromLangBox) fromLangBox.innerText = "Error";

        } finally {
            translateBtn.style.opacity       = "1";
            translateBtn.style.pointerEvents = "auto";
        }
    };
}

/* =====================================================
   APP READY
   ===================================================== */

console.log("Eris Scan — Instant Language Select + Bullet OCR ✅");
                        
