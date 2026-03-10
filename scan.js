/* =====================================================
ERIS SCAN – COMPLETE APP LOGIC
QR SCANNER + HISTORY + SMART LINK DETECTION
===================================================== */

let lastScan = "";
let historyList = [];
let scanner;

/* ================= ELEMENTS ================= */

const resultBox = document.getElementById("result");
const openBtn = document.getElementById("openLink");
const copyBtn = document.getElementById("copyText");
const historyContainer = document.getElementById("history");

const scanBtn = document.getElementById("scanBtn");
const historyBtn = document.getElementById("historyBtn");
const settingsBtn = document.getElementById("settingsBtn");

const scannerSection = document.querySelector(".camera-section");
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
<p>No scans yet</p>
</div>
`;

return;

}

historyList.forEach(scan => {

let item = document.createElement("div");

item.className = "history-item";

item.innerHTML = `

<p>${scan.text}</p>
<small>${scan.time}</small>

`;

historyContainer.appendChild(item);

});

}

/* =====================================================
SMART LINK DETECTION
===================================================== */

function openDetectedLink(text){

text = text.trim();

/* website */

if(text.startsWith("http://") || text.startsWith("https://")){

window.location.href = text;
return;

}

/* www link */

if(text.startsWith("www.")){

window.location.href = "https://" + text;
return;

}

/* email */

if(text.includes("@") && text.includes(".")){

window.location.href = "mailto:" + text;
return;

}

/* phone */

if(/^[0-9+]+$/.test(text)){

window.location.href = "tel:" + text;
return;

}

alert("No valid link detected");

}

/* =====================================================
OPEN LINK BUTTON
===================================================== */

openBtn.onclick = function(){

let text = resultBox.innerText;

openDetectedLink(text);

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

/* history */

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
historySection.style.display = "none";

};

historyBtn.onclick = function(){

scanBtn.classList.remove("active");
historyBtn.classList.add("active");
settingsBtn.classList.remove("active");

scannerSection.style.display = "none";
historySection.style.display = "block";

};

settingsBtn.onclick = function(){

scanBtn.classList.remove("active");
historyBtn.classList.remove("active");
settingsBtn.classList.add("active");

alert("Settings coming soon");

};

/* =====================================================
APP READY
===================================================== */

console.log("Eris Scan Loaded");
