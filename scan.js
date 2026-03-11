<!DOCTYPE html>

<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Eris Scan</title>
    <script src='https://unpkg.com/tesseract.js@4.0.2/dist/tesseract.min.js'></script>
    <script src="https://unpkg.com/html5-qrcode@2.3.8/minified/html5-qrcode.min.js"></script>
    <style>
        *{margin:0;padding:0;box-sizing:border-box;font-family:-apple-system,sans-serif}
        body{background:#000;color:#fff;min-height:100vh;display:flex;flex-direction:column}
        .header{padding:20px;background:#111;border-bottom:1px solid #333;display:flex;align-items:center;justify-content:space-between}
        .header h1{font-size:24px;background:linear-gradient(135deg,#667eea,#764ba2);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
        #installApp{background:#333;color:#fff;border:none;padding:8px 16px;border-radius:20px;font-size:14px;display:none}
        .main-content{flex:1;position:relative}
        .camera-section{min-height:500px;position:relative}
        #reader{width:100%;min-height:500px;background:#000}
        .scanner-controls{position:fixed;bottom:80px;left:0;right:0;display:flex;justify-content:center;gap:20px;padding:15px;z-index:10}
        .control-btn{background:rgba(0,0,0,.8);backdrop-filter:blur(10px);border:1px solid #333;color:#fff;width:60px;height:60px;border-radius:30px;font-size:24px;display:flex;align-items:center;justify-content:center;cursor:pointer}
        .result-floating{position:fixed;bottom:160px;left:20px;right:20px;background:rgba(20,20,30,.95);backdrop-filter:blur(10px);border:1px solid #333;border-radius:20px;padding:20px;z-index:20;display:none;animation:slideUp .3s}
        @keyframes slideUp{from{transform:translateY(100px);opacity:0}}
        .result-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
        .result-header h3{color:#888;font-size:14px}
        .result-actions{display:flex;gap:15px}
        .result-actions button{background:0 0;border:none;color:#667eea;font-size:20px;cursor:pointer}
        #result{font-size:16px;word-break:break-all;max-height:100px;overflow-y:auto;color:#fff}
        .history-section{padding:20px;display:none;height:100%;overflow-y:auto}
        .history-header{display:flex;justify-content:space-between;margin-bottom:20px}
        .history-header h2{font-size:20px;color:#fff}
        #clearHistory{background:#ff4444;color:#fff;border:none;padding:8px 16px;border-radius:20px;cursor:pointer}
        .history-item{background:#111;border:1px solid #333;border-radius:12px;padding:15px;margin-bottom:10px;cursor:pointer}
        .history-item p{font-size:16px;color:#fff;word-break:break-all}
        .history-item small{color:#666;font-size:12px}
        .bottom-nav{position:fixed;bottom:0;left:0;right:0;background:#111;border-top:1px solid #333;display:flex;justify-content:space-around;padding:10px 0;z-index:30}
        .nav-item{flex:1;display:flex;flex-direction:column;align-items:center;gap:5px;color:#666;font-size:12px;cursor:pointer}
        .nav-item i{font-size:24px}
        .nav-item.active{color:#667eea}
        #imageScan{display:none}
        .toast{position:fixed;bottom:200px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,.9);color:#fff;padding:12px 24px;border-radius:25px;font-size:14px;z-index:100;animation:fadeInOut 2s}
        @keyframes fadeInOut{0%{opacity:0;transform:translate(-50%,20px)}15%{opacity:1;transform:translate(-50%,0)}85%{opacity:1}100%{opacity:0;transform:translate(-50%,-20px)}}
    </style>
</head>
<body>
    <div class="header"><h1>ERIS SCAN</h1><button id="installApp">📲 Install</button></div>
    <div class="main-content">
        <div class="camera-section"><div id="reader"></div><div class="scanner-controls"><button class="control-btn" id="flashBtn">🔦</button><button class="control-btn" id="imageBtn">🖼️</button></div></div>
        <div class="history-section"><div class="history-header"><h2>Scan History</h2><button id="clearHistory">Clear All</button></div><div id="history"></div></div>
        <div class="result-floating"><div class="result-header"><h3>Scan Result</h3><div class="result-actions"><button id="openLink">🔗</button><button id="copyText">📋</button><button id="shareBtn">📤</button><button id="translateBtn">🌐</button></div></div><div id="result">No scan yet</div></div>
    </div>
    <div class="bottom-nav"><div class="nav-item active" id="scanBtn"><i>📷</i><span>Scan</span></div><div class="nav-item" id="historyBtn"><i>📜</i><span>History</span></div><div class="nav-item" id="settingsBtn"><i>⚙️</i><span>Settings</span></div></div>
    <input type="file" id="imageScan" accept="image/*" capture="environment">
    <script>
        let lastScan="",historyList=[],scanner=null,flashOn=!1;
        const r=document.getElementById("result"),open=document.getElementById("openLink"),copy=document.getElementById("copyText"),share=document.getElementById("shareBtn"),trans=document.getElementById("translateBtn"),hist=document.getElementById("history"),s=document.getElementById("scanBtn"),h=document.getElementById("historyBtn"),set=document.getElementById("settingsBtn"),f=document.getElementById("flashBtn"),img=document.getElementById("imageBtn"),clear=document.getElementById("clearHistory"),inp=document.getElementById("imageScan"),cam=document.querySelector(".camera-section"),sec=document.querySelector(".history-section"),DOM={resultText:r};
        function toast(m){let t=document.createElement('div');t.className='toast';t.textContent=m;document.body.appendChild(t);setTimeout(()=>t.remove(),2000);}
        async function transText(t){try{let d=await fetch("https://libretranslate.de/translate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({q:t,source:"auto",target:"en",format:"text"})});return(await d.json()).translatedText}catch(e){return console.error(e),toast("Translate failed"),t}}
        function detect(t){if(t=t.trim(),t.match(/\+?[0-9]{7,15}/))return{type:"phone",value:t.match(/\+?[0-9]{7,15}/)[0]};if(t.match(/https?:\/\/[^\s]+/))return{type:"url",value:t.match(/https?:\/\/[^\s]+/)[0]};if(t.match(/[a-zA-Z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/))return{type:"email",value:t.match(/[a-zA-Z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/)[0]};if(t.match(/[a-zA-Z0-9.\-_]+@[a-zA-Z]+/))return{type:"upi",value:t.match(/[a-zA-Z0-9.\-_]+@[a-zA-Z]+/)[0]};return{type:"text",value:t}}
        function load(){let s=localStorage.getItem("scanHistory");s&&(historyList=JSON.parse(s),render())}
        function save(){localStorage.setItem("scanHistory",JSON.stringify(historyList))}
        function add(t){let i={text:t,time:new Date().toLocaleString()};historyList.unshift(i);historyList.length>30&&historyList.pop();save();render()}
        function render(){hist.innerHTML="";if(!historyList.length){hist.innerHTML='<div class="history-item"><p>No scans yet</p></div>';return}historyList.forEach(s=>{let i=document.createElement("div");i.className="history-item";let ty=detect(s.text),ic={phone:"📞",url:"🌐",email:"📧",upi:"💳"}[ty.type]||"📄";i.innerHTML=`<p>${ic} ${s.text}</p><small>${s.time}</small>`;i.onclick=()=>{r.innerText=s.text;document.querySelector(".result-floating").style.display="block"};hist.appendChild(i)})}
        load();
        clear&&(clear.onclick=()=>{historyList=[];save();render()});
        open.onclick=()=>{let t=r.innerText,res=detect(t);if(res.type=="phone")window.location.href="tel:"+res.value;else if(res.type=="url")window.open(res.value,"_blank");else if(res.type=="email")window.location.href="mailto:"+res.value;else if(res.type=="upi")window.location.href="upi://pay?pa="+res.value;else alert("No action")};
        copy.onclick=()=>{navigator.clipboard.writeText(r.innerText);copy.innerText="✅";setTimeout(()=>copy.innerText="📋",2000)};
        share&&(share.onclick=()=>{let t=r.innerText;navigator.share?navigator.share({title:"QR Result",text:t}):alert("Share not supported")});
        trans&&(trans.onclick=async()=>{if(!DOM.resultText)return;let o=DOM.resultText.textContent;if(["No scan yet","Scanning text...","No text detected","OCR failed"].includes(o)){toast("No text to translate");return}toast("Translating...");DOM.resultText.textContent=await transText(o);toast("✓ Translated")});
        function onScanSuccess(d){let res=detect(d);if(res.value==lastScan)return;lastScan=res.value;r.innerText=res.value;document.querySelector(".result-floating").style.display="block";navigator.vibrate&&navigator.vibrate([80,40,80]);add(res.value)}
        function startScanner(){scanner=new Html5Qrcode("reader");scanner.start({facingMode:"environment"},{fps:10,qrbox:250},onScanSuccess).catch(e=>r.innerText="Camera Error: "+e)}
        startScanner();
        f&&(f.onclick=async()=>{try{if(!scanner)return;flashOn=!flashOn;await scanner.applyVideoConstraints({advanced:[{torch:flashOn}]});toast(flashOn?"Flash On":"Flash Off")}catch(e){alert("Flash not supported")}});
        async function runOCR(f){r.innerText="Scanning text...";try{let{data:{text:t}}=await Tesseract.recognize(f,'eng');if(!(t=t.trim()).length){alert("No text detected");r.innerText="No text detected";return}r.innerText=t;document.querySelector(".result-floating").style.display="block";add(t);toast("Text scanned")}catch(e){alert("OCR failed");r.innerText="OCR failed"}}
        img&&(img.onclick=()=>inp.click());
        inp&&(inp.onchange=function(){let f=inp.files[0];if(!f)return;let q=new Html5Qrcode("reader");q.scanFile(f,!0).then(d=>{let res=detect(d);r.innerText=res.value;document.querySelector(".result-floating").style.display="block";add(res.value);inp.value="";toast("QR detected")}).catch(async()=>{await runOCR(f);inp.value=""})});
        s.onclick=()=>{s.classList.add("active");h.classList.remove("active");set.classList.remove("active");cam.style.display="block";sec.style.display="none";document.querySelector(".result-floating").style.display="none";!scanner&&startScanner()};
        h.onclick=()=>{s.classList.remove("active");h.classList.add("active");set.classList.remove("active");cam.style.display="none";sec.style.display="block";document.querySelector(".result-floating").style.display="none"};
        set.onclick=()=>{s.classList.remove("active");h.classList.remove("active");set.classList.add("active");toast("Settings soon")};
        let installPrompt,ib=document.getElementById("installApp");
        window.addEventListener("beforeinstallprompt",(e)=>{e.preventDefault();installPrompt=e;ib.style.display="block"});
        ib.onclick=async()=>{if(!installPrompt)return;installPrompt.prompt();(await installPrompt.userChoice).outcome==="accepted"&&(console.log("App Installed"),toast("App installed"));installPrompt=null;ib.style.display="none"};
        console.log("Eris Loaded");
    </script>
</body>
</html>
```
