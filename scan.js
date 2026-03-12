/* =====================================================
   ERIS SCAN — ADVANCED APP LOGIC
   ===================================================== */

let lastScan   = "";
let historyList = [];
let scanner    = null;
let flashOn    = false;

/* =====================================================
   ✅ LANGUAGE STATE — single source of truth
   Direct DOM se read karta hai — koi sync issue nahi
   ===================================================== */

/* Selected lang row track karna */
let selectedLangRow = null;

function getCurrentLang() {
    /* Hamesha DOM se seedha read — stale variable problem khatam */
    const active = document.querySelector(".lang-row.active");
    return {
        code: active ? active.dataset.lang : "en",
        name: active ? active.dataset.name : "English",
        flag: active ? active.dataset.flag : "🇬🇧"
    };
}

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
const toLangBtn        = document.getElementById("toLangBtn");
const toLangFlag       = document.getElementById("toLangFlag");
const toLangName       = document.getElementById("toLangName");
const langSheet        = document.getElementById("langSheet");
const langOverlay      = document.getElementById("langOverlay");

/* Source language display names */
const googleLangNames = {
    en:"English", hi:"Hindi", es:"Spanish", fr:"French",
    de:"German", ru:"Russian", ar:"Arabic", zh:"Chinese",
    ja:"Japanese", ko:"Korean", ur:"Urdu", pt:"Portuguese",
    it:"Italian", bn:"Bengali", ta:"Tamil", te:"Telugu",
    ml:"Malayalam", mr:"Marathi", pa:"Punjabi", gu:"Gujarati"
};

/* =====================================================
   ✅ LANGUAGE BOTTOM SHEET
   ===================================================== */

function openSheet() {
    langSheet.classList.add("show");
    langOverlay.classList.add("show");
}

function closeSheet() {
    langSheet.classList.remove("show");
    langOverlay.classList.remove("show");
}

/* Open on button tap */
if (toLangBtn) {
    toLangBtn.addEventListener("touchend", function(e) {
        e.preventDefault();
        openSheet();
    });
    toLangBtn.addEventListener("click", function(e) {
        e.preventDefault();
        openSheet();
    });
}

/* Close on overlay tap */
if (langOverlay) {
    langOverlay.addEventListener("touchend", function(e) {
        e.preventDefault();
        closeSheet();
    });
    langOverlay.addEventListener("click", closeSheet);
}

/* ✅ Language row tap — guaranteed update */
document.querySelectorAll(".lang-row").forEach(function(row) {
    function selectLang(e) {
        if (e) e.preventDefault();

        /* Remove active from all */
        document.querySelectorAll(".lang-row").forEach(r => r.classList.remove("active"));

        /* Set active on tapped row */
        row.classList.add("active");

        /* Update button display */
        const flag = row.dataset.flag;
        const name = row.dataset.name;
        const code = row.dataset.lang;

        if (toLangFlag) toLangFlag.innerText = flag;
        if (toLangName) toLangName.innerText = name;

        console.log("✅ Language selected:", code, name);

        closeSheet();
    }

    row.addEventListener("touchend", selectLang);
    row.addEventListener("click", selectLang);
});

/* =====================================================
   SMART TYPE DETECTION
   ===================================================== */

