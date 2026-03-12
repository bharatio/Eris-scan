/* ============================================================
   ERIS SCAN — COMPLETE WORKING CODE
   Translate  : MyMemory API (primary) + Google GTX (fallback)
   OCR        : Tesseract v5 + Canvas preprocessing
   Languages  : Download system — verify + cache in localStorage
   ============================================================ */

"use strict";

/* ── GLOBAL LANGUAGE STATE ────────────────────────────────── */
var LANG = { code: "en", name: "English", flag: "🇬🇧" };

/* ── DOWNLOADED CACHE ─────────────────────────────────────── */
var DL = {};

function loadDL() {
    try { DL = JSON.parse(localStorage.getItem("eris_dl") || "{}"); } catch(e) { DL = {}; }
    DL["en"] = true;
}
function saveDL() {
    try { localStorage.setItem("eris_dl", JSON.stringify(DL)); } catch(e) {}
}
loadDL();

/* ── LANG NAME MAP ────────────────────────────────────────── */
var GL = {
    en:"English", hi:"Hindi", es:"Spanish", fr:"French", de:"German",
    ru:"Russian", ar:"Arabic", zh:"Chinese", ja:"Japanese", ko:"Korean",
    ur:"Urdu", pt:"Portuguese", it:"Italian", bn:"Bengali", ta:"Tamil",
    te:"Telugu", ml:"Malayalam", mr:"Marathi", pa:"Punjabi", gu:"Gujarati"
};

/* ── OCR WORKER ───────────────────────────────────────────── */
var ocrWorker = null;
async function getOCRWorker() {
    if (!ocrWorker) ocrWorker = await Tesseract.createWorker("eng+hin");
    return ocrWorker;
}

/* ── ELEMENTS ─────────────────────────────────────────────── */
var EL = {
    result:     document.getElementById("result"),
    openBtn:    document.getElementById("openLink"),
    copyBtn:    document.getElementById("copyText"),
    shareBtn:   document.getElementById("shareBtn"),
    histCont:   document.getElementById("history"),
    scanBtn:    document.getElementById("scanBtn"),
    histBtn:    document.getElementById("historyBtn"),
    setBtn:     document.getElementById("settingsBtn"),
    flashBtn:   document.getElementById("flashBtn"),
    imageBtn:   document.getElementById("imageBtn"),
    clearBtn:   document.getElementById("clearHistory"),
    imageInput: document.getElementById("imageScan"),
    scanSec:    document.querySelector(".camera-section"),
    histSec:    document.querySelector(".history-section"),
    tBar:       document.getElementById("translateBar"),
    fromLang:   document.getElementById("fromLang"),
    toLangBtn:  document.getElementById("toLangBtn"),
    btnFlag:    document.getElementById("btnFlag"),
    btnName:    document.getElementById("btnName"),
    sheet:      document.getElementById("langSheet"),
    overlay:    document.getElementById("langOverlay"),
    tranBtn:    document.getElementById("translateBtn"),
    dlAllBtn:   document.getElementById("dlAllBtn"),
    installBtn: document.getElementById("installApp")
};

var scanner  = null;
var flashOn  = false;
var lastScan = "";
var histList = [];

/* ── SHEET OPEN / CLOSE ───────────────────────────────────── */
function openSheet() {
    refreshDLUI();
    EL.sheet.classList.add("show");
    EL.overlay.classList.add("show");
}
function closeSheet() {
    EL.sheet.classList.remove("show");
    EL.overlay.classList.remove("show");
}

/* Open on button — touchstart for instant mobile response */
EL.toLangBtn.addEventListener("touchstart", function(e) {
    e.preventDefault();
    openSheet();
}, { passive: false });
EL.toLangBtn.addEventListener("click", function(e) {
    e.preventDefault();
    openSheet();
});

/* Close on overlay */
EL.overlay.addEventListener("touchstart", function(e) {
    e.preventDefault();
    closeSheet();
}, { passive: false });
EL.overlay.addEventListener("click", closeSheet);

/* ── REFRESH DOWNLOAD UI ──────────────────────────────────── */
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
            if (lbl) lbl.textContent = "✓ Download complete";
        } else {
            btn.className   = "dl-btn dl-need";
            btn.textContent = "⬇ Download";
            if (lbl) lbl.textContent = "Download karo";
        }
    });
}

