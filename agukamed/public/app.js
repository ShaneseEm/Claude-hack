/* ════════════════════════════════════════════════
   AgukaMed Frontend Logic
═══════════════════════════════════════════════ */

const $ = (id) => document.getElementById(id);

/* ───── Navigation tabs ───── */
document.querySelectorAll('.nav-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const view = tab.dataset.view;
    $('scan-section').style.display    = view === 'scan'   ? '' : 'none';
    $('result-section').style.display  = 'none';
    $('loading-section').style.display = 'none';
    $('access-section').style.display  = view === 'access' ? '' : 'none';
  });
});

/* ───── Language tabs in result ───── */
document.querySelectorAll('.lang-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.lang-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const lang = tab.dataset.lang;
    document.querySelectorAll('.lang-panel').forEach(p => p.classList.remove('active'));
    $(`panel-${lang}`).classList.add('active');
  });
});

/* ───── Server health indicator ───── */
(async () => {
  try {
    const res = await fetch('/api/health');
    const data = await res.json();
    const dot = $('status-dot');
    if (dot) {
      if (data.db === 'connected') {
        dot.textContent = '● Live · DB';
        dot.title = 'Server live · MongoDB connected';
      } else {
        dot.textContent = '● Live · Demo';
        dot.title = 'Server live · running in JSON demo mode';
      }
    }
  } catch (err) {
    const dot = $('status-dot');
    if (dot) { dot.textContent = '● Offline'; dot.title = 'Cannot reach server'; }
  }
})();

/* ───── File upload + dropzone ───── */
const dropzone = $('dropzone');
const fileInput = $('file-input');
const previewBar = $('preview-bar');
const previewImg = $('upload-preview');

let selectedFile = null;

dropzone?.addEventListener('click', () => fileInput.click());
['dragover', 'dragenter'].forEach(ev =>
  dropzone?.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.add('drag'); })
);
['dragleave', 'drop'].forEach(ev =>
  dropzone?.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.remove('drag'); })
);
dropzone?.addEventListener('drop', (e) => {
  const f = e.dataTransfer.files[0];
  if (f) handleFile(f);
});
fileInput?.addEventListener('change', (e) => {
  const f = e.target.files[0];
  if (f) handleFile(f);
});

function handleFile(file) {
  selectedFile = file;
  const reader = new FileReader();
  reader.onload = (e) => {
    previewImg.src = e.target.result;
    previewBar.style.display = '';
  };
  reader.readAsDataURL(file);
}

$('btn-remove-upload')?.addEventListener('click', () => {
  selectedFile = null;
  fileInput.value = '';
  previewBar.style.display = 'none';
});

$('btn-submit-upload')?.addEventListener('click', () => {
  if (!selectedFile) return alert('Please select an image first.');
  const form = new FormData();
  form.append('medicine', selectedFile);
  runAnalysis(form);
});

/* ───── Camera ───── */
const video = $('camera-feed');
const cameraPlaceholder = $('camera-placeholder');
let stream = null;

$('btn-toggle-camera')?.addEventListener('click', async () => {
  if (stream) {
    stream.getTracks().forEach(t => t.stop());
    stream = null;
    video.srcObject = null;
    video.style.display = 'none';
    cameraPlaceholder.style.display = '';
    $('btn-toggle-camera').textContent = 'Start Camera';
    $('btn-capture-scan').disabled = true;
    return;
  }
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    video.srcObject = stream;
    video.style.display = 'block';
    cameraPlaceholder.style.display = 'none';
    $('btn-toggle-camera').textContent = 'Stop Camera';
    $('btn-capture-scan').disabled = false;
  } catch (err) {
    alert('Could not access camera: ' + err.message);
  }
});

$('btn-capture-scan')?.addEventListener('click', () => {
  if (!stream) return;
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0);
  canvas.toBlob((blob) => {
    const form = new FormData();
    form.append('medicine', blob, 'capture.jpg');
    runAnalysis(form);
  }, 'image/jpeg', 0.92);
});

/* ───── Presets ───── */
document.querySelectorAll('.preset-pill').forEach(btn => {
  btn.addEventListener('click', () => {
    const form = new FormData();
    form.append('presetKey', btn.dataset.preset);
    runAnalysis(form);
  });
});

