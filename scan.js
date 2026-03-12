/* =====================================================
   ERIS SCAN — FULL WORKING CODE
   ===================================================== */

/* =====================================================
   ✅ LANGUAGE — Simple global object, NEVER stale
   Set karo aur bhool jao — hamesha sahi value milegi
   ===================================================== */
var LANG = { code: "en", name: "English", flag: "🇬🇧" };

/* OCR worker cache */
var ocrWorker = null;
async function getOCRWorker() {
    if (!ocrWorker) ocrWorker = await Tesseract.createWorker("eng+hin");
    return ocrWorker;
}

/* =====================================================
   ELEMENTS
   ===================================================== */
var resultBox      = document.getElementById("result");
var openBtn        = document.getElementById("openLink");
var copyBtn        = document.getElementById("copyText");
var shareBtn       = document.getElementById("shareBtn");
var histCont       = document.getElementById("history");
var scanBtn        = document.getElementById("scanBtn");
var histBtn        = document.getElementById("historyBtn");
var setBtn         = document.getElementById("settingsBtn");
var flashBtn       = document.getElementById("flashBtn");
var imageBtn       = document.getElementById("imageBtn");
var clearBtn       = document.getElementById("clearHistory");
var imageInput     = document.getElementById("imageScan");
var scanSec        = document.querySelector(".camera-section");
var histSec        = document.querySelector(".history-section");
var translateBar   = document.getElementById("translateBar");
var fromLangBox    = document.getElementById("fromLang");
var toLangBtn      = document.getElementById("toLangBtn");
var btnFlag        = document.getElementById("btnFlag");
var btnName        = document.getElementById("btnName");
var langSheet      = document.getElementById("langSheet");
var langOverlay    = document.getElementById("langOverlay");
var translateBtn   = document.getElementById("translateBtn");

var scanner = null;
var flashOn = false;
var lastScan = "";
var historyList = [];

/* =====================================================
   ✅ LANGUAGE SHEET — Open / Close
   ===================================================== */
function openSheet() {
    langSheet.classList.add("show");
    langOverlay.classList.add("show");
}
function closeSheet() {
    langSheet.classList.remove("show");
    langOverlay.classList.remove("show");
}

/* Open button */
toLangBtn.addEventListener("click", function(e) {
    e.preventDefault();
    e.stopPropagation();
    openSheet();
});

/* Close overlay */
langOverlay.addEventListener("click", function() {
    closeSheet();
});

/* =====================================================
   ✅ LANGUAGE ROWS — touchstart for instant response
   touchstart = fastest possible mobile tap response
   ===================================================== */
document.querySelectorAll(".lang-row").forEach(function(row) {

    function pickLang(e) {
        e.preventDefault();
        e.stopPropagation();

        /* ✅ Update global LANG object — single source of truth */
        LANG.code = row.getAttribute("data-code");
        LANG.name = row.getAttribute("data-name");
        LANG.flag = row.getAttribute("data-flag");

        /* Update button display */
        btnFlag.textContent = LANG.flag;
        btnName.textContent = LANG.name;

        /* Update checkmarks */
        document.querySelectorAll(".lang-row").forEach(function(r) {
            r.classList.remove("sel");
        });
        row.classList.add("sel");

        /* Close sheet */
        closeSheet();

        /* Confirm in console */
        console.log("LANG SET:", LANG.code, LANG.name);
    }

    /* touchstart = instant on mobile, no 300ms delay */
    row.addEventListener("touchstart", pickLang, { passive: false });
    /* click = fallback for desktop */
    row.addEventListener("click", pickLang);
});

/* =====================================================
   GOOGLE LANG NAMES — for source detection display
   ===================================================== */
var GL = {
    en:"English",hi:"Hindi",es:"Spanish",fr:"French",de:"German",
    ru:"Russian",ar:"Arabic",zh:"Chinese",ja:"Japanese",ko:"Korean",
    ur:"Urdu",pt:"Portuguese",it:"Italian",bn:"Bengali",ta:"Tamil",
    te:"Telugu",ml:"Malayalam",mr:"Marathi",pa:"Punjabi",gu:"Gujarati"
};

