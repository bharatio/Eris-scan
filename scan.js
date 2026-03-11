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

/* =====================================================
SMART TYPE DETECTION FUNCTION
===================================================== */

function detectType(text) {
    text = text.trim();

    /* PHONE - 7 to 15 digits, optional + */
    let phone = text.match(/\+?[0-9]{7,15}/);
    if (phone) {
        return {
            type: "phone",
            value: phone[0]
        };
    }

    /* URL - http/https URLs */
    let url = text.match(/https?:\/\/[^\s]+/);
    if (url) {
        return {
            type: "url",
            value: url[0]
        };
    }

    /* EMAIL - standard email pattern */
    let email = text.match(/[a-zA-Z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/);
    if (email) {
        return {
            type: "email",
            value: email[0]
        };
    }

    /* UPI - handles @ybl, @okhdfcbank, etc */
    let upi = text.match(/[a-zA-Z0-9.\-_]+@[a-zA-Z]+/);
    if (upi) {
        return {
            type: "upi",
            value: upi[0]
        };
    }

    /* TEXT - default */
    return {
        type: "text",
        value: text
    };
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
    clearBtn.onclick = function() {
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
        
        switch(type.type) {
            case "phone": typeIcon = "📞"; break;
            case "url": typeIcon = "🌐"; break;
            case "email": typeIcon = "📧"; break;
            case "upi": typeIcon = "💳"; break;
            default: typeIcon = "📄";
        }

        item.innerHTML = `
            <p>${typeIcon} ${scan.text}</p>
            <small>${scan.time}</small>
        `;

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
    if (result.type === "phone") {
        window.location.href = "tel:" + result.value;
        return;
    }

    /* URL */
    if (result.type === "url") {
        window.open(result.value, "_blank");
        return;
    }

    /* EMAIL */
    if (result.type === "email") {
        window.location.href = "mailto:" + result.value;
        return;
    }

    /* UPI */
    if (result.type === "upi") {
        window.location.href = "upi://pay?pa=" + result.value;
        return;
    }

    alert("No action available for this type");
};

/* =====================================================
COPY TEXT
===================================================== */

copyBtn.onclick = function() {
    let text = resultBox.innerText;

    navigator.clipboard.writeText(text);
    copyBtn.innerText = "Copied";

    setTimeout(() => {
        copyBtn.innerText = "Copy";
    }, 2000);
};

/* =====================================================
SHARE RESULT
===================================================== */

if (shareBtn) {
    shareBtn.onclick = function() {
        let text = resultBox.innerText;

        if (navigator.share) {
            navigator.share({
                title: "QR Result",
                text: text
            });
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

    if (result.value === lastScan) {
        return;
    }

    lastScan = result.value;
    resultBox.innerText = result.value;

    /* show result card */
    document.querySelector(".result-floating").style.display = "block";

    /* premium vibration */
    if (navigator.vibrate) {
        navigator.vibrate([80, 40, 80]);
    }

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
        {
            fps: 10,
            qrbox: 250
        },
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
    flashBtn.onclick = async function() {
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
OCR FUNCTION - SCAN TEXT FROM IMAGE
===================================================== */

async function runOCR(file) {
    resultBox.innerText = "Scanning text...";

    try {
        const { data: { text } } = await Tesseract.recognize(
            file,
            'eng',
            {
                logger: m => console.log(m)
            }
        );

        let cleaned = text.trim();

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
    imageBtn.onclick = function() {
        imageInput.click();
    };
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
            .catch(async err => {
                /* QR not found → run OCR */
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
    if (!scanner) {
        startScanner();
    }
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

toLang.onclick = function() {
    popup.style.display = "block";
};

document.querySelectorAll(".lang-item").forEach(item => {
    item.onclick = function() {
        targetLang = item.dataset.lang;
        toLang.innerText = item.innerText;
        popup.style.display = "none";
    };
});

/* =====================================================
TRANSLATE BUTTON
===================================================== */

const translateBtn = document.getElementById("translateBtn");

translateBtn.onclick = async function() {

    let text = resultBox.innerText;

    if (!text || text === "Waiting for scan...") {
        alert("Scan something first");
        return;
    }

    resultBox.innerText = "Translating...";

    try {

        /* MyMemory API */
        let res = await fetch(
            "https://api.mymemory.translated.net/get?q=" +
            encodeURIComponent(text) +
            "&langpair=auto|" + targetLang
        );

        let data = await res.json();

        if (data.responseData) {
            resultBox.innerText = data.responseData.translatedText;
            return;
        }

        throw new Error("MyMemory failed");

    } catch (e) {

        try {

            /* LibreTranslate fallback */
            let res = await fetch("https://libretranslate.de/translate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    q: text,
                    source: "auto",
                    target: targetLang,
                    format: "text"
                })
            });

            let data = await res.json();
            resultBox.innerText = data.translatedText;

        } catch {

            resultBox.innerText = text;
            alert("Translation failed");

        }

    }

};

/* =====================================================
APP READY
===================================================== */

console.log("Eris Scan Advanced Loaded with OCR & Smart Detection");
      
