/* =====================================================
   ERIS SCAN – ADVANCED APP LOGIC
   QR SCANNER + HISTORY + SMART LINKS + FLASH + IMAGE SCAN + OCR
   ===================================================== */

let lastScan = "";
let historyList = [];
let scanner = null;
let flashOn = false;

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

const translateBar = document.querySelector(".translate-bar");

/* =====================================================
   SMART TYPE DETECTION FUNCTION
   ===================================================== */

function detectType(text) {
    text = text.trim();

    /* PHONE - 7 to 15 digits, optional + */
    let phone = text.match(/\+?[0-9]{7,15}/);
    if (phone) {
        return { type: "phone", value: phone[0] };
    }

    /* URL - http/https URLs */
    let url = text.match(/https?:\/\/[^\s]+/);
    if (url) {
        return { type: "url", value: url[0] };
    }

    /* EMAIL - standard email pattern */
    let email = text.match(/[a-zA-Z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/);
    if (email) {
        return { type: "email", value: email[0] };
    }

    /* UPI - handles @ybl, @okhdfcbank, etc */
    let upi = text.match(/[a-zA-Z0-9.\-_]+@[a-zA-Z]+/);
    if (upi) {
        return { type: "upi", value: upi[0] };
    }

    /* TEXT - default */
    return { type: "text", value: text };
}

/* =====================================================
   LOAD HISTORY
   ===================================================== */

function loadHistory() {
    let saved = localStorage.getItem("scanHistory");
    if (saved) {
        historyList = JSON.parse(saved);
        renderHistory();
    }
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
    let item = {
        text: text,
        time: new Date().toLocaleString()
    };

    historyList.unshift(item);

    if (historyList.length > 30) {
        historyList.pop();
    }

    saveHistory();
    renderHistory();
}

/* =====================================================
   CLEAR HISTORY
   ===================================================== */

if (clearBtn) {
    clearBtn.onclick = function () {
        historyList = [];
        saveHistory();
        renderHistory();
    };
}

/* =====================================================
   RENDER HISTORY
   ===================================================== */

function renderHistory() {
    historyContainer.innerHTML = "";

    if (historyList.length === 0) {
        historyContainer.innerHTML = `
            <div class="history-item">
                <p>No scans yet</p>
            </div>
        `;
        return;
    }

    historyList.forEach(scan => {
        let item = document.createElement("div");
        item.className = "history-item";

        let type = detectType(scan.text);
        let typeIcon = "";

        switch (type.type) {
            case "phone": typeIcon = "📞"; break;
            case "url":   typeIcon = "🌐"; break;
            case "email": typeIcon = "📧"; break;
            case "upi":   typeIcon = "💳"; break;
            default:      typeIcon = "📄";
        }

        item.innerHTML = `
            <p>${typeIcon} ${scan.text}</p>
            <small>${scan.time}</small>
        `;

        item.onclick = function () {
            resultBox.innerText = scan.text;
            document.querySelector(".result-floating").style.display = "block";
        };

        historyContainer.appendChild(item);
    });
}

/* =====================================================
   OPEN LINK / PERFORM ACTION
   ===================================================== */

openBtn.onclick = function () {
    let text = resultBox.innerText;
    let result = detectType(text);

    if (result.type === "phone") {
        window.location.href = "tel:" + result.value;
        return;
    }
    if (result.type === "url") {
        window.open(result.value, "_blank");
        return;
    }
    if (result.type === "email") {
        window.location.href = "mailto:" + result.value;
        return;
    }
    if (result.type === "upi") {
        window.location.href = "upi://pay?pa=" + result.value;
        return;
    }

    alert("No action available for this type");
};

/* =====================================================
   COPY TEXT
   ===================================================== */

copyBtn.onclick = function () {
    let text = resultBox.innerText;
    navigator.clipboard.writeText(text);
    copyBtn.innerText = "Copied";
    setTimeout(() => { copyBtn.innerText = "Copy"; }, 2000);
};

/* =====================================================
   SHARE RESULT
   ===================================================== */

if (shareBtn) {
    shareBtn.onclick = function () {
        let text = resultBox.innerText;
        if (navigator.share) {
            navigator.share({ title: "QR Result", text: text });
        } else {
            alert("Share not supported");
        }
    };
}

/* =====================================================
   SCAN SUCCESS
   ===================================================== */

function onScanSuccess(decodedText) {
    let result = detectType(decodedText);

    if (result.value === lastScan) return;

    lastScan = result.value;
    resultBox.innerText = result.value;

    document.querySelector(".result-floating").style.display = "block";

    if (navigator.vibrate) {
        navigator.vibrate([80, 40, 80]);
    }

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
    )
    .catch(err => {
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
            await scanner.applyVideoConstraints({
                advanced: [{ torch: flashOn }]
            });
        } catch (e) {
            alert("Flash not supported");
        }
    };
}

