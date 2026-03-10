/* =====================================================
ERIS SCAN – QR SCANNER LOGIC
===================================================== */

let lastScan = "";
let historyList = [];

const resultBox = document.getElementById("result");
const openBtn = document.getElementById("openLink");
const copyBtn = document.getElementById("copyText");
const historyContainer = document.getElementById("history");

/* ================= LOAD HISTORY ================= */

function loadHistory(){

const saved = localStorage.getItem("scanHistory");

if(saved){

historyList = JSON.parse(saved);

renderHistory();

}

}

loadHistory();

/* ================= SAVE HISTORY ================= */

function saveHistory(){

localStorage.setItem("scanHistory",JSON.stringify(historyList));

}

/* ================= ADD HISTORY ================= */

function addHistory(text){

const item = {

text:text,

time:new Date().toLocaleString()

};

historyList.unshift(item);

if(historyList.length > 20){

historyList.pop();

}

saveHistory();

renderHistory();

}

/* ================= RENDER HISTORY ================= */

function renderHistory(){

historyContainer.innerHTML = "";

historyList.forEach(scan => {

const item = document.createElement("div");
item.className = "history-item";

item.innerHTML = `

<div class="history-icon"></div><div class="history-content"><p class="history-title">${scan.text}</p><p class="history-time">${scan.time}</p></div>`;

historyContainer.appendChild(item);

});

}

/* ================= OPEN LINK ================= */

openBtn.onclick = function(){

const text = resultBox.innerText;

if(text.startsWith("http")){

window.open(text,"_blank");

}

};

/* ================= COPY TEXT ================= */

copyBtn.onclick = function(){

const text = resultBox.innerText;

navigator.clipboard.writeText(text);

copyBtn.innerText = "Copied";

setTimeout(() => {

copyBtn.innerText = "Copy Text";

},2000);

};

/* ================= SCAN SUCCESS ================= */

function onScanSuccess(decodedText){

if(decodedText === lastScan){

return;

}

lastScan = decodedText;

resultBox.innerText = decodedText;

/* vibration */

if(navigator.vibrate){

navigator.vibrate(120);

}

/* history */

addHistory(decodedText);

}

/* ================= SCANNER START ================= */

function startScanner(){

const html5QrCode = new Html5Qrcode("reader");

html5QrCode.start(

{ facingMode:"environment" },

{

fps:10,

qrbox:250

},

onScanSuccess

)

.catch(err => {

resultBox.innerText = "Camera Error: " + err;

});

}

startScanner();
