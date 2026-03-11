// HTML5 QR Code Scanner instance
let html5QrcodeScanner = null;
let isScanning = false;
let currentFlashState = false;
let scanHistory = JSON.parse(localStorage.getItem('scanHistory') || '[]');

// DOM Elements
const readerElement = document.getElementById('reader');
const resultBox = document.getElementById('result');
const openLinkBtn = document.getElementById('openLink');
const copyBtn = document.getElementById('copyText');
const shareBtn = document.getElementById('shareBtn');
const installBtn = document.getElementById('installApp');
const clearHistoryBtn = document.getElementById('clearHistory');
const historyDiv = document.getElementById('history');
const imageScanInput = document.getElementById('imageScan');

// Navigation
const scanBtn = document.getElementById('scanBtn');
const flashBtn = document.getElementById('flashBtn');
const imageBtn = document.getElementById('imageBtn');
const historyBtn = document.getElementById('historyBtn');
const settingsBtn = document.getElementById('settingsBtn');

// Initialize Scanner
function initScanner() {
    if (html5QrcodeScanner) {
        html5QrcodeScanner.clear();
    }
    
    html5QrcodeScanner = new Html5QrcodeScanner(
        "reader",
        { 
            fps: 10,
            qrbox: { width: 250, height: 250 },
            rememberLastUsedCamera: true,
            showTorchButtonIfSupported: false // We'll use custom flash
        },
        /* verbose= */ false
    );
    
    html5QrcodeScanner.render(onScanSuccess, onScanError);
    isScanning = true;
}

// Success callback
function onScanSuccess(decodedText, decodedResult) {
    // Stop scanning to prevent multiple scans
    if (html5QrcodeScanner) {
        html5QrcodeScanner.pause();
    }
    
    // Display result
    resultBox.innerText = decodedText;
    
    // Add to history
    addToHistory(decodedText);
    
    // Auto-open link if it's a URL
    if (isValidURL(decodedText)) {
        showLinkButtons(true);
    } else {
        showLinkButtons(false);
    }
}

// Error callback
function onScanError(errorMessage) {
    // Silent error - just for debugging
    // console.log(errorMessage);
}

