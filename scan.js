/* ═══════════════════════════════════════════════════════════════════
   ERIS SCAN — ADVANCED APP LOGIC v3.0
   QR Scanner · Flash · Image Scan · OCR · History
   Smart Detection · Settings · PWA · Toast · Haptic
   Clay × Carbon × Sand
   ═══════════════════════════════════════════════════════════════════ */

'use strict';

/* ═══════════════════════════════════════════════════════════════════
   01 — APP STATE
═══════════════════════════════════════════════════════════════════ */
const AppState = {
    currentView:    'scan',       // 'scan' | 'history' | 'settings'
    scanner:        null,         // Html5Qrcode instance
    scannerRunning: false,        // is camera active
    flashOn:        false,        // torch state
    lastScanned:    '',           // last decoded text
    cooldown:       false,        // scan debounce
    installPrompt:  null,         // PWA deferred prompt
    historyList:    [],           // in-memory history array
    settings: {
        vibrate:     true,        // haptic feedback
        autoOpen:    false,       // auto open URLs
        saveHistory: true,        // persist history
    }
};

/* ═══════════════════════════════════════════════════════════════════
   02 — DOM CACHE
   All elements grabbed once on load
═══════════════════════════════════════════════════════════════════ */
const DOM = (() => {
    const g = id => document.getElementById(id);
    const q = sel => document.querySelector(sel);

    return {
        /* App */
        app:              q('.app'),

        /* Camera */
        reader:           g('reader'),
        scanBox:          g('scanBox'),
        cameraSection:    q('.camera-section'),

        /* Result Card */
        resultCard:       g('resultCard'),
        resultText:       g('result'),
        resultTypeTag:    g('resultTypeTag'),
        openBtn:          g('openLink'),
        copyBtn:          g('copyText'),
        shareBtn:         g('shareBtn'),
        installBtn:       g('installApp'),

        /* History */
        historySection:   g('historySection'),
        historyList:      g('history'),
        historyCount:     g('historyCount'),
        clearHistoryBtn:  g('clearHistory'),
        clearFromSettings:g('clearFromSettings'),

        /* Settings */
        settingsSection:  g('settingsSection'),
        toggleVibrate:    g('toggleVibrate'),
        toggleAutoOpen:   g('toggleAutoOpen'),
        toggleSaveHistory:g('toggleSaveHistory'),

        /* Navbar */
        scanBtn:          g('scanBtn'),
        flashBtn:         g('flashBtn'),
        imageBtn:         g('imageBtn'),
        historyBtn:       g('historyBtn'),
        settingsBtn:      g('settingsBtn'),

        /* Misc */
        imageScan:        g('imageScan'),
        toast:            g('toast'),
    };
})();

/* ═══════════════════════════════════════════════════════════════════
   03 — CONSTANTS
═══════════════════════════════════════════════════════════════════ */
const HISTORY_KEY      = 'eris_scan_history';
const SETTINGS_KEY     = 'eris_scan_settings';
const MAX_HISTORY      = 150;
const SCAN_COOLDOWN_MS = 3000;
const TOAST_DEFAULT_MS = 2200;

const TYPE_MAP = {
    url:     { label: 'URL',     icon: '🌐', btnText: 'Open Link' },
    phone:   { label: 'PHONE',   icon: '📞', btnText: '📞 Call'   },
    email:   { label: 'EMAIL',   icon: '✉️',  btnText: '✉️ Email'  },
    upi:     { label: 'UPI',     icon: '💳', btnText: '💳 Pay'    },
    wifi:    { label: 'WIFI',    icon: '📶', btnText: '📶 Connect' },
    sms:     { label: 'SMS',     icon: '💬', btnText: '💬 SMS'    },
    contact: { label: 'CONTACT', icon: '👤', btnText: 'Open'      },
    geo:     { label: 'LOCATION',icon: '📍', btnText: '📍 Maps'   },
    event:   { label: 'EVENT',   icon: '📅', btnText: 'Open'      },
    text:    { label: 'TEXT',    icon: '📄', btnText: 'Open'      },
    data:    { label: 'DATA',    icon: '🔗', btnText: 'Open'      },
};

