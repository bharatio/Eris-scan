/* ================================================================
   ERIS SCAN — COMPLETE WORKING CODE
   ----------------------------------------------------------------
   Translate  : Google translate-pa (primary, no limit, CORS-free)
                Google GTX (fallback, proven)
   OCR        : Tesseract v5 + Canvas preprocessing + strong filter
   Features   : QR Scan, Image Scan, OCR, History, Flash, PWA
                Language Download System, Smart Type Detection
   ================================================================ */

"use strict";

/* ── GLOBAL LANGUAGE ─────────────────────────────────────────── */
var LANG = { code: "en", name: "English", flag: "🇬🇧" };

/* ── DOWNLOADED CACHE ────────────────────────────────────────── */
var DL = {};
function loadDL() {
    try { DL = JSON.parse(localStorage.getItem("eris_dl") || "{}"); } catch(e) { DL = {}; }
    DL["en"] = true;
}
function saveDL() {
    try { localStorage.setItem("eris_dl", JSON.stringify(DL)); } catch(e) {}
}
loadDL();

/* ── LANGUAGE NAME MAP ───────────────────────────────────────── */
var GL = {
    en:"English", hi:"Hindi",   es:"Spanish",    fr:"French",
    de:"German",  ru:"Russian", ar:"Arabic",      zh:"Chinese",
    ja:"Japanese",ko:"Korean",  ur:"Urdu",        pt:"Portuguese",
    it:"Italian", bn:"Bengali", ta:"Tamil",       te:"Telugu",
    ml:"Malayalam",mr:"Marathi",pa:"Punjabi",     gu:"Gujarati",
    auto:"Auto"
};

/* ── OCR WORKER CACHE ────────────────────────────────────────── */
var ocrWorker = null;
async function getOCRWorker() {
    if (!ocrWorker) ocrWorker = await Tesseract.createWorker("eng+hin");
    return ocrWorker;
}

/* ── DOM ELEMENTS ────────────────────────────────────────────── */
var resultEl   = document.getElementById("result");
var openBtn    = document.getElementById("openLink");
var copyBtn    = document.getElementById("copyText");
var shareBtn   = document.getElementById("shareBtn");
var histCont   = document.getElementById("history");
var scanNavBtn = document.getElementById("scanBtn");
var histNavBtn = document.getElementById("historyBtn");
var setNavBtn  = document.getElementById("settingsBtn");
var flashNavBtn= document.getElementById("flashBtn");
var imageNavBtn= document.getElementById("imageBtn");
var clearBtn   = document.getElementById("clearHistory");
var imageInput = document.getElementById("imageScan");
var scanSec    = document.querySelector(".camera-section");
var histSec    = document.querySelector(".history-section");
var tBar       = document.getElementById("translateBar");
var fromLangEl = document.getElementById("fromLang");
var toLangBtn  = document.getElementById("toLangBtn");
var btnFlagEl  = document.getElementById("btnFlag");
var btnNameEl  = document.getElementById("btnName");
var sheetEl    = document.getElementById("langSheet");
var overlayEl  = document.getElementById("langOverlay");
var tranFab    = document.getElementById("translateBtn");
var dlAllBtnEl = document.getElementById("dlAllBtn");
var installBtn = document.getElementById("installApp");

var scanner  = null;
var flashOn  = false;
var lastScan = "";
var histList = [];

/* ================================================================
   LANGUAGE SHEET — OPEN / CLOSE
   ================================================================ */
function openSheet() {
    refreshDLUI();
    sheetEl.classList.add("show");
    overlayEl.classList.add("show");
}
function closeSheet() {
    sheetEl.classList.remove("show");
    overlayEl.classList.remove("show");
}

toLangBtn.addEventListener("touchstart", function(e) { e.preventDefault(); openSheet(); }, { passive: false });
toLangBtn.addEventListener("click",      function(e) { e.preventDefault(); openSheet(); });
overlayEl.addEventListener("touchstart", function(e) { e.preventDefault(); closeSheet(); }, { passive: false });
overlayEl.addEventListener("click", closeSheet);