function detectType(text) {
    text = text.trim();

    let phone = text.match(/\+?[0-9]{7,15}/);
    if (phone) return { type:"phone", value:phone[0] };

    let url = text.match(/https?:\/\/[^\s]+/);
    if (url) return { type:"url", value:url[0] };

    let email = text.match(/[a-zA-Z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/);
    if (email) return { type:"email", value:email[0] };

    let upi = text.match(/[a-zA-Z0-9.\-_]+@[a-zA-Z]+/);
    if (upi) return { type:"upi", value:upi[0] };

    return { type:"text", value:text };
}

/* =====================================================
   HISTORY
   ===================================================== */

function loadHistory() {
    let saved = localStorage.getItem("scanHistory");
    if (saved) { historyList = JSON.parse(saved); renderHistory(); }
}

function saveHistory() {
    localStorage.setItem("scanHistory", JSON.stringify(historyList));
}

function addHistory(text) {
    let plain = text.replace(/^[-•]\s/gm, "").trim();
    historyList.unshift({ text: plain, time: new Date().toLocaleString() });
    if (historyList.length > 30) historyList.pop();
    saveHistory();
    renderHistory();
}

if (clearBtn) {
    clearBtn.onclick = function() {
        historyList = []; saveHistory(); renderHistory();
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
        let icon = {phone:"📞",url:"🌐",email:"📧",upi:"💳"}[type.type] || "📄";
        item.innerHTML = `<p>${icon} ${scan.text}</p><small>${scan.time}</small>`;
        item.onclick = function() {
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

openBtn.onclick = function() {
    let r = detectType(resultBox.innerText);
    if (r.type==="phone")  { window.location.href = "tel:"+r.value; return; }
    if (r.type==="url")    { window.open(r.value, "_blank"); return; }
    if (r.type==="email")  { window.location.href = "mailto:"+r.value; return; }
    if (r.type==="upi")    { window.location.href = "upi://pay?pa="+r.value; return; }
    alert("No action available for this type");
};

/* =====================================================
   COPY
   ===================================================== */

copyBtn.onclick = function() {
    navigator.clipboard.writeText(resultBox.innerText);
    copyBtn.innerText = "Copied";
    setTimeout(() => { copyBtn.innerText = "Copy"; }, 2000);
};

/* =====================================================
   SHARE
   ===================================================== */

if (shareBtn) {
    shareBtn.onclick = function() {
        if (navigator.share) {
            navigator.share({ title:"QR Result", text:resultBox.innerText });
        } else { alert("Share not supported"); }
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
        { facingMode:"environment" },
        { fps:10, qrbox:250 },
        onScanSuccess
    ).catch(err => { resultBox.innerText = "Camera Error: " + err; });
}

startScanner();
getOCRWorker().catch(() => {});

/* =====================================================
   FLASH
   ===================================================== */

if (flashBtn) {
    flashBtn.onclick = async function() {
        try {
            if (!scanner) return;
            flashOn = !flashOn;
            await scanner.applyVideoConstraints({ advanced:[{ torch:flashOn }] });
        } catch(e) { alert("Flash not supported"); }
    };
}

/* =====================================================
   ✅ OCR TEXT CLEANER — No emoji bullets, plain text
   
   Garbage filter rules:
   1. Line mein 45%+ real letters hone chahiye
   2. Min 6 chars
   3. Pure symbol/number lines drop
   4. 1-2 word short UI labels drop (Sources, Submit etc)
   5. Lines with @, $, % heavy → drop
   6. Duplicate lines drop
   Output: Clean lines, "- " prefix (simple dash bullet)
   ===================================================== */

/* Common UI garbage words jo OCR utha leta hai */
const UI_GARBAGE = new Set([
    "sources","submit","cancel","ok","close","menu","back","next",
    "login","logout","sign in","sign up","search","home","share",
    "copy","paste","delete","edit","save","open","send","reply",
    "like","unlike","follow","unfollow","subscribe","skip","done",
    "ask gemini","gemini","fast","sources","go go","install app",
    "open link","install","app"
]);

function cleanOCRText(raw) {
    let lines = raw.split("\n");
    let seen  = new Set();
    let clean = [];

    lines.forEach(line => {
        line = line.trim();

        /* Min length */
        if (line.length < 6) return;

        /* Remove leading OCR artifacts */
        line = line.replace(/^[\-–—•*>|«»@#+]+\s*/, "").trim();
        if (line.length < 6) return;

        /* Real letter ratio — must be 45%+ */
        let alpha = (line.match(/[a-zA-Z\u0900-\u097F]/g) || []).length;
        let total = line.replace(/\s/g, "").length;
        if (total === 0 || alpha / total < 0.45) return;

        /* Drop pure symbol/number lines */
        if (/^[\s\W\d]+$/.test(line)) return;

        /* Drop known UI garbage words */
        let lower = line.toLowerCase().replace(/\s+/g, " ").trim();
        if (UI_GARBAGE.has(lower)) return;

        /* Drop very short single-word UI labels (< 4 chars or 1 word < 6 chars) */
        let words = lower.split(/\s+/);
        if (words.length === 1 && line.length < 6) return;

        /* Drop lines with heavy special chars like $, ¢, @@ */
        let specialCount = (line.match(/[$¢@#%^&*()+=\[\]{}<>\\|]/g) || []).length;
        if (specialCount > 1) return;

        /* Deduplicate */
        let key = lower;
        if (seen.has(key)) return;
        seen.add(key);

        clean.push(line);
    });

    if (clean.length === 0) return "";

    /* Simple dash bullets — clean, no emoji clutter */
    return clean.map(l => "- " + l).join("\n");
}

/* =====================================================
   HIGH-ACCURACY OCR — Tesseract v5 + Canvas
   ===================================================== */

async function runOCR(file) {
    resultBox.innerText = "Reading image...";
    document.querySelector(".result-floating").style.display = "block";

    try {
        const image  = await createImageBitmap(file);
        const canvas = document.createElement("canvas");
        const ctx    = canvas.getContext("2d");

        const scale   = Math.max(1, 1600 / Math.max(image.width, image.height));
        canvas.width  = image.width  * scale;
        canvas.height = image.height * scale;

        ctx.filter = "grayscale(100%) contrast(165%) brightness(108%)";
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

        const worker = await getOCRWorker();
        await worker.setParameters({ tessedit_pageseg_mode: "3" });

        const { data: { text } } = await worker.recognize(canvas);

        let formatted = cleanOCRText(text);

        if (!formatted) {
            resultBox.innerText = "No readable text found. Try a clearer image.";
            return;
        }

        resultBox.innerText = formatted;
        addHistory(formatted);

    } catch(e) {
        console.error("OCR Error:", e);
        resultBox.innerText = "OCR Error. Check internet connection.";
    }
}

/* =====================================================
   IMAGE SCAN
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

scanBtn.onclick = function() {
    scanBtn.classList.add("active");
    historyBtn.classList.remove("active");
    settingsBtn.classList.remove("active");
    scannerSection.style.display = "block";
    historySection.style.display = "none";
    document.querySelector(".result-floating").style.display = "none";
    if (!scanner) startScanner();
};

historyBtn.onclick = function() {
    scanBtn.classList.remove("active");
    historyBtn.classList.add("active");
    settingsBtn.classList.remove("active");
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
   PWA INSTALL
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
    if (choice.outcome === "accepted") console.log("App Installed");
    installPrompt = null;
    installBtn.style.display = "none";
};

/* =====================================================
   ✅ TRANSLATOR — language DOM se seedha read
   ===================================================== */

const translateBtn = document.getElementById("translateBtn");

if (translateBtn) {
    translateBtn.onclick = async function() {
        let text = resultBox.innerText;

        /* Agar kuch scan nahi hua toh sheet open karo */
        if (!text
            || text === "Waiting for scan..."
            || text.includes("Reading image")
            || text.includes("translating")
        ) {
            openSheet();
            return;
        }

        /* ✅ Language HAMESHA DOM se read — stale variable problem zero */
        const lang = getCurrentLang();

        if (translateBar) translateBar.style.display = "flex";
        if (fromLangBox)  fromLangBox.innerText = "Detecting...";
        if (toLangFlag)   toLangFlag.innerText   = lang.flag;
        if (toLangName)   toLangName.innerText   = lang.name;

        let originalText = text;

        translateBtn.style.opacity       = "0.5";
        translateBtn.style.pointerEvents = "none";
        resultBox.innerText = "Translating to " + lang.name + "...";
        document.querySelector(".result-floating").style.display = "block";

        try {
            /* Strip dash bullets */
            let plain = text.replace(/^- /gm, "").trim();

            const url =
                `https://translate.googleapis.com/translate_a/single?client=gtx` +
                `&sl=auto&tl=${lang.code}&dt=t&dt=ld` +
                `&q=${encodeURIComponent(plain)}`;

            console.log("Translating to:", lang.code, lang.name);

            const res  = await fetch(url);
            if (!res.ok) throw new Error("HTTP " + res.status);

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
            if (data[8] && data[8][0] && data[8][0][0]) detectedCode = data[8][0][0];
            else if (typeof data[2] === "string") detectedCode = data[2];

            if (fromLangBox) {
                fromLangBox.innerText = detectedCode
                    ? (googleLangNames[detectedCode] || detectedCode.toUpperCase())
                    : "Auto";
            }

            console.log("✅ Done:", detectedCode, "→", lang.code);

        } catch(e) {
            console.error("Translate Error:", e);
            alert("Translation failed. Check internet.");
            resultBox.innerText = originalText;
            if (fromLangBox) fromLangBox.innerText = "Error";

        } finally {
            translateBtn.style.opacity       = "1";
            translateBtn.style.pointerEvents = "auto";
        }
    };
}

/* =====================================================
   READY
   ===================================================== */

console.log("Eris Scan ✅ — DOM-based lang | Clean OCR | No emoji bullets");
                          
