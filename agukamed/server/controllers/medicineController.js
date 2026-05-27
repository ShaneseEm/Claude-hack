const visionService = require('../services/visionService');
const verifyService = require('../services/verifyService');
const aiSimplifier = require('../services/aiSimplifier');
const ttsService = require('../services/ttsService');
const fs = require('fs');
const path = require('path');

const { isConnected } = require('../db');
const Medicine = require('../models/Medicine');
const Cosmetic = require('../models/Cosmetic');
const Perfume = require('../models/Perfume');
const ScanLog = require('../models/ScanLog');

/**
 * Controller to handle medicine analysis requests
 */
class MedicineController {
  /**
   * Analyze medicine image (from file upload or preset indicator)
   * Route: POST /api/analyze
   */
  async analyzeMedicine(req, res) {
    console.log('[MedicineController] Received analysis request');

    let imagePath = null;
    try {
      const presetKey = req.body.presetKey || null;

      if (req.file) {
        imagePath = req.file.path;
      }

      if (!imagePath && !presetKey) {
        return res.status(400).json({
          success: false,
          error: 'Please provide either an uploaded medicine image or a valid demo preset key.'
        });
      }

      // 1. VISION AI SCAN
      const scannedData = await visionService.scanLabel(imagePath, presetKey);

      // 2. VERIFICATION
      const verificationReport = await verifyService.verifyMedicine(scannedData);

      // 3. AI EXPLANATORY SYSTEM
      const simplifiedData = await aiSimplifier.simplifyInstructions(scannedData, verificationReport);

      // 4. TEXT-TO-SPEECH
      let audioUrl = null;
      try {
        audioUrl = await ttsService.synthesizeKinyarwanda(simplifiedData.dosageSimpleRw);
      } catch (ttsErr) {
        console.error('[MedicineController] Speech synthesis failed:', ttsErr.message);
      }

      // 5. PERSIST SCAN LOG (best effort)
      if (isConnected()) {
        ScanLog.create({
          medicineName: scannedData.medicineName,
          genericName: scannedData.genericName,
          manufacturer: scannedData.manufacturer,
          regNo: scannedData.regNo,
          strength: scannedData.strength,
          detectedText: scannedData.detectedText,
          verified: verificationReport.verified,
          alertLevel: verificationReport.alertLevel,
          matchType: verificationReport.matchType,
          reason: verificationReport.reason,
          source: simplifiedData.source,
          channel: 'web',
          presetKey
        }).catch(err => console.error('[MedicineController] ScanLog save failed:', err.message));
      }

      // Cleanup temp file
      if (imagePath && fs.existsSync(imagePath) && !presetKey) {
        fs.unlink(imagePath, (err) => {
          if (err) console.error('[MedicineController] Temp file cleanup error:', err.message);
        });
      }

      return res.json({
        success: true,
        scanned: {
          medicineName: scannedData.medicineName,
          genericName: scannedData.genericName || 'Not specified',
          manufacturer: scannedData.manufacturer || 'Unknown',
          strength: scannedData.strength || 'Standard Strength',
          regNo: scannedData.regNo || 'Unavailable',
          detectedText: scannedData.detectedText || ''
        },
        verification: {
          verified: verificationReport.verified,
          matchType: verificationReport.matchType,
          reason: verificationReport.reason,
          alertLevel: verificationReport.alertLevel,
          expiryStatus: verificationReport.registryRecord?.expiryStatus || null
        },
        explanation: {
          dosageSimpleEn: simplifiedData.dosageSimpleEn,
          dosageSimpleRw: simplifiedData.dosageSimpleRw,
          warningEn: simplifiedData.warningEn,
          warningRw: simplifiedData.warningRw,
          source: simplifiedData.source
        },
        audioUrl
      });

    } catch (error) {
      console.error('[MedicineController] Error during medicine analysis flow:', error);
      if (imagePath && fs.existsSync(imagePath)) {
        try { fs.unlinkSync(imagePath); } catch (e) { /* noop */ }
      }
      return res.status(500).json({
        success: false,
        error: 'An unexpected error occurred during medicine analysis. Please verify your network connection or API settings.'
      });
    }
  }

  async getProducts(req, res) {
    try {
      const toCard = (item, category) => ({
        id: item.id,
        name: item.name,
        brand: item.brand || item.manufacturer,
        genericName: item.genericName || item.ingredients,
        verified: item.verified,
        category
      });

      if (isConnected()) {
        const [medicines, cosmetics, perfumes] = await Promise.all([
          Medicine.find({}).lean(),
          Cosmetic.find({}).lean(),
          Perfume.find({}).lean()
        ]);
        return res.json({
          success: true,
          products: [
            ...medicines.map(m => toCard(m, 'medicine')),
            ...cosmetics.map(c => toCard(c, 'cosmetic')),
            ...perfumes.map(p => toCard(p, 'perfume'))
          ]
        });
      }

      // JSON fallback
      const dataDir = path.join(__dirname, '../data');
      const medicines = JSON.parse(fs.readFileSync(`${dataDir}/medicines.json`, 'utf8'));
      const cosmetics = JSON.parse(fs.readFileSync(`${dataDir}/cosmetics.json`, 'utf8'));
      const perfumes = JSON.parse(fs.readFileSync(`${dataDir}/perfumes.json`, 'utf8'));

      return res.json({
        success: true,
        products: [
          ...medicines.map(m => toCard(m, 'medicine')),
          ...cosmetics.map(c => toCard(c, 'cosmetic')),
          ...perfumes.map(p => toCard(p, 'perfume'))
        ]
      });
    } catch (err) {
      console.error('[MedicineController] getProducts failed:', err.message);
      return res.status(500).json({ success: false, error: 'Failed to load product database.' });
    }
  }

  async getRegisteredMedicines(req, res) {
    try {
      let medicines;
      if (isConnected()) {
        medicines = await Medicine.find({}).lean();
      } else {
        const medicinesPath = path.join(__dirname, '../data/medicines.json');
        medicines = JSON.parse(fs.readFileSync(medicinesPath, 'utf8'));
      }
      return res.json({
        success: true,
        count: medicines.length,
        medicines: medicines.map(m => ({
          name: m.name,
          genericName: m.genericName,
          manufacturer: m.manufacturer,
          regNo: m.regNo,
          strength: m.strength
        }))
      });
    } catch (err) {
      console.error('[MedicineController] Failed to retrieve registered medicines:', err.message);
      return res.status(500).json({
        success: false,
        error: 'Failed to load database records.'
      });
    }
  }
}

module.exports = new MedicineController();