/* ── DOWNLOAD LANGUAGE ────────────────────────────────────── */
/*
   "Download" = API se verify karo ki ye language kaam kar rahi hai.
   Success pe localStorage mein cache karo.
   Phir translate hamesha is verified language pe kaam karega.
*/
async function downloadLang(code, name) {
    var btn = document.getElementById("dl-" + code);
    var lbl = document.getElementById("ls-" + code);
    if (!btn) return;

    btn.className   = "dl-btn dl-loading";
    btn.textContent = "⏳ Testing...";
    if (lbl) lbl.textContent = "Connecting...";

    var ok = false;

    /* Test 1: MyMemory */
    try {
        var url = "https://api.mymemory.translated.net/get"
                + "?q=" + encodeURIComponent("Hello")
                + "&langpair=en|" + code;
        var res  = await fetch(url, { signal: AbortSignal.timeout(9000) });
        var data = await res.json();
        if (data && data.responseData && data.responseData.translatedText
            && data.responseData.translatedText.toLowerCase() !== "hello") {
            ok = true;
        }
    } catch(e) { console.warn("MyMemory test fail:", code, e.message); }

    /* Test 2: Google GTX fallback */
    if (!ok) {
        try {
            var gurl = "https://translate.googleapis.com/translate_a/single"
                     + "?client=gtx&sl=en&tl=" + code + "&dt=t&q=Hello";
            var gres  = await fetch(gurl, { signal: AbortSignal.timeout(9000) });
            var gdata = await gres.json();
            if (gdata && gdata[0] && gdata[0][0] && gdata[0][0][0]) ok = true;
        } catch(e) { console.warn("GTX test fail:", code, e.message); }
    }

    if (ok) {
        DL[code] = true;
        saveDL();
        btn.className   = "dl-btn dl-ready";
        btn.textContent = "✓ Ready";
        if (lbl) lbl.textContent = "✓ Download complete";
        console.log("✅ Language verified:", code, name);
    } else {
        btn.className   = "dl-btn dl-need";
        btn.textContent = "⬇ Retry";
        if (lbl) lbl.textContent = "⚠ Failed — internet check karo";
    }
}

/* Download All button */
if (EL.dlAllBtn) {
    EL.dlAllBtn.addEventListener("click", async function() {
        EL.dlAllBtn.textContent = "Downloading...";
        EL.dlAllBtn.disabled    = true;
        var rows = document.querySelectorAll(".lang-row");
        for (var i = 0; i < rows.length; i++) {
            var c = rows[i].getAttribute("data-code");
            var n = rows[i].getAttribute("data-name");
            if (!DL[c]) await downloadLang(c, n);
        }
        EL.dlAllBtn.textContent = "✓ Sab ho gaya!";
        setTimeout(function() {
            EL.dlAllBtn.textContent = "⬇ Saari Languages Download Karo (Recommended)";
            EL.dlAllBtn.disabled = false;
        }, 3000);
    });
}

/* ── LANGUAGE ROW TAP ─────────────────────────────────────── */
document.querySelectorAll(".lang-row").forEach(function(row) {

    function handleTap(e) {
        /* Download button tapped — don't change lang */
        if (e.target && e.target.classList && e.target.classList.contains("dl-btn")) {
            e.preventDefault();
            e.stopPropagation();
            downloadLang(
                row.getAttribute("data-code"),
                row.getAttribute("data-name")
            );
            return;
        }

        e.preventDefault();
        e.stopPropagation();

        /* ✅ Update global LANG — snapshot taken here */
        LANG.code = row.getAttribute("data-code");
        LANG.name = row.getAttribute("data-name");
        LANG.flag = row.getAttribute("data-flag");

        /* Update button display */
        EL.btnFlag.textContent = LANG.flag;
        EL.btnName.textContent = LANG.name;

        refreshDLUI();
        closeSheet();

        console.log("LANG SET →", LANG.code, LANG.name, "| Downloaded:", !!DL[LANG.code]);

        /* Prompt download if not yet done */
        if (!DL[LANG.code]) {
            setTimeout(function() {
                if (confirm("⚠ " + LANG.name + " download nahi hua hai.\n\nAbhi download karein?\n(Recommended — 100% guarantee ke liye)")) {
                    openSheet();
                    downloadLang(LANG.code, LANG.name);
                }
            }, 400);
        }
    }

    row.addEventListener("touchstart", handleTap, { passive: false });
    row.addEventListener("click",      handleTap);
});

/* ── TYPE DETECTION ───────────────────────────────────────── */
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

