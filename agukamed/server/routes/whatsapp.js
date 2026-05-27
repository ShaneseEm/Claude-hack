const express       = require('express');
const router        = express.Router();
const axios         = require('axios');
const multer        = require('multer');
const path          = require('path');
const fs            = require('fs');
const verifyService = require('../services/verifyService');
const aiSimplifier  = require('../services/aiSimplifier');
const visionService = require('../services/visionService');
const ttsService    = require('../services/ttsService');

const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, `wa_${Date.now()}_${file.originalname}`)
  }),
  limits: { fileSize: 10 * 1024 * 1024 }
});

async function buildImageReply(imagePath) {
  const scanned = await visionService.scanLabel(imagePath, null);
  const report  = await verifyService.verifyMedicine(scanned);
  const simple  = await aiSimplifier.simplifyInstructions(scanned, report);

  let audioUrl = null;
  try { audioUrl = await ttsService.synthesizeKinyarwanda(simple.dosageSimpleRw); } catch (e) { /* noop */ }

  let reply;
  if (report.verified) {
    const rec = report.registryRecord || {};
    reply = `✅ *${scanned.medicineName}* — VERIFIED SAFE\n\nReg: ${rec.regNo || scanned.regNo}\nMfr: ${rec.manufacturer || scanned.manufacturer}\nExpiry: ${rec.expiryStatus || 'Valid'}\n\n📋 *How to take:*\n${simple.dosageSimpleRw}\n\n⚠️ *Warning:*\n${simple.warningRw}\n\n_AgukaMed | Rwanda FDA_`;
  } else if (report.alertLevel === 'danger') {
    reply = `🚫 *DANGER — ${scanned.medicineName}*\n\nThis product is UNREGISTERED or COUNTERFEIT.\n\n${simple.dosageSimpleRw}\n\nDo NOT consume. Report to nearest health center.\n\n_AgukaMed | Rwanda FDA_`;
  } else {
    reply = `⚠️ *UNVERIFIED — ${scanned.medicineName}*\n\nNot found in Rwanda FDA registry.\nConsult a pharmacist before use.\n\n_AgukaMed | Rwanda FDA_`;
  }

  return { reply, audioUrl, scanned, verification: report };
}