/* ───── Analysis flow ───── */
async function runAnalysis(formData) {
  $('scan-section').style.display = 'none';
  $('result-section').style.display = 'none';
  $('loading-section').style.display = '';

  // animate loading steps
  ['step-1', 'step-2', 'step-3', 'step-4'].forEach((id, i) => {
    setTimeout(() => $(id)?.classList.add('active'), i * 600);
  });

  try {
    const res = await fetch('/api/analyze', { method: 'POST', body: formData });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Analysis failed');
    renderResult(data);
  } catch (err) {
    console.error(err);
    alert('Analysis failed: ' + err.message);
    $('loading-section').style.display = 'none';
    $('scan-section').style.display = '';
  } finally {
    ['step-1', 'step-2', 'step-3', 'step-4'].forEach(id => $(id)?.classList.remove('active'));
  }
}

function renderResult(data) {
  const { scanned, verification, explanation, audioUrl } = data;

  // Status banner
  const banner = $('status-banner');
  banner.className = 'status-banner ' + (verification.alertLevel || 'warning');
  const emojiMap = { safe: '✅', warning: '⚠️', danger: '🚫' };
  const titleMap = {
    safe: 'Verified Safe',
    warning: 'Unverified — proceed with caution',
    danger: 'DANGER — Counterfeit / Unregistered'
  };
  $('status-emoji').textContent = emojiMap[verification.alertLevel] || '⚠️';
  $('status-title').textContent = titleMap[verification.alertLevel] || verification.matchType;
  $('status-reason').textContent = verification.reason || '';

  // Product card
  $('res-brand-name').textContent  = scanned.medicineName;
  $('res-generic-name').textContent = scanned.genericName;
  $('res-strength').textContent    = scanned.strength;
  $('res-manufacturer').textContent = scanned.manufacturer;
  $('res-reg-no').textContent      = scanned.regNo;
  $('res-expiry').textContent      = verification.expiryStatus || '—';

  // Instructions
  $('res-dosage-rw').textContent  = explanation.dosageSimpleRw;
  $('res-warning-rw').textContent = explanation.warningRw;
  $('res-dosage-en').textContent  = explanation.dosageSimpleEn;
  $('res-warning-en').textContent = explanation.warningEn;

  // Audio
  const audioCard = $('audio-card');
  const audio = $('native-audio');
  if (audioUrl) {
    audio.src = audioUrl;
    audioCard.style.display = '';
  } else {
    audioCard.style.display = 'none';
  }

  $('loading-section').style.display = 'none';
  $('result-section').style.display = '';
}

/* ───── Audio player ───── */
const audioEl = $('native-audio');
const playBtn = $('audio-play-btn');
const playIcon = playBtn?.querySelector('.play-icon');
const pauseIcon = playBtn?.querySelector('.pause-icon');

playBtn?.addEventListener('click', () => {
  if (!audioEl.src) return;
  if (audioEl.paused) audioEl.play(); else audioEl.pause();
});
audioEl?.addEventListener('play', () => {
  playIcon.style.display = 'none';
  pauseIcon.style.display = '';
  $('eq-bars')?.classList.add('playing');
});
audioEl?.addEventListener('pause', () => {
  playIcon.style.display = '';
  pauseIcon.style.display = 'none';
  $('eq-bars')?.classList.remove('playing');
});
audioEl?.addEventListener('timeupdate', () => {
  const t = audioEl.currentTime || 0;
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60).toString().padStart(2, '0');
  $('audio-time').textContent = `${m}:${s}`;
});

/* ───── Reset ───── */
$('btn-reset')?.addEventListener('click', () => {
  $('result-section').style.display = 'none';
  $('scan-section').style.display = '';
  selectedFile = null;
  fileInput && (fileInput.value = '');
  previewBar.style.display = 'none';
});

/* ═══════════ SMS demo ═══════════ */
async function smsSend() {
  const text = $('sms-input').value.trim();
  if (!text) return;
  $('sms-reply').textContent = 'Sending…';
  try {
    const res = await fetch('/api/sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text })
    });
    const data = await res.json();
    $('sms-reply').textContent = data.reply || 'No reply';
  } catch (err) {
    $('sms-reply').textContent = 'Error: ' + err.message;
  }
}
$('btn-sms-send')?.addEventListener('click', smsSend);
$('sms-input')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') smsSend(); });