/* ================================================================
   REFRESH DOWNLOAD UI
   ================================================================ */
function refreshDLUI() {
    document.querySelectorAll(".lang-row").forEach(function(row) {
        var code = row.getAttribute("data-code");
        var btn  = document.getElementById("dl-" + code);
        var lbl  = document.getElementById("ls-" + code);
        if (!btn) return;

        row.classList.remove("cur-sel");

        if (code === LANG.code) {
            row.classList.add("cur-sel");
            btn.className   = "dl-btn dl-active";
            btn.textContent = "✓ Active";
            if (lbl) lbl.textContent = "Currently selected";
        } else if (DL[code]) {
            btn.className   = "dl-btn dl-ready";
            btn.textContent = "✓ Ready";
            if (lbl) lbl.textContent = "✓ Ready to use";
        } else {
            btn.className   = "dl-btn dl-need";
            btn.textContent = "⬇ Download";
            if (lbl) lbl.textContent = "Download karo";
        }
    });
}

/* ================================================================
   DOWNLOAD LANGUAGE
   Download = Google se verify karo ki ye language kaam kar rahi hai
   Success pe localStorage cache mein save karo
   ================================================================ */
async function downloadLang(code, name) {
    var btn = document.getElementById("dl-" + code);
    var lbl = document.getElementById("ls-" + code);
    if (!btn) return;

    btn.className   = "dl-btn dl-loading";
    btn.textContent = "⏳ Checking...";
    if (lbl) lbl.textContent = "Connecting...";

    var ok = false;

    /* ── Test 1: translate-pa (primary) ── */
    try {
        var paUrl = "https://translate-pa.googleapis.com/v1/translateHtml"
                  + "?key=AIzaSyDm-0OFGWqnqxMBBSrxMhBzHpjFSl5Vl0E";
        var paBody = JSON.stringify([[[code === "en" ? "hi" : "en"], "Hello"], code]);
        var paRes  = await fetch(paUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json+protobuf" },
            body: paBody,
            signal: AbortSignal.timeout(8000)
        });
        if (paRes.ok) {
            var paData = await paRes.json();
            if (paData && paData[0]) { ok = true; }
        }
    } catch(e) { console.warn("PA test fail:", code); }

    /* ── Test 2: Google GTX fallback ── */
    if (!ok) {
        try {
            var gtxUrl = "https://translate.googleapis.com/translate_a/single"
                       + "?client=gtx&sl=en&tl=" + code + "&dt=t&q=Hello";
            var gtxRes  = await fetch(gtxUrl, { signal: AbortSignal.timeout(8000) });
            var gtxData = await gtxRes.json();
            if (gtxData && gtxData[0] && gtxData[0][0] && gtxData[0][0][0]) { ok = true; }
        } catch(e) { console.warn("GTX test fail:", code); }
    }

    if (ok) {
        DL[code] = true;
        saveDL();
        btn.className   = "dl-btn dl-ready";
        btn.textContent = "✓ Ready";
        if (lbl) lbl.textContent = "✓ Download complete";
        console.log("✅ Verified:", code, name);
    } else {
        btn.className   = "dl-btn dl-need";
        btn.textContent = "⬇ Retry";
        if (lbl) lbl.textContent = "⚠ Failed — internet check karo";
    }
}

/* Download All */
if (dlAllBtnEl) {
    dlAllBtnEl.addEventListener("click", async function() {
        dlAllBtnEl.textContent = "⏳ Downloading...";
        dlAllBtnEl.disabled    = true;
        var rows = document.querySelectorAll(".lang-row");
        for (var i = 0; i < rows.length; i++) {
            var c = rows[i].getAttribute("data-code");
            var n = rows[i].getAttribute("data-name");
            if (!DL[c]) await downloadLang(c, n);
        }
        dlAllBtnEl.textContent = "✓ Sab ho gaya!";
        setTimeout(function() {
            dlAllBtnEl.textContent = "⬇ Saari Languages Download Karo";
            dlAllBtnEl.disabled    = false;
        }, 3000);
    });
}

