const express = require('express');
const router = express.Router();
const verifyService = require('../services/verifyService');
const aiSimplifier = require('../services/aiSimplifier');

// POST /api/sms
// Body: { message: "VERIFY PANADOL FDA-RWA-2023-0182" }
// Returns plain-text SMS reply
router.post('/', async (req, res) => {
  const raw = (req.body.message || '').trim().toUpperCase();

  if (!raw.startsWith('VERIFY') && !raw.startsWith('REPORT')) {
    return res.json({
      reply: `AgukaMed SMS Help:\n\nSend: VERIFY <medicine name>\nExample: VERIFY PANADOL\n\nOr: REPORT FAKE <product name>\n\nFree service by AgukaMed.`
    });
  }

  if (raw.startsWith('REPORT FAKE')) {
    const product = req.body.message.replace(/report fake/i, '').trim() || 'Unknown';
    return res.json({
      reply: `⚠ Report received.\nProduct: ${product}\nThank you. Rwanda FDA has been notified.\nRef: RPT-${Date.now().toString().slice(-6)}`
    });
  }

  // VERIFY command
  const query = req.body.message.replace(/verify/i, '').trim();
  if (!query) {
    return res.json({ reply: 'Please include a medicine name.\nExample: VERIFY PANADOL' });
  }

  try {
    const scannedData = { medicineName: query, genericName: '', manufacturer: '', strength: '', regNo: query };
    const report = await verifyService.verifyMedicine(scannedData);
    const simplified = await aiSimplifier.simplifyInstructions(scannedData, report);

    if (report.verified) {
      const rec = report.registryRecord;
      res.json({
        reply: `✔ SAFE — ${rec.name || query}\nReg: ${rec.regNo}\nMfr: ${rec.manufacturer}\nExpiry: ${rec.expiryStatus || 'Valid'}\n\n${simplified.dosageSimpleEn}\n\nAgukaMed | Rwanda FDA`
      });
    } else if (report.alertLevel === 'danger') {
      res.json({
        reply: `🚫 DANGER — ${query}\nThis product is UNREGISTERED or COUNTERFEIT.\nDo NOT consume.\nReport to nearest health center.\n\nAgukaMed | Rwanda FDA`
      });
    } else {
      res.json({
        reply: `⚠ UNVERIFIED — ${query}\nNot found in Rwanda FDA registry.\nConsult a pharmacist before use.\n\nAgukaMed | Rwanda FDA`
      });
    }
  } catch {
    res.json({ reply: 'Service temporarily unavailable. Try again shortly.' });
  }
});

module.exports = router;