/* =====================================================
   TYPE DETECTION
   ===================================================== */
function detectType(text) {
    text = text.trim();
    if (/\+?[0-9]{7,15}/.test(text)) return { type:"phone", value:text.match(/\+?[0-9]{7,15}/)[0] };
    if (/https?:\/\/[^\s]+/.test(text)) return { type:"url", value:text.match(/https?:\/\/[^\s]+/)[0] };
    if (/[a-zA-Z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/.test(text)) return { type:"email", value:text.match(/[a-zA-Z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/)[0] };
    if (/[a-zA-Z0-9.\-_]+@[a-zA-Z]+/.test(text)) return { type:"upi", value:text.match(/[a-zA-Z0-9.\-_]+@[a-zA-Z]+/)[0] };
    return { type:"text", value:text };
}

/* =====================================================
   HISTORY
   ===================================================== */
function loadHistory() {
    var s = localStorage.getItem("scanHistory");
    if (s) { historyList = JSON.parse(s); renderHistory(); }
}
function saveHistory() {
    localStorage.setItem("scanHistory", JSON.stringify(historyList));
}
function addHistory(text) {
    var plain = text.replace(/^- /gm, "").trim();
    historyList.unshift({ text: plain, time: new Date().toLocaleString() });
    if (historyList.length > 30) historyList.pop();
    saveHistory();
    renderHistory();
}
if (clearBtn) {
    clearBtn.onclick = function() { historyList=[]; saveHistory(); renderHistory(); };
}
function renderHistory() {
    histCont.innerHTML = "";
    if (!historyList.length) { histCont.innerHTML='<div class="history-item"><p>No scans yet</p></div>'; return; }
    historyList.forEach(function(scan) {
        var item = document.createElement("div");
        item.className = "history-item";
        var t = detectType(scan.text);
        var icon = {phone:"📞",url:"🌐",email:"📧",upi:"💳"}[t.type]||"📄";
        item.innerHTML = "<p>"+icon+" "+scan.text+"</p><small>"+scan.time+"</small>";
        item.onclick = function() { resultBox.innerText=scan.text; document.querySelector(".result-floating").style.display="block"; };
        histCont.appendChild(item);
    });
}
loadHistory();

/* =====================================================
   OPEN LINK
   ===================================================== */
openBtn.onclick = function() {
    var r = detectType(resultBox.innerText);
    if (r.type==="phone")  { window.location.href="tel:"+r.value; return; }
    if (r.type==="url")    { window.open(r.value,"_blank"); return; }
    if (r.type==="email")  { window.location.href="mailto:"+r.value; return; }
    if (r.type==="upi")    { window.location.href="upi://pay?pa="+r.value; return; }
    alert("No action for this type");
};

/* COPY */
copyBtn.onclick = function() {
    navigator.clipboard.writeText(resultBox.innerText);
    copyBtn.innerText="Copied";
    setTimeout(function(){copyBtn.innerText="Copy";},2000);
};

/* SHARE */
if (shareBtn) {
    shareBtn.onclick = function() {
        if (navigator.share) navigator.share({title:"QR Result",text:resultBox.innerText});
        else alert("Share not supported");
    };
}

/* =====================================================
   QR SCANNER
   ===================================================== */
function onScanSuccess(text) {
    var r = detectType(text);
    if (r.value===lastScan) return;
    lastScan = r.value;
    resultBox.innerText = r.value;
    document.querySelector(".result-floating").style.display = "block";
    if (navigator.vibrate) navigator.vibrate([80,40,80]);
    addHistory(r.value);
}

function startScanner() {
    scanner = new Html5Qrcode("reader");
    scanner.start({facingMode:"environment"},{fps:10,qrbox:250},onScanSuccess)
    .catch(function(e){ resultBox.innerText="Camera Error: "+e; });
}
startScanner();
getOCRWorker().catch(function(){});

/* FLASH */
if (flashBtn) {
    flashBtn.onclick = async function() {
        try {
            if (!scanner) return;
            flashOn=!flashOn;
            await scanner.applyVideoConstraints({advanced:[{torch:flashOn}]});
        } catch(e){ alert("Flash not supported"); }
    };
}

/* =====================================================
   OCR CLEANER — no emoji, simple dash bullets
   ===================================================== */
var GARBAGE_WORDS = ["sources","submit","cancel","ok","close","menu","back","next",
    "login","logout","sign in","sign up","search","home","share","copy","paste",
    "delete","edit","save","open","send","reply","like","follow","subscribe",
    "skip","done","ask gemini","gemini","fast","install app","open link","install"];

function cleanOCR(raw) {
    var lines = raw.split("\n");
    var seen  = {};
    var out   = [];

    lines.forEach(function(line) {
        line = line.trim();
        if (line.length < 6) return;

        /* Remove leading garbage chars */
        line = line.replace(/^[\-–—•*>|«»@#\+]+\s*/,"").trim();
        if (line.length < 6) return;

        /* Alpha ratio — 45% real letters */
        var alpha = (line.match(/[a-zA-Z\u0900-\u097F]/g)||[]).length;
        var total = line.replace(/\s/g,"").length;
        if (!total || alpha/total < 0.45) return;

        /* Pure symbols */
        if (/^[\s\W\d]+$/.test(line)) return;

        /* Known UI garbage */
        var low = line.toLowerCase().trim();
        if (GARBAGE_WORDS.indexOf(low) >= 0) return;

        /* Heavy special chars */
        var sp = (line.match(/[$¢@#%^&*()\[\]{}<>]/g)||[]).length;
        if (sp > 1) return;

        /* Dedupe */
        if (seen[low]) return;
        seen[low] = true;

        out.push(line);
    });

    return out.length ? out.map(function(l){ return "- "+l; }).join("\n") : "";
}

/* =====================================================
   OCR — Tesseract v5 + Canvas
   ===================================================== */
async function runOCR(file) {
    resultBox.innerText = "Reading image...";
    document.querySelector(".result-floating").style.display = "block";
    try {
        var image  = await createImageBitmap(file);
        var canvas = document.createElement("canvas");
        var ctx    = canvas.getContext("2d");
        var scale  = Math.max(1, 1600/Math.max(image.width,image.height));
        canvas.width  = image.width*scale;
        canvas.height = image.height*scale;
        ctx.filter = "grayscale(100%) contrast(165%) brightness(108%)";
        ctx.drawImage(image,0,0,canvas.width,canvas.height);

        var worker = await getOCRWorker();
        await worker.setParameters({tessedit_pageseg_mode:"3"});
        var res = await worker.recognize(canvas);
        var formatted = cleanOCR(res.data.text);

        if (!formatted) { resultBox.innerText="No readable text found. Try clearer image."; return; }
        resultBox.innerText = formatted;
        addHistory(formatted);
    } catch(e) {
        console.error("OCR:",e);
        resultBox.innerText = "OCR Error. Check connection.";
    }
}

/* IMAGE SCAN */
if (imageBtn) imageBtn.onclick = function(){ imageInput.click(); };
if (imageInput) {
    imageInput.onchange = function() {
        var file = imageInput.files[0];
        if (!file) return;
        var q = new Html5Qrcode("reader");
        q.scanFile(file,true)
        .then(function(text){
            var r=detectType(text);
            resultBox.innerText=r.value;
            document.querySelector(".result-floating").style.display="block";
            addHistory(r.value);
            imageInput.value="";
        })
        .catch(async function(){
            await runOCR(file);
            imageInput.value="";
        });
    };
}

/* =====================================================
   NAVIGATION
   ===================================================== */
scanBtn.onclick = function() {
    scanBtn.classList.add("active"); histBtn.classList.remove("active"); setBtn.classList.remove("active");
    scanSec.style.display="block"; histSec.style.display="none";
    document.querySelector(".result-floating").style.display="none";
    if (!scanner) startScanner();
};
histBtn.onclick = function() {
    scanBtn.classList.remove("active"); histBtn.classList.add("active"); setBtn.classList.remove("active");
    scanSec.style.display="none"; histSec.style.display="block";
};
setBtn.onclick = function() {
    scanBtn.classList.remove("active"); histBtn.classList.remove("active"); setBtn.classList.add("active");
    alert("Settings coming soon");
};

/* =====================================================
   PWA
   ===================================================== */
var installPrompt;
var installBtn = document.getElementById("installApp");
window.addEventListener("beforeinstallprompt",function(e){
    e.preventDefault(); installPrompt=e; installBtn.style.display="block";
});
installBtn.onclick = async function() {
    if (!installPrompt) return;
    installPrompt.prompt();
    var c = await installPrompt.userChoice;
    if (c.outcome==="accepted") console.log("Installed");
    installPrompt=null; installBtn.style.display="none";
};

/* =====================================================
   ✅ TRANSLATOR — LANG global se seedha read
   Jo screen pe dikh raha hai wohi translate hoga
   ===================================================== */
if (translateBtn) {
    translateBtn.onclick = async function() {

        var text = resultBox.innerText;

        /* Agar scan nahi hua toh sheet open karo */
        if (!text || text==="Waiting for scan..." || text==="Reading image..." || text.indexOf("Translating")===0) {
            openSheet();
            return;
        }

        /* ✅ LANG global se direct read — DOM dependency zero */
        var targetCode = LANG.code;
        var targetName = LANG.name;
        var targetFlag = LANG.flag;

        console.log("=== TRANSLATE START ===");
        console.log("Target:", targetCode, targetName);

        /* Show bar */
        if (translateBar) translateBar.style.display="flex";
        if (fromLangBox)  fromLangBox.innerText="Detecting...";
        if (btnFlag)      btnFlag.textContent=targetFlag;
        if (btnName)      btnName.textContent=targetName;

        var originalText = text;
        translateBtn.style.opacity="0.5";
        translateBtn.style.pointerEvents="none";
        resultBox.innerText = "Translating to "+targetName+"...";
        document.querySelector(".result-floating").style.display="block";

        try {
            /* Strip dash bullets */
            var plain = text.replace(/^- /gm,"").trim();

            var url = "https://translate.googleapis.com/translate_a/single?client=gtx"
                    + "&sl=auto"
                    + "&tl=" + targetCode
                    + "&dt=t&dt=ld"
                    + "&q=" + encodeURIComponent(plain);

            console.log("URL tl param:", targetCode);

            var res  = await fetch(url);
            if (!res.ok) throw new Error("HTTP "+res.status);
            var data = await res.json();

            if (data && data[0]) {
                var translated = data[0]
                    .filter(function(x){ return x && x[0]; })
                    .map(function(x){ return x[0]; })
                    .join("");
                resultBox.innerText = translated;
                console.log("✅ Translation done to:", targetCode);
            } else {
                throw new Error("Empty response");
            }

            /* Source lang detect */
            var src = null;
            if (data[8] && data[8][0] && data[8][0][0]) src=data[8][0][0];
            else if (typeof data[2]==="string") src=data[2];
            if (fromLangBox) fromLangBox.innerText = src ? (GL[src]||src.toUpperCase()) : "Auto";

        } catch(e) {
            console.error("Translate error:",e);
            alert("Translation failed. Check internet.");
            resultBox.innerText = originalText;
            if (fromLangBox) fromLangBox.innerText="Error";
        } finally {
            translateBtn.style.opacity="1";
            translateBtn.style.pointerEvents="auto";
        }
    };
}

console.log("Eris Scan ✅ Ready");
      