/* ═══════════ WhatsApp demo ═══════════ */
function waFormat(text) {
  // Render WhatsApp-style *bold*, _italic_, `code`, line breaks, and basic escaping
  const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let html = escapeHtml(text);
  html = html.replace(/\*([^*\n]+)\*/g, '<b>$1</b>');
  html = html.replace(/_([^_\n]+)_/g, '<i>$1</i>');
  html = html.replace(/`([^`\n]+)`/g, '<code>$1</code>');
  html = html.replace(/\n/g, '<br/>');
  return html;
}

function waAddBubble(text, direction) {
  const chat = $('wa-chat');
  if (!chat) return;
  const div = document.createElement('div');
  div.className = 'wa-bubble wa-' + direction;
  div.innerHTML = waFormat(text);
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

function waAddImageBubble(dataUrl, direction) {
  const chat = $('wa-chat');
  if (!chat) return;
  const div = document.createElement('div');
  div.className = 'wa-bubble wa-' + direction;
  const img = document.createElement('img');
  img.src = dataUrl;
  img.alt = 'uploaded label';
  div.appendChild(img);
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

async function waSend() {
  const input = $('wa-input');
  const text = input.value.trim();
  if (!text) return;
  waAddBubble(text, 'outgoing');
  input.value = '';
  waAddBubble('…', 'incoming');
  try {
    const res = await fetch('/api/whatsapp/demo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text })
    });
    const data = await res.json();
    $('wa-chat').lastChild.innerHTML = waFormat(data.reply || 'No reply');
  } catch (err) {
    $('wa-chat').lastChild.textContent = 'Error: ' + err.message;
  }
}

async function waSendImage(file) {
  if (!file) return;

  // Show outgoing image preview
  const reader = new FileReader();
  reader.onload = (e) => waAddImageBubble(e.target.result, 'outgoing');
  reader.readAsDataURL(file);

  waAddBubble('📷 Analyzing photo…', 'incoming');

  const form = new FormData();
  form.append('image', file);

  try {
    const res = await fetch('/api/whatsapp/demo', { method: 'POST', body: form });
    const data = await res.json();
    $('wa-chat').lastChild.innerHTML = waFormat(data.reply || 'No reply');
  } catch (err) {
    $('wa-chat').lastChild.textContent = 'Error: ' + err.message;
  }
}

$('btn-wa-send')?.addEventListener('click', waSend);
$('wa-input')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') waSend(); });
$('btn-wa-attach')?.addEventListener('click', () => $('wa-file').click());
$('btn-wa-camera')?.addEventListener('click', () => $('wa-camera').click());
$('wa-file')?.addEventListener('change', (e) => { waSendImage(e.target.files[0]); e.target.value = ''; });
$('wa-camera')?.addEventListener('change', (e) => { waSendImage(e.target.files[0]); e.target.value = ''; });

/* ═══════════ USSD demo ═══════════ */
let ussdSession = { id: 'demo-' + Date.now(), text: '' };
const ussdScreen = $('ussd-screen');
const ussdInput = $('ussd-text-input');

async function ussdSend(text) {
  ussdScreen.textContent = 'Dialling…';
  try {
    const res = await fetch('/api/ussd', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: ussdSession.id, text })
    });
    const data = await res.text();
    ussdScreen.textContent = data.replace(/^CON\s*|^END\s*/i, '');
    if (data.startsWith('END')) {
      ussdSession = { id: 'demo-' + Date.now(), text: '' };
      ussdInput.value = '';
    }
  } catch (err) {
    ussdScreen.textContent = 'Error: ' + err.message;
  }
}

document.querySelectorAll('.ussd-key').forEach(key => {
  key.addEventListener('click', () => {
    const k = key.dataset.key;
    if (k === 'clear') {
      ussdInput.value = ussdInput.value.slice(0, -1);
      return;
    }
    if (k === 'send') {
      const next = ussdInput.value.trim();
      ussdSession.text = ussdSession.text ? `${ussdSession.text}*${next}` : next;
      ussdInput.value = '';
      ussdSend(ussdSession.text);
      return;
    }
    ussdInput.value += k;
  });
});

$('btn-ussd-reset')?.addEventListener('click', () => {
  ussdSession = { id: 'demo-' + Date.now(), text: '' };
  ussdInput.value = '';
  ussdSend('');
});

/* ═══════════ Report submission ═══════════ */
$('btn-report-submit')?.addEventListener('click', async () => {
  const productName = $('report-product').value.trim();
  if (!productName) return alert('Please enter the product name.');
  const payload = {
    productName,
    location: $('report-location').value.trim(),
    sellerInfo: $('report-seller').value.trim(),
    description: $('report-desc').value.trim(),
    channel: 'web'
  };
  try {
    const res = await fetch('/api/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    const box = $('report-confirm');
    if (data.success) {
      box.style.display = '';
      box.textContent = `✅ Report submitted. Ref: ${data.refId}`;
      $('report-product').value = '';
      $('report-location').value = '';
      $('report-seller').value = '';
      $('report-desc').value = '';
    } else {
      box.style.display = '';
      box.textContent = '⚠ ' + (data.error || 'Submission failed.');
    }
  } catch (err) {
    alert('Could not submit report: ' + err.message);
  }
});
