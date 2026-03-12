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
   ✅ FINAL CRASH-PROOF OCR (MediaPipe Fix)
   - Fixed version @0.10.0 — no @latest mismatch
   - mpVision.FilesetResolver syntax — no destructuring shadow
   - GPU delegate for speed boost
   - result-floating show at start for UX
   ===================================================== */

async function runOCR(file) {
    resultBox.innerText = "Eris AI is reading...";
    document.querySelector(".result-floating").style.display = "block";

    try {
        /* Step 1: MediaPipe ko fixed version se load karo */
        const mpVision = await import(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0"
        );

        /* Step 2: Resolver aur Recognizer nikaalo */
        const FilesetResolver = mpVision.FilesetResolver;
        const TextRecognizer  = mpVision.TextRecognizer;

        /* Step 3: WASM path ko fixed version ke sath load karo */
        const filesetResolver = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
        );

        /* Step 4: Model initialize karo */
        const textRecognizer = await TextRecognizer.createFromOptions(filesetResolver, {
            baseOptions: {
                modelAssetPath: `https://storage.googleapis.com/mediapipe-models/text_recognizer/text_recognizer/float32/1/text_recognizer.tflite`,
                delegate: "GPU"   /* Speed boost ke liye GPU use karo */
            },
            detectionOptions: { minDetectionConfidence: 0.6 }
        });

        /* Step 5: Image bitmap banao aur recognize karo */
        const imageBitmap = await createImageBitmap(file);
        const result = await textRecognizer.recognize(imageBitmap);

        /* ✅ Sanity Check & Kachra Clean-up */
        let rawText = result.text || "";
        let cleaned = rawText
            .replace(/[^\w\s\d.,!?@#%&()\-:]/g, '')
            .replace(/\s+/g, ' ')
            .trim();

        if (cleaned.length === 0) {
            resultBox.innerText = "No clear text found. Try closer.";
            return;
        }

        resultBox.innerText = cleaned;
        addHistory(cleaned);

    } catch (error) {
        console.error("MediaPipe Critical Error:", error);
        /* Fallback message agar WASM load na ho sake */
        resultBox.innerText = "OCR Engine Error. Check internet or try a clearer image.";
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
                /* QR not found → MediaPipe OCR pe fallback */
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

console.log("Eris Scan — MediaPipe OCR + Google Translate Loaded ✅");
                        