/* ================================================================
   LANGUAGE ROW TAP
   ================================================================ */
document.querySelectorAll(".lang-row").forEach(function(row) {
    function handleTap(e) {
        /* Download button tapped */
        if (e.target && e.target.classList.contains("dl-btn")) {
            e.preventDefault();
            e.stopPropagation();
            downloadLang(row.getAttribute("data-code"), row.getAttribute("data-name"));
            return;
        }

        e.preventDefault();
        e.stopPropagation();

        /* ✅ Update global LANG */
        LANG.code = row.getAttribute("data-code");
        LANG.name = row.getAttribute("data-name");
        LANG.flag = row.getAttribute("data-flag");

        btnFlagEl.textContent = LANG.flag;
        btnNameEl.textContent = LANG.name;

        refreshDLUI();
        closeSheet();

        console.log("LANG →", LANG.code, LANG.name, "| DL:", !!DL[LANG.code]);

        /* Prompt download if not verified yet */
        if (!DL[LANG.code]) {
            setTimeout(function() {
                if (confirm("⚠ " + LANG.name + " abhi verify nahi hua.\n\nAbhi download karein? (Recommended)")) {
                    openSheet();
                    downloadLang(LANG.code, LANG.name);
                }
            }, 400);
        }
    }

    row.addEventListener("touchstart", handleTap, { passive: false });
    row.addEventListener("click",      handleTap);
});

/* ================================================================
   TYPE DETECTION
   ================================================================ */
function detectType(text) {
    text = text.trim();
    var ph = text.match(/\+?[0-9]{7,15}/);
    if (ph) return { type: "phone", value: ph[0] };
    var ur = text.match(/https?:\/\/[^\s]+/);
    if (ur) return { type: "url", value: ur[0] };
    var em = text.match(/[a-zA-Z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/);
    if (em) return { type: "email", value: em[0] };
    var up = text.match(/[a-zA-Z0-9.\-_]+@[a-zA-Z]+/);
    if (up) return { type: "upi", value: up[0] };
    return { type: "text", value: text };
}

/* ================================================================
   HISTORY
   ================================================================ */
function loadHist() {
    try {
        var s = localStorage.getItem("scanHistory");
        if (s) { histList = JSON.parse(s); renderHist(); }
    } catch(e) {}
}
function saveHist() {
    try { localStorage.setItem("scanHistory", JSON.stringify(histList)); } catch(e) {}
}
function addHist(text) {
    var plain = text.replace(/^- /gm, "").trim();
    histList.unshift({ text: plain, time: new Date().toLocaleString() });
    if (histList.length > 30) histList.pop();
    saveHist();
    renderHist();
}
if (clearBtn) clearBtn.onclick = function() { histList = []; saveHist(); renderHist(); };

function renderHist() {
    histCont.innerHTML = "";
    if (!histList.length) {
        histCont.innerHTML = '<div class="history-item"><p>No scans yet</p></div>';
        return;
    }
    histList.forEach(function(s) {
        var d  = document.createElement("div");
        d.className = "history-item";
        var t  = detectType(s.text);
        var ic = { phone: "📞", url: "🌐", email: "📧", upi: "💳" }[t.type] || "📄";
        d.innerHTML = "<p>" + ic + " " + s.text + "</p><small>" + s.time + "</small>";
        d.onclick   = function() {
            resultEl.innerText = s.text;
            document.querySelector(".result-floating").style.display = "block";
        };
        histCont.appendChild(d);
    });
}
loadHist();

/* ================================================================
   ACTION BUTTONS
   ================================================================ */
openBtn.onclick = function() {
    var r = detectType(resultEl.innerText);
    if (r.type === "phone")  { window.location.href = "tel:" + r.value; return; }
    if (r.type === "url")    { window.open(r.value, "_blank"); return; }
    if (r.type === "email")  { window.location.href = "mailto:" + r.value; return; }
    if (r.type === "upi")    { window.location.href = "upi://pay?pa=" + r.value; return; }
    alert("No action for this type");
};
copyBtn.onclick = function() {
    navigator.clipboard.writeText(resultEl.innerText);
    copyBtn.innerText = "Copied ✓";
    setTimeout(function() { copyBtn.innerText = "Copy"; }, 2000);
};
if (shareBtn) shareBtn.onclick = function() {
    if (navigator.share) navigator.share({ title: "Eris Scan", text: resultEl.innerText });
    else alert("Share not supported on this browser");
};

/* ================================================================
   QR SCANNER
   ================================================================ */
function onScanSuccess(text) {
    var r = detectType(text);
    if (r.value === lastScan) return;
    lastScan = r.value;
    resultEl.innerText = r.value;
    document.querySelector(".result-floating").style.display = "block";
    if (navigator.vibrate) navigator.vibrate([80, 40, 80]);
    addHist(r.value);
}

function startScanner() {
    scanner = new Html5Qrcode("reader");
    scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 250 },
        onScanSuccess
    ).catch(function(e) {
        resultEl.innerText = "Camera Error: " + e;
    });
}

