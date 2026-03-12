/* =====================================================
ERIS SCAN – ADVANCED APP LOGIC
QR SCANNER + HISTORY + SMART LINKS + FLASH + IMAGE SCAN + OCR
===================================================== */

let lastScan = "", historyList = [], scanner = null, flashOn = false;

/* ================= ELEMENTS ================= */
const resultBox = document.getElementById("result");
const openBtn = document.getElementById("openLink");
const copyBtn = document.getElementById("copyText");
const shareBtn = document.getElementById("shareBtn");
const historyContainer = document.getElementById("history");
const scanBtn = document.getElementById("scanBtn");
const historyBtn = document.getElementById("historyBtn");
const settingsBtn = document.getElementById("settingsBtn");
const flashBtn = document.getElementById("flashBtn");
const imageBtn = document.getElementById("imageBtn");
const clearBtn = document.getElementById("clearHistory");
const imageInput = document.getElementById("imageScan");
const scannerSection = document.querySelector(".camera-section");
const historySection = document.querySelector(".history-section");
const translateBar = document.querySelector(".translate-bar"); /* ✅ FIX 2: translateBar element add kiya */

/* =====================================================
SMART TYPE DETECTION FUNCTION
===================================================== */
function detectType(text) {
    text = text.trim();
    /* PHONE - 7 to 15 digits, optional + */
    let phone = text.match(/(\+?\d[\d\s\-]{7,15}\d)/);
    if (phone) return { type: "phone", value: phone[0] };
    /* URL - http/https URLs */
    let url = text.match(/https?:\/\/[^\s]+/);
    if (url) return { type: "url", value: url[0] };
    /* EMAIL - standard email pattern */
    let email = text.match(/[a-zA-Z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/);
    if (email) return { type: "email", value: email[0] };
    /* UPI - handles @ybl, @okhdfcbank, etc */
    let upi = text.match(/[a-zA-Z0-9.\-_]+@[a-zA-Z]+/);
    if (upi) return { type: "upi", value: upi[0] };
    /* TEXT - default */
    return { type: "text", value: text };
}

/* =====================================================
LOAD HISTORY
===================================================== */
function loadHistory() {
    let saved = localStorage.getItem("scanHistory");
    if (saved) { historyList = JSON.parse(saved); renderHistory(); }
}
loadHistory();

/* =====================================================
SAVE HISTORY
===================================================== */
function saveHistory() {
    localStorage.setItem("scanHistory", JSON.stringify(historyList));
}

/* =====================================================
ADD HISTORY
===================================================== */
function addHistory(text) {
    let item = { text: text, time: new Date().toLocaleString() };
    historyList.unshift(item);
    if (historyList.length > 30) { historyList.pop(); }
    saveHistory();
    renderHistory();
}

/* =====================================================
CLEAR HISTORY
===================================================== */
if (clearBtn) {
    clearBtn.onclick = function() { historyList = []; saveHistory(); renderHistory(); };
}

/* =====================================================
RENDER HISTORY
===================================================== */
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
        let typeIcon = "";
        switch(type.type) {
            case "phone": typeIcon = "📞"; break;
            case "url": typeIcon = "🌐"; break;
            case "email": typeIcon = "📧"; break;
            case "upi": typeIcon = "💳"; break;
            default: typeIcon = "📄";
        }
        item.innerHTML = `<p>${typeIcon} ${scan.text}</p><small>${scan.time}</small>`;
        /* history item click to show result */
        item.onclick = function() {
            resultBox.innerText = scan.text;
            document.querySelector(".result-floating").style.display = "block";
        };
        historyContainer.appendChild(item);
    });
}

/* =====================================================
OPEN LINK / PERFORM ACTION (UPDATED)
===================================================== */
openBtn.onclick = function() {
    let text = resultBox.innerText;
    let result = detectType(text);
    /* PHONE */
    if (result.type === "phone") { window.location.href = "tel:" + result.value; return; }
    /* URL */
    if (result.type === "url") { window.open(result.value, "_blank"); return; }
    /* EMAIL */
    if (result.type === "email") { window.location.href = "mailto:" + result.value; return; }
    /* UPI */
    if (result.type === "upi") { window.location.href = "upi://pay?pa=" + result.value; return; }
    alert("No action available for this type");
};

/* =====================================================
COPY TEXT
===================================================== */
copyBtn.onclick = function() {
    let text = resultBox.innerText;
    navigator.clipboard.writeText(text);
    copyBtn.innerText = "Copied";
    setTimeout(() => { copyBtn.innerText = "Copy"; }, 2000);
};

/* =====================================================
SHARE RESULT
===================================================== */
if (shareBtn) {
    shareBtn.onclick = function() {
        let text = resultBox.innerText;
        if (navigator.share) {
            navigator.share({ title: "QR Result", text: text });
        } else {
            alert("Share not supported");
        }
    };
}

/* =====================================================
SCAN SUCCESS (UPDATED)
===================================================== */
function onScanSuccess(decodedText) {
    let result = detectType(decodedText);
    if (result.value === lastScan) { return; }
    lastScan = result.value;
    resultBox.innerText = result.value;
    /* show result card */
    document.querySelector(".result-floating").style.display = "block";
    /* premium vibration */
    if (navigator.vibrate) { navigator.vibrate([80, 40, 80]); }
    /* save history */
    addHistory(result.value);
}

/* =====================================================
START SCANNER
===================================================== */
function startScanner() {
    scanner = new Html5Qrcode("reader");
    scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 250 },
        onScanSuccess
    ).catch(err => { resultBox.innerText = "Camera Error: " + err; });
}
startScanner();

