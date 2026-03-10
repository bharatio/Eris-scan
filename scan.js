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

if(historyList.length > 30){
historyList.pop();
}

saveHistory();
renderHistory();

}

/* =====================================================
CLEAR HISTORY
===================================================== */

if(clearBtn){

clearBtn.onclick = function(){

historyList = [];
saveHistory();
renderHistory();

};

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
`;return;

}

historyList.forEach(scan => {

let item = document.createElement("div");

item.className = "history-item";

item.innerHTML = `

<p>${scan.text}</p>
<small>${scan.time}</small>`;

/* history item click to show result */
item.onclick = function(){
resultBox.innerText = scan.text;
document.querySelector(".result-floating").style.display = "block";
};

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
window.open(text,"_blank");
return;
}

/* www */

if(text.startsWith("www.")){
window.open("https://" + text,"_blank");
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
OPEN LINK
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

copyBtn.innerText="Copy";

},2000);

};

/* =====================================================
SHARE RESULT
===================================================== */

if(shareBtn){

shareBtn.onclick = function(){

let text = resultBox.innerText;

if(navigator.share){

navigator.share({

title:"QR Result",
text:text

});

}else{

alert("Share not supported");

}

};

}

/* =====================================================
SCAN SUCCESS
===================================================== */

function onScanSuccess(decodedText){

if(decodedText === lastScan){
return;
}

lastScan = decodedText;

resultBox.innerText = decodedText;

/* show result card */
document.querySelector(".result-floating").style.display = "block";

/* premium vibration */

if(navigator.vibrate){
navigator.vibrate([80,40,80]);
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
FLASH TOGGLE
===================================================== */

if(flashBtn){

flashBtn.onclick = async function(){

try{

if(!scanner) return;

flashOn = !flashOn;

await scanner.applyVideoConstraints({

advanced:[{torch:flashOn}]

});

}catch(e){

alert("Flash not supported");

}

};

}

/* =====================================================
OCR FUNCTION - SCAN TEXT FROM IMAGE
===================================================== */

async function runOCR(file){

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

if(cleaned.length === 0){
alert("No text detected");
resultBox.innerText = "No text detected";
return;
}

resultBox.innerText = cleaned;

/* show result card */
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

if(imageBtn){

imageBtn.onclick = function(){

imageInput.click();

};

}

if(imageInput){

imageInput.onchange = function(){

let file = imageInput.files[0];

if(!file) return;

let html5Qr = new Html5Qrcode("reader");

html5Qr.scanFile(file,true)

.then(decodedText => {

resultBox.innerText = decodedText;

/* show result */
document.querySelector(".result-floating").style.display = "block";

addHistory(decodedText);

/* reset input */
imageInput.value = "";

})

.catch(async err => {

/* QR not found → run OCR */

await runOCR(file);

/* reset input */
imageInput.value = "";

});

};

}

/* =====================================================
BOTTOM NAVIGATION
===================================================== */

scanBtn.onclick = function(){

scanBtn.classList.add("active");
historyBtn.classList.remove("active");
settingsBtn.classList.remove("active");

scannerSection.style.display = "block";
historySection.style.display = "none";

document.querySelector(".result-floating").style.display = "none";

/* restart scanner if needed */
if(!scanner){
startScanner();
}

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
PWA INSTALL APP
===================================================== */

let installPrompt;

const installBtn = document.getElementById("installApp");

window.addEventListener("beforeinstallprompt",(e)=>{

e.preventDefault();

installPrompt = e;

installBtn.style.display = "block";

});

installBtn.onclick = async function(){

if(!installPrompt) return;

installPrompt.prompt();

const choice = await installPrompt.userChoice;

if(choice.outcome === "accepted"){
console.log("App Installed");
}

installPrompt = null;

installBtn.style.display = "none";

};

/* =====================================================
APP READY
===================================================== */

console.log("Eris Scan Advanced Loaded with OCR");