/* =====================================================
   ✅ WORKING OCR — Tesseract.js v4 (CDN se dynamic load)

   WHY MediaPipe HATAYA:
   @mediapipe/tasks-vision mein TextRecognizer publicly
   available hi nahi hai — sirf internal Google products
   ke liye hai. Isliye hamesha "undefined" aata tha aur
   crash hota tha. Ye kisi ka bhi code kaam nahi karta.

   Tesseract.js v4 = real, proven, open-source OCR engine
   jo browser mein directly kaam karta hai. Hindi + English
   dono support karta hai.
   ===================================================== */

async function runOCR(file) {
    resultBox.innerText = "Eris AI is reading... 🔍";
    document.querySelector(".result-floating").style.display = "block";

    try {
        /* Step 1: Tesseract.js v4 dynamic load karo agar already nahi hai */
        if (typeof Tesseract === "undefined") {
            await new Promise((resolve, reject) => {
                const script = document.createElement("script");
                script.src = "https://cdn.jsdelivr.net/npm/tesseract.js@4/dist/tesseract.min.js";
                script.onload = resolve;
                script.onerror = () => reject(new Error("Tesseract CDN load failed"));
                document.head.appendChild(script);
            });
        }

        /* Step 2: Worker banao — eng+hin dono languages */
        const worker = await Tesseract.createWorker("eng+hin", 1, {
            workerPath: "https://cdn.jsdelivr.net/npm/tesseract.js@4/dist/worker.min.js",
            corePath:   "https://cdn.jsdelivr.net/npm/tesseract.js-core@4/tesseract-core.wasm.js",
            langPath:   "https://tessdata.projectnaptha.com/4.0.0"
        });

        /* Step 3: Recognize karo */
        const { data: { text } } = await worker.recognize(file);

        /* Step 4: Worker terminate karo (memory free) */
        await worker.terminate();

        /* Step 5: Kachra Sanitizer */
        let cleaned = text
            .replace(/[^\w\s\d.,!?@#%&()\-:\u0900-\u097F]/g, '') /* Hindi Unicode bhi rakhna */
            .replace(/\s+/g, ' ')
            .trim();

        if (cleaned.length === 0) {
            resultBox.innerText = "No text found. Try a clearer image.";
            return;
        }

        resultBox.innerText = cleaned;
        addHistory(cleaned);

    } catch (error) {
        console.error("OCR Error:", error);
        resultBox.innerText = "OCR failed. Check internet & try again.";
    }
}

/* =====================================================
   SCAN FROM IMAGE (QR + OCR)
   ===================================================== */

if (imageBtn) {
    imageBtn.onclick = function () {
        imageInput.click();
    };
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
                /* QR not found → Tesseract OCR pe fallback */
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
   PWA INSTALL APP
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

    if (choice.outcome === "accepted") {
        console.log("App Installed");
    }

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
    toLang.onclick = function () {
        popup.style.display = "block";
    };
}

const langItems = document.querySelectorAll(".lang-item");

if (langItems.length) {
    langItems.forEach(item => {
        item.onclick = function () {
            targetLang = item.dataset.lang;
            toLang.innerText = item.innerText;
            if (popup) popup.style.display = "none";
        };
    });
}

/* =====================================================
   ✅ FINAL POLISHED TRANSLATOR — Google GTX Mirror
   + Loader UI
   + Double-click guard (button disable during fetch)
   + Sanity checks
   + finally block for guaranteed button restore
   ===================================================== */

const translateBtn = document.getElementById("translateBtn");

if (translateBtn) {
    translateBtn.onclick = async function () {
        let text = resultBox.innerText;

        /* Basic Checks */
        if (!text || text.includes("Waiting") || text.includes("reading")) {
            alert("Bhai, scan toh hone de pehle! 🤫");
            return;
        }

        /* UI Update: Loader dikhao */
        if (translateBar) translateBar.style.display = "flex";
        let originalText = text;

        /* Button disable — baar-baar click guard */
        translateBtn.style.opacity = "0.5";
        translateBtn.style.pointerEvents = "none";
        resultBox.innerText = "Eris AI is translating... ⏳";
        document.querySelector(".result-floating").style.display = "block";

        try {
            const url =
                `https://translate.googleapis.com/translate_a/single?client=gtx` +
                `&sl=auto&tl=${targetLang}&dt=t` +
                `&q=${encodeURIComponent(text)}`;

            const res = await fetch(url);
            if (!res.ok) throw new Error("API Limit");

            const data = await res.json();

            if (data && data[0]) {
                let translated = data[0]
                    .filter(item => item && item[0])
                    .map(item => item[0])
                    .join('');

                resultBox.innerText = translated;
                console.log("Translation Successful ✅");
            }

        } catch (e) {
            console.error("Translation Error:", e);
            alert("Net check kar bhai, ya phir text bahut bada hai!");
            resultBox.innerText = originalText;

        } finally {
            /* Button wapas sahi kar do — hamesha */
            translateBtn.style.opacity = "1";
            translateBtn.style.pointerEvents = "auto";
        }
    };
}

/* =====================================================
   APP READY
   ===================================================== */

console.log("Eris Scan — Tesseract OCR + Google Translate Loaded ✅");
              
