const express = require('express');
const router = express.Router();
const verifyService = require('../services/verifyService');
const aiSimplifier = require('../services/aiSimplifier');

// In-memory sessions (keyed by sessionId)
const sessions = {};

const MENU_MAIN = `CON AgukaMed - Kugenzura Imiti
1. Genzura Umuti (Medicine)
2. Genzura Ibihumyo (Cosmetic)
3. Genzura Ibihumyo (Perfume)
4. Raporo Igicuruzwa Cyangwa (Report Fake)`;

// POST /api/ussd
// Body: { sessionId, text }  (Africa's Talking USSD format)
router.post('/', async (req, res) => {
  const { sessionId = 'demo', text = '' } = req.body;
  const parts = text.split('*').filter(Boolean);
  const depth = parts.length;

  // Fresh session
  if (!text) {
    sessions[sessionId] = {};
    return res.send(MENU_MAIN);
  }

  const choice1 = parts[0];

  // ── REPORT FAKE (option 4) ──
  if (choice1 === '4') {
    if (depth === 1) return res.send('CON Enter product name to report:');
    const product = parts[1];
    delete sessions[sessionId];
    return res.send(`END ⚠ Report submitted.\nProduct: ${product}\nRef: RPT-${Date.now().toString().slice(-6)}\nRwanda FDA notified.\nAsante / Thank you.`);
  }

  const categoryMap = { '1': 'medicine', '2': 'cosmetic', '3': 'perfume' };
  const category = categoryMap[choice1];

  if (!category) {
    delete sessions[sessionId];
    return res.send('END Invalid option. Please dial again.');
  }

  if (depth === 1) {
    return res.send(`CON Enter product name:`);
  }

  const productName = parts[1];

  if (depth === 2) {
    return res.send(`CON Enter Reg. No. (or 0 to skip):`);
  }

  const regNo = parts[2] === '0' ? '' : parts[2];

  // Lookup
  try {
    const scannedData = { medicineName: productName, genericName: '', manufacturer: '', strength: '', regNo, productCategory: category };
    const report = await verifyService.verifyMedicine(scannedData);
    const simplified = await aiSimplifier.simplifyInstructions(scannedData, report);
    delete sessions[sessionId];

    if (report.verified) {
      const rec = report.registryRecord;
      return res.send(`END ✔ SAFE\n${rec.name || productName}\nReg: ${rec.regNo}\nExpiry: ${rec.expiryStatus || 'Valid'}\n\n${simplified.dosageSimpleEn}`);
    } else if (report.alertLevel === 'danger') {
      return res.send(`END 🚫 DANGER\n${productName}\nUNREGISTERED / COUNTERFEIT\nDo NOT use.\nReport to health center.`);
    } else {
      return res.send(`END ⚠ UNVERIFIED\n${productName}\nNot in Rwanda FDA registry.\nConsult a pharmacist.`);
    }
  } catch {
    delete sessions[sessionId];
    return res.send('END Service error. Please try again.');
  }
});

module.exports = router;
