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

/* ================= BOTTOM NAVIGATION ================= */

const scanBtn = document.getElementById("scanBtn");
const historyBtn = document.getElementById("historyBtn");
const settingsBtn = document.getElementById("settingsBtn");

const scannerSection = document.querySelector(".scanner-section");
const resultSection = document.querySelector(".result-section");
const historySection = document.querySelector(".history-section");

/* SCAN BUTTON */

scanBtn.onclick = function(){

scanBtn.classList.add("active");
historyBtn.classList.remove("active");
settingsBtn.classList.remove("active");

scannerSection.style.display = "block";
resultSection.style.display = "block";
historySection.style.display = "none";

};

/* HISTORY BUTTON */

historyBtn.onclick = function(){

scanBtn.classList.remove("active");
historyBtn.classList.add("active");
settingsBtn.classList.remove("active");

scannerSection.style.display = "none";
resultSection.style.display = "none";
historySection.style.display = "block";

};

/* SETTINGS BUTTON */

settingsBtn.onclick = function(){

scanBtn.classList.remove("active");
historyBtn.classList.remove("active");
settingsBtn.classList.add("active");

alert("Settings page coming soon");

};

/* ================= QR GENERATOR ================= */

const generateBtn = document.getElementById("generateBtn");

generateBtn.addEventListener("click",function(){

let text = document.getElementById("qrInput").value;

let output = document.getElementById("qrOutput");

output.innerHTML="";

if(text.trim() === ""){

alert("Enter text or link");

return;

}

QRCode.toCanvas(text,function(err,canvas){

output.appendChild(canvas);

});

});