/* ═══════════════════════════════════════════════════════════════════
   04 — UTILITIES
═══════════════════════════════════════════════════════════════════ */

/**
 * Safe getElementById shorthand
 */
function eid(id) {
    return document.getElementById(id);
}

/**
 * Escape HTML to prevent XSS in dynamic renders
 */
function escHtml(str) {
    return String(str)
        .replace(/&/g,  '&amp;')
        .replace(/</g,  '&lt;')
        .replace(/>/g,  '&gt;')
        .replace(/"/g,  '&quot;')
        .replace(/'/g,  '&#39;');
}

/**
 * Truncate string with ellipsis
 */
function truncate(str, max) {
    return str.length > max ? str.slice(0, max) + '…' : str;
}

/**
 * Format date to readable string
 */
function formatDate(ts) {
    const d = new Date(ts);
    return d.toLocaleString('en-IN', {
        day:    '2-digit',
        month:  'short',
        hour:   '2-digit',
        minute: '2-digit',
        hour12: true,
    });
}

/**
 * Debounce function
 */
function debounce(fn, ms) {
    let t;
    return function (...args) {
        clearTimeout(t);
        t = setTimeout(() => fn.apply(this, args), ms);
    };
}

/**
 * Throttle function
 */
function throttle(fn, ms) {
    let last = 0;
    return function (...args) {
        const now = Date.now();
        if (now - last >= ms) {
            last = now;
            return fn.apply(this, args);
        }
    };
}

/* ═══════════════════════════════════════════════════════════════════
   05 — TOAST SYSTEM
═══════════════════════════════════════════════════════════════════ */
const Toast = (() => {
    let timer = null;

    function show(message, duration = TOAST_DEFAULT_MS) {
        if (!DOM.toast) return;
        DOM.toast.textContent = message;
        DOM.toast.classList.add('show');
        clearTimeout(timer);
        timer = setTimeout(hide, duration);
    }

    function hide() {
        if (!DOM.toast) return;
        DOM.toast.classList.remove('show');
    }

    return { show, hide };
})();

/* ═══════════════════════════════════════════════════════════════════
   06 — HAPTIC ENGINE
═══════════════════════════════════════════════════════════════════ */
const Haptic = {
    light()   { if (AppState.settings.vibrate && navigator.vibrate) navigator.vibrate([20]); },
    medium()  { if (AppState.settings.vibrate && navigator.vibrate) navigator.vibrate([40]); },
    heavy()   { if (AppState.settings.vibrate && navigator.vibrate) navigator.vibrate([60, 40, 60]); },
    success() { if (AppState.settings.vibrate && navigator.vibrate) navigator.vibrate([40, 30, 60]); },
    error()   { if (AppState.settings.vibrate && navigator.vibrate) navigator.vibrate([80, 60, 80]); },
    pattern(p){ if (AppState.settings.vibrate && navigator.vibrate) navigator.vibrate(p); },
};

/* ═══════════════════════════════════════════════════════════════════
   07 — SETTINGS ENGINE
═══════════════════════════════════════════════════════════════════ */
const Settings = {
    load() {
        try {
            const saved = localStorage.getItem(SETTINGS_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                Object.assign(AppState.settings, parsed);
            }
        } catch (e) {
            console.warn('Settings load failed:', e);
        }
        Settings.applyToUI();
    },

    save() {
        try {
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(AppState.settings));
        } catch (e) {
            console.warn('Settings save failed:', e);
        }
    },

    applyToUI() {
        const s = AppState.settings;
        if (DOM.toggleVibrate)     DOM.toggleVibrate.classList.toggle('on', s.vibrate);
        if (DOM.toggleAutoOpen)    DOM.toggleAutoOpen.classList.toggle('on', s.autoOpen);
        if (DOM.toggleSaveHistory) DOM.toggleSaveHistory.classList.toggle('on', s.saveHistory);
    },

    toggle(key, el) {
        AppState.settings[key] = !AppState.settings[key];
        if (el) el.classList.toggle('on', AppState.settings[key]);
        Settings.save();
        Haptic.light();
        Toast.show(
            AppState.settings[key]
                ? `✓ ${Settings.labels[key]} enabled`
                : `${Settings.labels[key]} disabled`
        );
    },

    labels: {
        vibrate:     'Vibration',
        autoOpen:    'Auto Open',
        saveHistory: 'Save History',
    },

    init() {
        Settings.load();

        if (DOM.toggleVibrate) {
            DOM.toggleVibrate.addEventListener('click', () => {
                Settings.toggle('vibrate', DOM.toggleVibrate);
            });
        }

        if (DOM.toggleAutoOpen) {
            DOM.toggleAutoOpen.addEventListener('click', () => {
                Settings.toggle('autoOpen', DOM.toggleAutoOpen);
            });
        }

        if (DOM.toggleSaveHistory) {
            DOM.toggleSaveHistory.addEventListener('click', () => {
                Settings.toggle('saveHistory', DOM.toggleSaveHistory);
            });
        }
    },
};

/* ═══════════════════════════════════════════════════════════════════
   08 — SMART TYPE DETECTION ENGINE
   Detects: URL, Phone, Email, UPI, WiFi, SMS, vCard,
            GEO, Calendar Event, Plain Text
═══════════════════════════════════════════════════════════════════ */
const TypeDetector = {
    detect(raw) {
        const text = raw.trim();

        /* ── URL ── */
        if (/^https?:\/\//i.test(text)) {
            return { type: 'url', value: text, ...TYPE_MAP.url };
        }

        /* ── Phone (tel: prefix) ── */
        if (/^tel:/i.test(text)) {
            const num = text.replace(/^tel:/i, '').replace(/\s/g, '');
            return { type: 'phone', value: num, ...TYPE_MAP.phone };
        }

        /* ── Phone (digit pattern) ── */
        if (/^\+?[\d\s\-\(\)]{7,16}$/.test(text)) {
            return { type: 'phone', value: text.replace(/\s/g, ''), ...TYPE_MAP.phone };
        }

        /* ── Email (mailto: prefix) ── */
        if (/^mailto:/i.test(text)) {
            const addr = text.replace(/^mailto:/i, '').split('?')[0];
            return { type: 'email', value: addr, ...TYPE_MAP.email };
        }

        /* ── Email pattern ── */
        const emailMatch = text.match(/^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/);
        if (emailMatch) {
            return { type: 'email', value: emailMatch[0], ...TYPE_MAP.email };
        }

        /* ── vCard / Contact ── */
        if (/^BEGIN:VCARD/i.test(text)) {
            const nameMatch = text.match(/FN:(.+)/i);
            const name = nameMatch ? nameMatch[1].trim() : 'Contact';
            return { type: 'contact', value: text, display: name, ...TYPE_MAP.contact };
        }

        /* ── WiFi ── */
        if (/^WIFI:/i.test(text)) {
            const ssidMatch = text.match(/S:([^;]+)/);
            const ssid = ssidMatch ? ssidMatch[1] : 'Network';
            return { type: 'wifi', value: text, display: ssid, ...TYPE_MAP.wifi };
        }

        /* ── SMS ── */
        if (/^smsto?:/i.test(text)) {
            return { type: 'sms', value: text, ...TYPE_MAP.sms };
        }

        /* ── GEO ── */
        if (/^geo:/i.test(text)) {
            return { type: 'geo', value: text, ...TYPE_MAP.geo };
        }

        /* ── Calendar Event ── */
        if (/^BEGIN:VEVENT/i.test(text)) {
            const summaryMatch = text.match(/SUMMARY:(.+)/i);
            const title = summaryMatch ? summaryMatch[1].trim() : 'Event';
            return { type: 'event', value: text, display: title, ...TYPE_MAP.event };
        }

        /* ── UPI (India) ── */
        if (/^upi:\/\//i.test(text)) {
            const paMatch = text.match(/pa=([^&]+)/);
            const pa = paMatch ? paMatch[1] : text;
            return { type: 'upi', value: text, display: pa, ...TYPE_MAP.upi };
        }

        /* ── UPI handle (VPA pattern) ── */
        if (/^[a-zA-Z0-9.\-_]+@[a-zA-Z]{3,}$/.test(text)) {
            return { type: 'upi', value: text, ...TYPE_MAP.upi };
        }

        /* ── Plain Text / Data ── */
        return { type: 'text', value: text, ...TYPE_MAP.text };
    },

    isActionable(type) {
        return ['url', 'phone', 'email', 'upi', 'sms', 'geo'].includes(type);
    },

    getActionUrl(det) {
        switch (det.type) {
            case 'url':   return det.value;
            case 'phone': return 'tel:' + det.value.replace(/\s/g, '');
            case 'email': return 'mailto:' + det.value;
            case 'upi':   return 'upi://pay?pa=' + encodeURIComponent(det.value);
            case 'sms':   return det.value;
            case 'geo':   return det.value;
            default:      return null;
        }
    },
};

/* ═══════════════════════════════════════════════════════════════════
   09 — HISTORY ENGINE
═══════════════════════════════════════════════════════════════════ */
const History = {
    load() {
        try {
            const saved = localStorage.getItem(HISTORY_KEY);
            AppState.historyList = saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.warn('History load failed:', e);
            AppState.historyList = [];
        }
        History.updateCount();
    },

    save() {
        try {
            localStorage.setItem(HISTORY_KEY, JSON.stringify(AppState.historyList));
        } catch (e) {
            console.warn('History save failed:', e);
        }
    },

    add(rawText, det) {
        if (!AppState.settings.saveHistory) return;

        /* Skip duplicates within last 60 seconds */
        const recentDupe = AppState.historyList.find(
            item => item.text === rawText && Date.now() - item.ts < 60000
        );
        if (recentDupe) return;

        det = det || TypeDetector.detect(rawText);

        AppState.historyList.unshift({
            text:    rawText,
            display: det.display || rawText,
            type:    det.label,
            icon:    det.icon,
            time:    formatDate(Date.now()),
            ts:      Date.now(),
            id:      Date.now() + Math.random().toString(36).slice(2),
        });

        /* Trim to max */
        if (AppState.historyList.length > MAX_HISTORY) {
            AppState.historyList = AppState.historyList.slice(0, MAX_HISTORY);
        }

        History.save();
        History.updateCount();
    },

    remove(id) {
        AppState.historyList = AppState.historyList.filter(i => i.id !== id);
        History.save();
        History.updateCount();
    },

    clear() {
        AppState.historyList = [];
        History.save();
        History.updateCount();
    },

    updateCount() {
        if (!DOM.historyCount) return;
        const n = AppState.historyList.length;
        DOM.historyCount.textContent = n + ' scan' + (n !== 1 ? 's' : '');
    },

    render() {
        if (!DOM.historyList) return;
        History.updateCount();

        if (AppState.historyList.length === 0) {
            DOM.historyList.innerHTML = `
                <div class="history-empty">
                    <div class="history-empty-icon">📭</div>
                    <div>No scans yet</div>
                    <div style="font-size:12px;margin-top:5px;opacity:0.55">
                        Scan a QR code to get started
                    </div>
                </div>`;
            return;
        }

        DOM.historyList.innerHTML = AppState.historyList.map((item, i) => `
            <div class="history-item" data-index="${i}" data-id="${item.id}">
                <div class="history-item-inner">
                    <div class="history-icon">${escHtml(item.icon || '🔗')}</div>
                    <div class="history-content">
                        <div class="history-tag">${escHtml(item.type || 'DATA')}</div>
                        <p>${escHtml(truncate(item.display || item.text, 100))}</p>
                        <small>${escHtml(item.time || '')}</small>
                    </div>
                </div>
            </div>
        `).join('');

        /* Click to re-show result */
        DOM.historyList.querySelectorAll('.history-item').forEach(el => {
            el.addEventListener('click', function () {
                const idx  = +this.dataset.index;
                const item = AppState.historyList[idx];
                if (!item) return;
                NavManager.show('scan');
                setTimeout(() => ResultCard.show(item.text), 260);
                Haptic.light();
            });
        });
    },

    confirmClear() {
        if (!confirm('Clear all scan history? This cannot be undone.')) return;
        History.clear();
        History.render();
        Toast.show('🗑 History cleared');
        Haptic.medium();
    },

    init() {
        History.load();
        if (DOM.clearHistoryBtn)   DOM.clearHistoryBtn.addEventListener('click',   History.confirmClear);
        if (DOM.clearFromSettings) DOM.clearFromSettings.addEventListener('click', History.confirmClear);
    },
};

/* ═══════════════════════════════════════════════════════════════════
   10 — RESULT CARD ENGINE
═══════════════════════════════════════════════════════════════════ */
const ResultCard = {
    currentDet: null,

    show(rawText) {
        const det = TypeDetector.detect(rawText);
        ResultCard.currentDet = det;

        /* Update type tag */
        if (DOM.resultTypeTag) DOM.resultTypeTag.textContent = det.label;

        /* Update text */
        if (DOM.resultText) DOM.resultText.textContent = det.value;

        /* Update Open button */
        if (DOM.openBtn) {
            DOM.openBtn.textContent = det.btnText || 'Open';
            const actionable = TypeDetector.isActionable(det.type);
            DOM.openBtn.style.opacity       = actionable ? '1' : '0.4';
            DOM.openBtn.style.pointerEvents = actionable ? 'auto' : 'none';
        }

        /* Show card */
        if (DOM.resultCard) DOM.resultCard.style.display = 'block';

        /* Animate scan box */
        ResultCard.animateScanBox();

        /* Haptic + auto open */
        Haptic.success();

        if (AppState.settings.autoOpen && det.type === 'url') {
            setTimeout(() => window.open(det.value, '_blank'), 750);
        }

        /* Save to history */
        History.add(rawText, det);
    },

    hide() {
        if (DOM.resultCard) DOM.resultCard.style.display = 'none';
        ResultCard.currentDet = null;
    },

    animateScanBox() {
        if (!DOM.scanBox) return;
        DOM.scanBox.classList.add('detected', 'scan-success');
        setTimeout(() => {
            DOM.scanBox.classList.remove('detected', 'scan-success');
        }, 950);
    },

    init() {
        /* Open */
        if (DOM.openBtn) {
            DOM.openBtn.addEventListener('click', () => {
                const det = ResultCard.currentDet;
                if (!det) return;
                const url = TypeDetector.getActionUrl(det);
                if (url) {
                    window.open(url, '_blank');
                } else {
                    Toast.show('No action available for this type');
                }
                Haptic.light();
            });
        }

        /* Copy */
        if (DOM.copyBtn) {
            DOM.copyBtn.addEventListener('click', async () => {
                const text = DOM.resultText ? DOM.resultText.textContent : '';
                if (!text) return;
                try {
                    await navigator.clipboard.writeText(text);
                    Toast.show('✓ Copied to clipboard');
                } catch {
                    /* Fallback for older browsers */
                    try {
                        const ta = document.createElement('textarea');
                        ta.value = text;
                        ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0;';
                        document.body.appendChild(ta);
                        ta.focus();
                        ta.select();
                        document.execCommand('copy');
                        document.body.removeChild(ta);
                        Toast.sh
