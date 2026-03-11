<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Eris Scan - Advanced QR Scanner</title>
    
    <!-- Tesseract OCR CDN -->
    <script src='https://unpkg.com/tesseract.js@4.0.2/dist/tesseract.min.js'></script>
    
    <!-- Html5Qrcode Scanner -->
    <script src="https://unpkg.com/html5-qrcode@2.3.8/minified/html5-qrcode.min.js"></script>
    
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
        }

        body {
            background: #000;
            color: white;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
        }

        /* Header */
        .header {
            padding: 20px;
            background: #111;
            border-bottom: 1px solid #333;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .header h1 {
            font-size: 24px;
            font-weight: 600;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        #installApp {
            background: #333;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 14px;
            display: none;
        }

        /* Main Content */
        .main-content {
            flex: 1;
            position: relative;
        }

        /* Camera Section */
        .camera-section {
            height: 100%;
            min-height: 500px;
            position: relative;
        }

        #reader {
            width: 100%;
            height: 100%;
            min-height: 500px;
            background: #000;
        }

        /* Scanner Controls */
        .scanner-controls {
            position: fixed;
            bottom: 80px;
            left: 0;
            right: 0;
            display: flex;
            justify-content: center;
            gap: 20px;
            padding: 15px;
            z-index: 10;
        }

        .control-btn {
            background: rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(10px);
            border: 1px solid #333;
            color: white;
            width: 60px;
            height: 60px;
            border-radius: 30px;
            font-size: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.3s ease;
        }

        .control-btn:active {
            transform: scale(0.95);
            background: #333;
        }

        /* Result Floating Card */
        .result-floating {
            position: fixed;
            bottom: 160px;
            left: 20px;
            right: 20px;
            background: rgba(20, 20, 30, 0.95);
            backdrop-filter: blur(10px);
            border: 1px solid #333;
            border-radius: 20px;
            padding: 20px;
            z-index: 20;
            display: none;
            animation: slideUp 0.3s ease;
        }

        @keyframes slideUp {
            from {
                transform: translateY(100px);
                opacity: 0;
            }
            to {
                transform: translateY(0);
                opacity: 1;
            }
        }

        .result-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }

        .result-header h3 {
            color: #888;
            font-size: 14px;
            font-weight: 500;
        }

        .result-actions {
            display: flex;
            gap: 15px;
        }

        .result-actions button {
            background: none;
            border: none;
            color: #667eea;
            font-size: 20px;
            cursor: pointer;
            transition: transform 0.2s ease;
        }

        .result-actions button:active {
            transform: scale(0.9);
        }

        #result {
            font-size: 16px;
            line-height: 1.5;
            word-break: break-all;
            max-height: 100px;
            overflow-y: auto;
            color: white;
        }

        /* History Section */
        .history-section {
            padding: 20px;
            display: none;
            height: 100%;
            overflow-y: auto;
        }

        .history-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }

        .history-header h2 {
            font-size: 20px;
            color: white;
        }

        #clearHistory {
            background: #ff4444;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 14px;
            cursor: pointer;
        }

        .history-item {
            background: #111;
            border: 1px solid #333;
            border-radius: 12px;
            padding: 15px;
            margin-bottom: 10px;
            cursor: pointer;
            transition: all 0.3s ease;
        }

        .history-item:active {
            transform: scale(0.98);
            background: #1a1a1a;
        }

        .history-item p {
            font-size: 16px;
            color: white;
            margin-bottom: 5px;
            word-break: break-all;
        }

        .history-item small {
            color: #666;
            font-size: 12px;
        }

        /* Bottom Navigation */
        .bottom-nav {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: #111;
            border-top: 1px solid #333;
            display: flex;
            justify-content: space-around;
            padding: 10px 0;
            z-index: 30;
        }

        .nav-item {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 5px;
            color: #666;
            font-size: 12px;
            cursor: pointer;
            transition: color 0.3s ease;
        }

        .nav-item i {
            font-size: 24px;
        }

        .nav-item.active {
            color: #667eea;
        }

        /* Hidden File Input */
        #imageScan {
            display: none;
        }

        /* Toast Message */
        .toast {
            position: fixed;
            bottom: 200px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 12px 24px;
            border-radius: 25px;
            font-size: 14px;
            z-index: 100;
            animation: fadeInOut 2s ease;
        }

        @keyframes fadeInOut {
            0% { opacity: 0; transform: translate(-50%, 20px); }
            15% { opacity: 1; transform: translate(-50%, 0); }
            85% { opacity: 1; transform: translate(-50%, 0); }
            100% { opacity: 0; transform: translate(-50%, -20px); }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>ERIS SCAN</h1>
        <button id="installApp">📲 Install</button>
    </div>

    <div class="main-content">
        <!-- Camera Section -->
        <div class="camera-section">
            <div id="reader"></div>
            
            <div class="scanner-controls">
                <button class="control-btn" id="flashBtn">🔦</button>
                <button class="control-btn" id="imageBtn">🖼️</button>
            </div>
        </div>

        <!-- History Section -->
        <div class="history-section">
            <div class="history-header">
                <h2>Scan History</h2>
                <button id="clearHistory">Clear All</button>
            </div>
            <div id="history"></div>
        </div>

        <!-- Result Floating Card -->
        <div class="result-floating">
            <div class="result-header">
                <h3>Scan Result</h3>
                <div class="result-actions">
                    <button id="openLink">🔗</button>
                    <button id="copyText">📋</button>
                    <button id="shareBtn">📤</button>
                    <button id="translateBtn">🌐</button>
                </div>
            </div>
            <div id="result">No scan yet</div>
        </div>
    </div>

    <!-- Bottom Navigation -->
    <div class="bottom-nav">
        <div class="nav-item active" id="scanBtn">
            <i>📷</i>
            <span>Scan</span>
        </div>
        <div class="nav-item" id="historyBtn">
            <i>📜</i>
            <span>History</span>
        </div>
        <div class="nav-item" id="settingsBtn">
            <i>⚙️</i>
            <span>Settings</span>
        </div>
    </div>

    <!-- Hidden File Input for Image Scan -->
    <input type="file" id="imageScan" accept="image/*" capture="environment">

    <script>
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
        const translateBtn = document.getElementById("translateBtn");

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

        /* DOM reference for result text */
        const DOM = {
            resultText: resultBox
        };

        /* ================= SIMPLE TOAST ================= */
        function showToast(message) {
            const toast = document.createElement('div');
            toast.className = 'toast';
            toast.textContent = message;
            document.body.appendChild(toast);
            
            setTimeout(() => {
                toast.remove();
            }, 2000);
        }

        /* =====================================================
        TRANSLATE FUNCTION - LibreTranslate API
        ===================================================== */
        
        async function translateText(text) {
            try {
                const res = await fetch("https://libretranslate.de/translate", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        q: text,
                        source: "auto",
                        target: "en",
                        format: "text"
                    })
                });

                const data = await res.json();
                return data.translatedText;
            } catch (e) {
                console.error(e);
                showToast("Translate failed");
                return text;
            }
        }

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
            copyBtn.innerText = "✅";

            setTimeout(() => {
                copyBtn.innerText = "📋";
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
        TRANSLATE BUTTON ACTION
        ===================================================== */
        
        if(translateBtn) {
            translateBtn.onclick = async () => {
                if(!DOM.resultText) return;

                const original = DOM.resultText.textContent;
                
                if(original === "No scan yet" || original === "Scanning text..." || original === "No text detected" || original === "OCR failed") {
                    showToast("No text to translate");
                    return;
                }

                showToast("Translating...");

                const translated = await translateText(original);
                
                DOM.resultText.textContent = translated;
                
                showToast("✓ Translated to English");
            };
        }

        /* =====================================================
        SCAN SUCCESS (UPDATED)
        ===================================================== */

        function onScanSuccess(decodedText) {
            let result = detectType(decodedText);

            if (result.value === lastScan) {
                retur