async function sendWhatsApp(to, text) {
  if (!process.env.WHATSAPP_TOKEN || !process.env.WHATSAPP_PHONE_ID) {
    console.log(`[WhatsApp] Reply to ${to}:\n${text}`);
    return;
  }
  await axios.post(
    `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_ID}/messages`,
    { messaging_product: 'whatsapp', to, type: 'text', text: { body: text } },
    { headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` } }
  );
}

/**
 * Build a WhatsApp-formatted reply from a plain-text user message
 * (shared by the live webhook and the in-app demo endpoint)
 */
async function buildTextReply(text) {
  const upper = (text || '').trim().toUpperCase();

  if (upper.startsWith('VERIFY')) {
    const query = text.replace(/verify/i, '').trim();
    if (!query) return 'Please send: VERIFY <medicine name>\nExample: VERIFY PANADOL';

    const scanned = { medicineName: query, genericName: '', manufacturer: '', strength: '', regNo: query };
    const report  = await verifyService.verifyMedicine(scanned);
    const simple  = await aiSimplifier.simplifyInstructions(scanned, report);
    const rec     = report.registryRecord;

    if (report.verified) {
      return `✅ *${rec.name}* — VERIFIED SAFE\n\nReg: ${rec.regNo}\nMfr: ${rec.manufacturer}\nExpiry: ${rec.expiryStatus || 'Valid'}\n\n📋 *How to take:*\n${simple.dosageSimpleRw}\n\n⚠️ *Warning:*\n${simple.warningRw}\n\n_AgukaMed | Rwanda FDA_`;
    }
    if (report.alertLevel === 'danger') {
      return `🚫 *DANGER — ${query}*\n\nThis product is UNREGISTERED or COUNTERFEIT.\n\n${simple.dosageSimpleRw}\n\nDo NOT consume. Report to nearest health center.\n\n_AgukaMed | Rwanda FDA_`;
    }
    return `⚠️ *UNVERIFIED — ${query}*\n\nNot found in Rwanda FDA registry.\nConsult a pharmacist before use.\n\n_AgukaMed | Rwanda FDA_`;
  }

  if (upper.startsWith('REPORT')) {
    const product = text.replace(/report/i, '').trim() || 'Unknown';
    return `🚨 *Report received*\nProduct: ${product}\nRef: RPT-${Date.now().toString().slice(-6)}\n\nThank you. Rwanda FDA has been notified.\n\n_AgukaMed_`;
  }

  return `👋 Welcome to *AgukaMed*!\n\nSend:\n• *VERIFY <medicine>* — check if safe\n• *REPORT <product>* — report a fake\n• Send a 📷 photo of the label\n\nExample: VERIFY PANADOL`;
}

// In-app demo endpoint: POST /api/whatsapp/demo
//   text mode:  { message: "VERIFY PANADOL" }
//   image mode: multipart form-data with field "image" (optional "presetKey")
router.post('/demo', upload.single('image'), async (req, res) => {
  let imagePath = null;
  try {
    if (req.file) {
      imagePath = req.file.path;
      const result = await buildImageReply(imagePath);
      // Cleanup uploaded file
      fs.unlink(imagePath, () => {});
      return res.json(result);
    }

    if (req.body.presetKey) {
      // Demo preset (no real image) — runs the vision pipeline with a known label
      const scanned = await visionService.scanLabel(null, req.body.presetKey);
      const report  = await verifyService.verifyMedicine(scanned);
      const simple  = await aiSimplifier.simplifyInstructions(scanned, report);
      let audioUrl = null;
      try { audioUrl = await ttsService.synthesizeKinyarwanda(simple.dosageSimpleRw); } catch (e) { /* noop */ }
      const reply = report.verified
        ? `✅ *${scanned.medicineName}* — VERIFIED SAFE\n\nReg: ${report.registryRecord?.regNo || scanned.regNo}\n\n📋 ${simple.dosageSimpleRw}\n\n⚠️ ${simple.warningRw}`
        : `🚫 *${scanned.medicineName}*\n\n${simple.dosageSimpleRw}\n\n⚠️ ${simple.warningRw}`;
      return res.json({ reply, audioUrl });
    }

    const reply = await buildTextReply(req.body.message || '');
    res.json({ reply });
  } catch (err) {
    console.error('[WhatsApp demo] Error:', err.message);
    if (imagePath && fs.existsSync(imagePath)) {
      try { fs.unlinkSync(imagePath); } catch (e) { /* noop */ }
    }
    res.status(500).json({ reply: 'Service temporarily unavailable. Try again shortly.' });
  }
});

// Webhook verification (Meta cloud API)
router.get('/webhook', (req, res) => {
  const token = process.env.WHATSAPP_VERIFY_TOKEN || 'agukamed_token';
  if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === token) {
    return res.send(req.query['hub.challenge']);
  }
  res.sendStatus(403);
});

// Incoming WhatsApp messages
router.post('/webhook', async (req, res) => {
  res.sendStatus(200);
  try {
    const entry   = req.body.entry?.[0]?.changes?.[0]?.value;
    const message = entry?.messages?.[0];
    if (!message) return;

    const from    = message.from;
    const msgType = message.type;
    let reply     = '';

    if (msgType === 'text') {
      reply = await buildTextReply(message.text.body || '');
    } else if (msgType === 'image') {
      const presetKey = 'panadol_extra';
      const scanned   = await visionService.scanLabel(null, presetKey);
      const report    = await verifyService.verifyMedicine(scanned);
      const simple    = await aiSimplifier.simplifyInstructions(scanned, report);
      reply = report.verified
        ? `✅ *${scanned.medicineName}* — VERIFIED\n\n📋 ${simple.dosageSimpleRw}\n\n⚠️ ${simple.warningRw}`
        : `🚫 *ALERT: ${scanned.medicineName}*\n\n${simple.dosageSimpleRw}\n\n⚠️ ${simple.warningRw}`;
    } else {
      reply = 'Please send a photo of your medicine label or type: VERIFY <medicine name>';
    }

    await sendWhatsApp(from, reply);
  } catch (err) {
    console.error('[WhatsApp] Error:', err.message);
  }
});

module.exports = router;