// Check if string is valid URL
function isValidURL(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

// Show/hide link buttons based on content type
function showLinkButtons(isLink) {
    openLinkBtn.style.display = isLink ? 'inline-block' : 'none';
}

// Add to history
function addToHistory(text) {
    const timestamp = new Date().toLocaleString();
    scanHistory.unshift({ text, timestamp });
    
    // Keep only last 20 scans
    if (scanHistory.length > 20) {
        scanHistory.pop();
    }
    
    localStorage.setItem('scanHistory', JSON.stringify(scanHistory));
    renderHistory();
}

// Render history
function renderHistory() {
    if (!historyDiv) return;
    
    if (scanHistory.length === 0) {
        historyDiv.innerHTML = '<p class="empty-history">No scans yet</p>';
        return;
    }
    
    let html = '';
    scanHistory.forEach((item, index) => {
        html += `
            <div class="history-item" data-index="${index}">
                <div class="history-content">
                    <p class="history-text">${item.text}</p>
                    <p class="history-time">${item.timestamp}</p>
                </div>
                <button class="history-delete" onclick="deleteHistoryItem(${index})">×</button>
            </div>
        `;
    });
    
    historyDiv.innerHTML = html;
    
    // Add click listeners to history items
    document.querySelectorAll('.history-item .history-content').forEach(item => {
        item.addEventListener('click', function() {
            const index = this.parentElement.dataset.index;
            resultBox.innerText = scanHistory[index].text;
            
            if (isValidURL(scanHistory[index].text)) {
                showLinkButtons(true);
            } else {
                showLinkButtons(false);
            }
        });
    });
}

// Delete history item
window.deleteHistoryItem = function(index) {
    scanHistory.splice(index, 1);
    localStorage.setItem('scanHistory', JSON.stringify(scanHistory));
    renderHistory();
};

// Clear all history
function clearHistory() {
    if (confirm('Clear all scan history?')) {
        scanHistory = [];
        localStorage.setItem('scanHistory', JSON.stringify(scanHistory));
        renderHistory();
    }
}

// Open Link
openLinkBtn.addEventListener('click', () => {
    const text = resultBox.innerText;
    if (text && text !== 'Waiting for scan...' && isValidURL(text)) {
        window.open(text, '_blank');
    }
});

// Copy Text
copyBtn.addEventListener('click', () => {
    const text = resultBox.innerText;
    if (text && text !== 'Waiting for scan...') {
        navigator.clipboard.writeText(text).then(() => {
            alert('Copied to clipboard!');
        }).catch(() => {
            alert('Failed to copy');
        });
    }
});

// Share
shareBtn.addEventListener('click', () => {
    const text = resultBox.innerText;
    if (text && text !== 'Waiting for scan...' && navigator.share) {
        navigator.share({
            title: 'Scan Result',
            text: text
        }).catch(() => {});
    } else {
        alert('Sharing not supported or no content');
    }
});

// Flash Toggle
flashBtn.addEventListener('click', () => {
    if (html5QrcodeScanner && html5QrcodeScanner.getRunningTrackCamera) {
        // Try to toggle flash if supported
        html5QrcodeScanner.getRunningTrackCamera().then(camera => {
            if (camera) {
                currentFlashState = !currentFlashState;
                // Note: Flash control depends on browser implementation
                // This is a simplified version
                alert('Flash toggle - depends on browser support');
            }
        });
    }
});

// Image Scan
imageBtn.addEventListener('click', () => {
    imageScanInput.click();
});

imageScanInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
        // Use Tesseract for OCR
        const { data: { text } } = await Tesseract.recognize(
            file,
            'eng',
            { logger: m => console.log(m) }
        );
        
        if (text.trim()) {
            resultBox.innerText = text.trim();
            addToHistory(text.trim());
            
            if (isValidURL(text.trim())) {
                showLinkButtons(true);
            } else {
                showLinkButtons(false);
            }
        } else {
            alert('No text found in image');
        }
    } catch (error) {
        alert('OCR failed: ' + error.message);
    }
    
    // Clear input for next selection
    imageScanInput.value = '';
});

// Navigation
scanBtn.addEventListener('click', () => {
    // Reinitialize scanner if not scanning
    if (!isScanning) {
        initScanner();
    }
    
    // Scroll to camera
    document.querySelector('.camera-section').scrollIntoView({ behavior: 'smooth' });
});

historyBtn.addEventListener('click', () => {
    document.querySelector('.history-section').scrollIntoView({ behavior: 'smooth' });
});

settingsBtn.addEventListener('click', () => {
    alert('Settings - Coming soon!');
});

// PWA Install
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.style.display = 'block';
});

installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
        installBtn.style.display = 'none';
    }
    
    deferredPrompt = null;
});

// Clear history button
clearHistoryBtn.addEventListener('click', clearHistory);

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initScanner();
    renderHistory();
    
    // Check for PWA installability
    if (window.matchMedia('(display-mode: standalone)').matches) {
        installBtn.style.display = 'none';
    }
});

/* TRANSLATE FUNCTION */

const translateBtn = document.getElementById("translateBtn");

if(translateBtn){

translateBtn.onclick = async function(){

let text = resultBox.innerText;

if(!text || text === "Waiting for scan..."){
alert("Scan something first");
return;
}

resultBox.innerText = "Translating...";

try{

let res = await fetch("https://libretranslate.de/translate",{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({
q:text,
source:"auto",
target:"en",
format:"text"
})
});

let data = await res.json();

resultBox.innerText = data.translatedText;

}catch(e){

alert("Translation failed");

}

}

        }