/* =====================================================
FLASH TOGGLE
===================================================== */
if (flashBtn) {
    flashBtn.onclick = async function() {
        try {
            if (!scanner) return;
            flashOn = !flashOn;
            await scanner.applyVideoConstraints({ advanced: [{ torch: flashOn }] });
        } catch (e) { alert("Flash not supported"); }
    };
}

/* =====================================================
OCR FUNCTION - SCAN TEXT FROM IMAGE
===================================================== */
async function runOCR(file) {
    resultBox.innerText = "Scanning text...";
    try {
        const { data: { text } } = await Tesseract.recognize(file, 'eng+hin', {});
        let cleaned = text.trim();
        /* OCR garbage cleaner */
        cleaned = cleaned.replace(/[^\w\s\u0900-\u097F@.:\/\-]/g, "");
        cleaned = cleaned.replace(/\s+/g, " ");
        cleaned = cleaned.trim();
        if (cleaned.length === 0) {
            alert("No text detected");
            resultBox.innerText = "No text detected";
            return;
        }
        resultBox.innerText = cleaned;
        document.querySelector(".result-floating").style.display = "block";
        addHistory(cleaned);
    } catch (error) {
        alert("OCR failed: " + error.message);
        resultBox.innerText = "OCR failed";
    }
}

/* =====================================================
SCAN FROM IMAGE (QR + OCR)
===================================================== */
if (imageBtn) {
    imageBtn.onclick = function() { imageInput.click(); };
}
if (imageInput) {
    imageInput.onchange = function() {
        let file = imageInput.files[0];
        if (!file) return;
        let html5Qr = new Html5Qrcode("reader");
        html5Qr.scanFile(file, true)
            .then(decodedText => {
                let result = detectType(decodedText);
                resultBox.innerText = result.value;
                document.querySelector(".result-floating").style.display = "block";
                addHistory(result.value);
                html5Qr.clear(); /* Fix 2: clear to prevent memory leak */
                imageInput.value = "";
            })
            .catch(async err => {
                /* QR not found → run OCR */
                html5Qr.clear(); /* Fix 2: clear before OCR */
                await runOCR(file);
                imageInput.value = "";
            });
    };
}

/* =====================================================
BOTTOM NAVIGATION
===================================================== */
scanBtn.onclick = function() {
    scanBtn.classList.add("active");
    historyBtn.classList.remove("active");
    settingsBtn.classList.remove("active");
    scannerSection.style.display = "block";
    historySection.style.display = "none";
    document.querySelector(".result-floating").style.display = "none";
    /* restart scanner if needed */
    if (!scanner) { startScanner(); }
};

historyBtn.onclick = function() {
    scanBtn.classList.remove("active");
    historyBtn.classList.add("active");
    settingsBtn.classList.remove("active");
    /* Fix 1: stop camera to prevent freeze */
    if (scanner) { scanner.stop().catch(() => {}); scanner = null; }
    scannerSection.style.display = "none";
    historySection.style.display = "block";
};

settingsBtn.onclick = function() {
    scanBtn.classList.remove("active");
    historyBtn.classList.remove("active");
    settingsBtn.classList.add("active");
    alert("Settings coming soon");
};

/* =====================================================
PWA INSTALL APP
===================================================== */
let installPrompt;
const installBtn = document.getElementById("installApp");
window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    installPrompt = e;
    installBtn.style.display = "block";
});
installBtn.onclick = async function() {
    if (!installPrompt) return;
    installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") { console.log("App Installed"); }
    installPrompt = null;
    installBtn.style.display = "none";
};

/* =====================================================
LANGUAGE SELECT
===================================================== */
let targetLang = "en";
const toLang = document.getElementById("toLang");
const popup = document.getElementById("languagePopup");
if (toLang && popup) {
    toLang.onclick = function() { popup.style.display = "block"; };
}
const langItems = document.querySelectorAll(".lang-item");
if (langItems.length) {
    langItems.forEach(item => {
        item.onclick = function() {
            targetLang = item.dataset.lang;
            toLang.innerText = item.innerText;
            if (popup) popup.style.display = "none";
        };
    });
}

/* =====================================================
TRANSLATE BUTTON
===================================================== */
const translateBtn = document.getElementById("translateBtn");
if (translateBtn) {
    translateBtn.onclick = async function() {
        if (translateBar) { translateBar.style.display = "flex"; }
        let fullText = resultBox.innerText;
        if (!fullText || fullText === "Waiting for scan...") {
            alert("Scan something first");
            return;
        }
        /* optional: large text warning */
        if (fullText.length > 3000) { alert("Large text detected. Translation may take time."); }
        resultBox.innerText = "Translating...";
        let translated = "";
        /* split text in 500 char chunks */
        for (let i = 0; i < fullText.length; i += 500) {
            let chunk = fullText.substring(i, i + 500);
            try {
                let res = await fetch(
                    "https://api.mymemory.translated.net/get?q=" +
                    encodeURIComponent(chunk) +
                    "&langpair=auto|" + targetLang
                );
                let data = await res.json();
                /* Fix 2: fallback to original chunk if API fails/429 */
                if (data && data.responseData && data.responseData.translatedText) {
                    translated += data.responseData.translatedText + " ";
                } else {
                    translated += chunk + " ";
                }
                /* Fix 1: small delay to avoid API rate limit */
                await new Promise(r => setTimeout(r, 400));
            } catch (e) {
                console.log("Translation chunk failed");
                translated += chunk + " ";
            }
        }
        resultBox.innerText = translated.trim();
        /* Fix 3: auto hide translateBar after 3 seconds */
        if (translateBar) {
            setTimeout(() => { translateBar.style.display = "none"; }, 3000);
        }
    };
}

/* =====================================================
APP READY
===================================================== */
console.log("Eris Scan Advanced Loaded with OCR & Smart Detection");
