/* =====================================================
ERIS SCAN – COMPLETE APP LOGIC
QR SCANNER + GENERATOR + HISTORY
===================================================== */

let lastScan = "";
let historyList = [];
let scanner;

/* ================= ELEMENTS ================= */

const resultBox = document.getElementById("result");
const openBtn = document.getElementById("openLink");
const copyBtn = document.getElementById("copyText");
const historyContainer = document.getElementById("history");

const generateBtn = document.getElementById("generateBtn");
const qrInput = document.getElementById("qrInput");
const qrOutput = document.getElementById("qrOutput");

const scanBtn = document.getElementById("scanBtn");
const historyBtn = document.getElementById("historyBtn");
const settingsBtn = document.getElementById("settingsBtn");

const scannerSection = document.querySelector(".scanner-section");
const resultSection = document.querySelector(".result-section");
const historySection = document.querySelector(".history-section");

/* =====================================================
LOAD HISTORY
===================================================== */

function loadHistory(){

let saved = localStorage.getItem("scanHistory");

if(saved){

historyList = JSON.parse(saved);
renderHistory();

}

}

loadHistory();

/* =====================================================
SAVE HISTORY
===================================================== */

function saveHistory(){

localStorage.setItem("scanHistory",JSON.stringify(historyList));

}

/* =====================================================
ADD HISTORY
===================================================== */

function addHistory(text){

let item = {

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

/* =====================================================
RENDER HISTORY
===================================================== */

function renderHistory(){

historyContainer.innerHTML = "";

if(historyList.length === 0){

historyContainer.innerHTML = `
<div class="history-item">
<div class="history-icon"></div>
<div class="history-content">
<p class="history-title">No scans yet</p>
<p class="history-time">History will appear here</p>
</div>
</div>
`;

return;

}

historyList.forEach(scan => {

let item = document.createElement("div");

item.className = "history-item";

item.innerHTML = `

<div class="history-icon"></div>

<div class="history-content">
<p class="history-title">${scan.text}</p>
<p class="history-time">${scan.time}</p>
</div>

`;

historyContainer.appendChild(item);

});

}

/* =====================================================
OPEN LINK
===================================================== */

openBtn.onclick = function(){

let text = resultBox.innerText;

if(text.startsWith("http")){
window.open(text,"_blank");
}

};

/* =====================================================
COPY TEXT
===================================================== */

copyBtn.onclick = function(){

let text = resultBox.innerText;

navigator.clipboard.writeText(text);

copyBtn.innerText = "Copied";

setTimeout(()=>{

copyBtn.innerText="Copy Text";

},2000);

};

/* =====================================================
SCAN SUCCESS
===================================================== */

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

/* save history */

addHistory(decodedText);

}

/* =====================================================
START SCANNER
===================================================== */

function startScanner(){

scanner = new Html5Qrcode("reader");

scanner.start(

{ facingMode:"environment" },

{
fps:10,
qrbox:250
},

onScanSuccess

)

.catch(err=>{

resultBox.innerText = "Camera Error: " + err;

});

}

startScanner();

/* =====================================================
BOTTOM NAVIGATION
===================================================== */

scanBtn.onclick = function(){

scanBtn.classList.add("active");
historyBtn.classList.remove("active");
settingsBtn.classList.remove("active");

scannerSection.style.display = "block";
resultSection.style.display = "block";
historySection.style.display = "none";

};

historyBtn.onclick = function(){

scanBtn.classList.remove("active");
historyBtn.classList.add("active");
settingsBtn.classList.remove("active");

scannerSection.style.display = "none";
resultSection.style.display = "none";
historySection.style.display = "block";

};

settingsBtn.onclick = function(){

scanBtn.classList.remove("active");
historyBtn.classList.remove("active");
settingsBtn.classList.add("active");

alert("Settings page coming soon");

};

/* =====================================================
QR GENERATOR
===================================================== */

if(generateBtn){

generateBtn.addEventListener("click",function(){

let text = qrInput.value;

qrOutput.innerHTML = "";

if(text.trim()===""){

alert("Enter text or link");
return;

}

/* create QR image */

let img = document.createElement("img");

img.src = "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=" + encodeURIComponent(text);

img.style.width="220px";
img.style.height="220px";

qrOutput.appendChild(img);

});

}

/* =====================================================
APP READY
===================================================== */

console.log("Eris Scan Loaded");