/* ── HISTORY ──────────────────────────────────────────────── */
function loadHist() {
    try { var s = localStorage.getItem("scanHistory"); if (s) { histList = JSON.parse(s); renderHist(); } } catch(e) {}
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
if (EL.clearBtn) EL.clearBtn.onclick = function() { histList = []; saveHist(); renderHist(); };
function renderHist() {
    EL.histCont.innerHTML = "";
    if (!histList.length) {
        EL.histCont.innerHTML = '<div class="history-item"><p>No scans yet</p></div>';
        return;
    }
    histList.forEach(function(s) {
        var d = document.createElement("div");
        d.className = "history-item";
        var t  = detectType(s.text);
        var ic = { phone: "📞", url: "🌐", email: "📧", upi: "💳" }[t.type] || "📄";
        d.innerHTML = "<p>" + ic + " " + s.text + "</p><small>" + s.time + "</small>";
        d.onclick   = function() {
            EL.result.innerText = s.text;
            document.querySelector(".result-floating").style.display = "block";
        };
        EL.histCont.appendChild(d);
    });
}
loadHist();

/* ── ACTION BUTTONS ───────────────────────────────────────── */
EL.openBtn.onclick = function() {
    var r = detectType(EL.result.innerText);
    if (r.type === "phone")  { window.location.href = "tel:" + r.value; return; }
    if (r.type === "url")    { window.open(r.value, "_blank"); return; }
    if (r.type === "email")  { window.location.href = "mailto:" + r.value; return; }
    if (r.type === "upi")    { window.location.href = "upi://pay?pa=" + r.value; return; }
    alert("No action for this type");
};
EL.copyBtn.onclick = function() {
    navigator.clipboard.writeText(EL.result.innerText);
    EL.copyBtn.innerText = "Copied";
    setTimeout(function() { EL.copyBtn.innerText = "Copy"; }, 2000);
};
if (EL.shareBtn) EL.shareBtn.onclick = function() {
    if (navigator.share) navigator.share({ title: "QR Result", text: EL.result.innerText });
    else alert("Share not supported");
};

/* ── QR SCANNER ───────────────────────────────────────────── */
function onScanOK(text) {
    var r = detectType(text);
    if (r.value === lastScan) return;
    lastScan = r.value;
    EL.result.innerText = r.value;
    document.querySelector(".result-floating").style.display = "block";
    if (navigator.vibrate) navigator.vibrate([80, 40, 80]);
    addHist(r.value);
}
function startScanner() {
    scanner = new Html5Qrcode("reader");
    scanner.start({ facingMode: "environment" }, { fps: 10, qrbox: 250 }, onScanOK)
    .catch(function(e) { EL.result.innerText = "Camera Error: " + e; });
}
startScanner();
getOCRWorker().catch(function() {});  /* warm up silently */

if (EL.flashBtn) EL.flashBtn.onclick = async function() {
    try {
        if (!scanner) return;
        flashOn = !flashOn;
        await scanner.applyVideoConstraints({ advanced: [{ torch: flashOn }] });
    } catch(e) { alert("Flash not supported"); }
};

/* ── OCR CLEANER ──────────────────────────────────────────── */
var JUNK = [
    "sources", "submit", "cancel", "ok", "close", "menu", "back", "next",
    "login", "logout", "search", "home", "share", "copy", "paste", "delete",
    "edit", "save", "open", "send", "reply", "like", "follow", "subscribe",
    "skip", "done", "ask gemini", "gemini", "fast", "install app", "open link",
    "install", "go go", "see more", "load more", "show more", "read more",
    "view all", "sign in", "sign up", "log in", "log out", "get started",
    "learn more", "ask", "try again", "refresh", "reload", "update"
];

function cleanOCR(raw) {
    var lines = raw.split("\n");
    var seen  = {};
    var out   = [];

    lines.forEach(function(line) {
        line = line.trim();

        /* Minimum length */
        if (line.length < 7) return;

        /* Remove leading noise chars */
        line = line.replace(/^[\-–—•*>|«»@#\+!~`\^\s]+/, "").trim();
        if (line.length < 7) return;

        /* Must have 50%+ real letters (English or Hindi) */
        var alpha = (line.match(/[a-zA-Z\u0900-\u097F]/g) || []).length;
        var total = line.replace(/\s/g, "").length;
        if (!total || alpha / total < 0.50) return;

        /* No pure symbol lines */
        if (/^[\s\W\d]+$/.test(line)) return;

        /* No heavy special chars (garbage OCR lines) */
        if ((line.match(/[$¢@%^&*()\[\]{}<>\\|=+]/g) || []).length > 1) return;

        var low = line.toLowerCase().replace(/\s+/g, " ").trim();

        /* Known UI garbage */
        if (JUNK.indexOf(low) >= 0) return;

        /* Single short word = UI label */
        if (line.split(/\s+/).length === 1 && line.length < 8) return;

        /* Deduplicate */
        if (seen[low]) return;
        seen[low] = true;

        out.push(line);
    });

    return out.length ? out.map(function(l) { return "- " + l; }).join("\n") : "";
}

/* ── RUN OCR ──────────────────────────────────────────────── */
async function runOCR(file) {
    EL.result.innerText = "Reading image...";
    document.querySelector(".result-floating").style.display = "block";
    try {
        var img  = await createImageBitmap(file);
        var cv   = document.createElement("canvas");
        var ctx  = cv.getContext("2d");
        var sc   = Math.max(1, 1600 / Math.max(img.width, img.height));
        cv.width = img.width * sc;
        cv.height = img.height * sc;
        ctx.filter = "grayscale(100%) contrast(165%) brightness(108%)";
        ctx.drawImage(img, 0, 0, cv.width, cv.height);
        var w   = await getOCRWorker();
        await w.setParameters({ tessedit_pageseg_mode: "3" });
        var res = await w.recognize(cv);
        var fmt = cleanOCR(res.data.text);
        if (!fmt) { EL.result.innerText = "No readable text. Try clearer image."; return; }
        EL.result.innerText = fmt;
        addHist(fmt);
    } catch(e) {
        console.error("OCR:", e);
        EL.result.innerText = "OCR Error. Check connection.";
    }
}

/* Image scan */
if (EL.imageBtn) EL.imageBtn.onclick = function() { EL.imageInput.click(); };
if (EL.imageInput) EL.imageInput.onchange = function() {
    var file = EL.imageInput.files[0];
    if (!file) return;
    new Html5Qrcode("reader").scanFile(file, true)
    .then(function(t) {
        var r = detectType(t);
        EL.result.innerText = r.value;
        document.querySelector(".result-floating").style.display = "block";
        addHist(r.value);
        EL.imageInput.value = "";
    })
    .catch(async function() {
        await runOCR(file);
        EL.imageInput.value = "";
    });
};

/* ── NAVIGATION ───────────────────────────────────────────── */
EL.scanBtn.onclick = function() {
    EL.scanBtn.classList.add("active");
    EL.histBtn.classList.remove("active");
    EL.setBtn.classList.remove("active");
    EL.scanSec.style.display  = "block";
    EL.histSec.style.display  = "none";
    document.querySelector(".result-floating").style.display = "none";
    if (!scanner) startScanner();
};
EL.histBtn.onclick = function() {
    EL.scanBtn.classList.remove("active");
    EL.histBtn.classList.add("active");
    EL.setBtn.classList.remove("active");
    EL.scanSec.style.display = "none";
    EL.histSec.style.display = "block";
};
EL.setBtn.onclick = function() { alert("Settings coming soon"); };

/* ── PWA ──────────────────────────────────────────────────── */
var installPrompt = null;
window.addEventListener("beforeinstallprompt", function(e) {
    e.preventDefault();
    installPrompt = e;
    EL.installBtn.style.display = "block";
});
EL.installBtn.onclick = async function() {
    if (!installPrompt) return;
    installPrompt.prompt();
    var c = await installPrompt.userChoice;
    if (c.outcome === "accepted") console.log("App Installed");
    installPrompt = null;
    EL.installBtn.style.display = "none";
};

/* ── ✅ TRANSLATOR ────────────────────────────────────────── */
/*
   Primary   : MyMemory API — api.mymemory.translated.net
               CORS-free, works on GitHub Pages, no API key
   Fallback  : Google GTX — translate.googleapis.com
               Works most of the time
*/

if (EL.tranBtn) {
    EL.tranBtn.onclick = async function() {

        var text = EL.result.innerText;

        /* Nothing to translate */
        if (!text
            || text === "Waiting for scan..."
            || text === "Reading image..."
            || text.indexOf("Translating") === 0
            || text === "No readable text. Try clearer image.") {
            openSheet();
            return;
        }

        /* Language not downloaded — warn user */
        if (!DL[LANG.code]) {
            if (confirm("⚠ " + LANG.name + " download nahi hua hai!\n\nAbhi download karein?\n(Bina download ke kaam nahi karega)")) {
                openSheet();
                await downloadLang(LANG.code, LANG.name);
            }
            return;
        }

        /* ✅ Snapshot LANG at this exact moment */
        var TC = LANG.code;
        var TN = LANG.name;
        var TF = LANG.flag;

        console.log("=== TRANSLATE START ===");
        console.log("Target:", TC, TN);

        /* Show bar */
        if (EL.tBar)     EL.tBar.style.display    = "flex";
        if (EL.fromLang) EL.fromLang.innerText     = "Detecting...";
        if (EL.btnFlag)  EL.btnFlag.textContent    = TF;
        if (EL.btnName)  EL.btnName.textContent    = TN;

        var originalText = text;

        EL.tranBtn.style.opacity       = "0.5";
        EL.tranBtn.style.pointerEvents = "none";
        EL.result.innerText = "Translating to " + TN + "...";
        document.querySelector(".result-floating").style.display = "block";

        /* Strip dash bullets */
        var plain = text.replace(/^- /gm, "").trim();

        var translationDone = false;

        /* ── METHOD 1: MyMemory ─────────────────────── */
        try {
            /* Split into 490-char chunks (MyMemory 500 char limit) */
            var chunks = [];
            var tmp    = plain;
            while (tmp.length > 0) {
                chunks.push(tmp.substring(0, 490));
                tmp = tmp.substring(490);
            }

            var parts = [];
         