startScanner();
getOCRWorker().catch(function() {}); /* warm up silently */

/* Flash */
if (flashNavBtn) flashNavBtn.onclick = async function() {
    try {
        if (!scanner) return;
        flashOn = !flashOn;
        await scanner.applyVideoConstraints({ advanced: [{ torch: flashOn }] });
    } catch(e) { alert("Flash not supported on this device"); }
};

/* ================================================================
   OCR CLEANER — Strong garbage filter, plain text output
   ================================================================ */
var JUNK = [
    "sources","submit","cancel","ok","close","menu","back","next","login","logout",
    "search","home","share","copy","paste","delete","edit","save","open","send",
    "reply","like","follow","subscribe","skip","done","ask gemini","gemini","fast",
    "install app","open link","install","go go","see more","load more","show more",
    "read more","view all","sign in","sign up","log in","log out","get started",
    "learn more","try again","refresh","reload","update","translate","download"
];

function cleanOCR(raw) {
    var lines = raw.split("\n");
    var seen  = {};
    var out   = [];

    lines.forEach(function(line) {
        line = line.trim();
        if (line.length < 6) return;

        /* Strip leading OCR noise */
        line = line.replace(/^[\-–—•*>|«»@#\+!~`\^\s]+/, "").trim();
        if (line.length < 6) return;

        /* Must have 50%+ real letters (Latin or Hindi/Devanagari) */
        var alpha = (line.match(/[a-zA-Z\u0900-\u097F]/g) || []).length;
        var total = line.replace(/\s/g, "").length;
        if (!total || alpha / total < 0.50) return;

        /* No pure symbol lines */
        if (/^[\s\W\d]+$/.test(line)) return;

        /* Drop lines with too many special chars */
        var specials = (line.match(/[$¢@%^&*()\[\]{}<>\\|=+#~`]/g) || []).length;
        if (specials > 1) return;

        var low = line.toLowerCase().replace(/\s+/g, " ").trim();

        /* Known UI/junk words */
        if (JUNK.indexOf(low) >= 0) return;

        /* Single short word = likely UI label */
        if (line.split(/\s+/).length === 1 && line.length < 8) return;

        /* Deduplicate */
        if (seen[low]) return;
        seen[low] = true;

        out.push(line);
    });

    if (!out.length) return "";
    return out.map(function(l) { return "- " + l; }).join("\n");
}

/* ================================================================
   OCR — Tesseract v5 + Canvas Preprocessing
   ================================================================ */
async function runOCR(file) {
    resultEl.innerText = "Reading image...";
    document.querySelector(".result-floating").style.display = "block";
    try {
        var img   = await createImageBitmap(file);
        var cv    = document.createElement("canvas");
        var ctx   = cv.getContext("2d");
        var scale = Math.max(1, 1600 / Math.max(img.width, img.height));
        cv.width  = img.width  * scale;
        cv.height = img.height * scale;
        ctx.filter = "grayscale(100%) contrast(165%) brightness(108%)";
        ctx.drawImage(img, 0, 0, cv.width, cv.height);

        var w = await getOCRWorker();
        await w.setParameters({ tessedit_pageseg_mode: "3" });
        var res = await w.recognize(cv);
        var fmt = cleanOCR(res.data.text);

        if (!fmt) {
            resultEl.innerText = "No readable text found. Try a clearer image.";
            return;
        }
        resultEl.innerText = fmt;
        addHist(fmt);
    } catch(e) {
        console.error("OCR Error:", e);
        resultEl.innerText = "OCR Error. Check internet connection.";
    }
}

/* Image Scan — QR first, OCR fallback */
if (imageNavBtn) imageNavBtn.onclick = function() { imageInput.click(); };
if (imageInput) imageInput.onchange = function() {
    var file = imageInput.files[0];
    if (!file) return;
    new Html5Qrcode("reader").scanFile(file, true)
    .then(function(text) {
        var r = detectType(text);
        resultEl.innerText = r.value;
        document.querySelector(".result-floating").style.display = "block";
        addHist(r.value);
        imageInput.value = "";
    })
    .catch(async function() {
        await runOCR(file);
        imageInput.value = "";
    });
};

/* ================================================================
   NAVIGATION
   ================================================================ */
scanNavBtn.onclick = function() {
    scanNavBtn.classList.add("active");
    histNavBtn.classList.remove("active");
    setNavBtn.classList.remove("active");
    scanSec.style.display = "block";
    histSec.style.display = "none";
    document.querySelector(".result-floating").style.display = "none";
    if (!scanner) startScanner();
};
histNavBtn.onclick = function() {
    scanNavBtn.classList.remove("active");
    histNavBtn.classList.add("active");
    setNavBtn.classList.remove("active");
    scanSec.style.display = "none";
    histSec.style.display = "block";
};
setNavBtn.onclick = function() {
    alert("Settings — coming soon!");
};

/* ================================================================
   PWA INSTALL
   ================================================================ */
var installPrompt = null;
window.addEventListener("beforeinstallprompt", function(e) {
    e.preventDefault();
    installPrompt = e;
    installBtn.style.display = "block";
});
installBtn.onclick = async function() {
    if (!installPrompt) return;
    installPrompt.prompt();
    var c = await installPrompt.userChoice;
    if (c.outcome === "accepted") console.log("App installed ✅");
    installPrompt = null;
    installBtn.style.display = "none";
};

/* ================================================================
   ✅ TRANSLATOR
   ----------------------------------------------------------------
   METHOD 1 — translate-pa.googleapis.com
     Google ka newer endpoint, no limit, CORS friendly

   METHOD 2 — translate.googleapis.com (GTX)
     Proven fallback, no API key, auto language detect

   Flow:
   1. Try translate-pa
   2. If fail → try GTX
   3. If both fail → show error
   ================================================================ */

/* Helper: Google translate-pa call */
async function translatePA(text, targetCode) {
    /* translate-pa accepts HTML format request */
    var url = "https://translate-pa.googleapis.com/v1/translateHtml"
            + "?key=AIzaSyDm-0OFGWqnqxMBBSrxMhBzHpjFSl5Vl0E";

    var body = JSON.stringify([[[text], "auto"], targetCode]);

    var res  = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json+protobuf" },
        body: body,
   
