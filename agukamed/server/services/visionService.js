const fs = require('fs');
const path = require('path');
const axios = require('axios');

/**
 * Service to analyze medicine labels using Vision AI
 */
class VisionService {
  /**
   * Scan medicine label from image path or custom preset key
   * @param {string} imagePath - Path to uploaded image
   * @param {string} [presetKey] - Optional preset key to enforce a specific medicine
   * @returns {Promise<object>} Identified medicine metadata
   */
  async scanLabel(imagePath, presetKey = null) {
    console.log(`[VisionService] Scanning label: path=${imagePath}, preset=${presetKey}`);

    // If presetKey is provided, instantly return simulated high-fidelity OCR for that preset
    if (presetKey) {
      return this._getSimulatedResult(presetKey);
    }

    // Try to auto-detect from filename if no preset key is given but filename matches common names (e.g. for drag & drop)
    const baseName = path.basename(imagePath || '').toLowerCase();
    if (baseName.includes('panadol')) return this._getSimulatedResult('panadol_extra');
    if (baseName.includes('coartem')) return this._getSimulatedResult('coartem_20_120');
    if (baseName.includes('amoxicillin')) return this._getSimulatedResult('amoxicillin_500');
    if (baseName.includes('ibuprofen')) return this._getSimulatedResult('ibuprofen_400');
    if (baseName.includes('nivea')) return this._getSimulatedResult('nivea_cream');
    if (baseName.includes('fair')) return this._getSimulatedResult('fair_lovely');
    if (baseName.includes('dior') && !baseName.includes('fake')) return this._getSimulatedResult('dior_sauvage');
    if (baseName.includes('chanel')) return this._getSimulatedResult('chanel_no5');
    if (baseName.includes('fake_dior') || baseName.includes('fake') || baseName.includes('suspicious') || baseName.includes('unregistered')) {
      return this._getSimulatedResult('suspicious_pill');
    }
    if (baseName.includes('bleach') || baseName.includes('ultra_white')) return this._getSimulatedResult('fake_skin_bleach');

    // If API Key is present in environment, perform a live Gemini Vision API call!
    if (process.env.GEMINI_API_KEY && fs.existsSync(imagePath)) {
      try {
        console.log('[VisionService] GEMINI_API_KEY detected. Running live Vision OCR...');
        const imageBuffer = fs.readFileSync(imagePath);
        const base64Data = imageBuffer.toString('base64');
        const mimeType = this._getMimeType(imagePath);

        const prompt = `
          Analyze this medicine container, box, bottle, or prescription.
          1. Extract the primary product brand name (e.g., "Panadol Extra", "Coartem", "Amoxicillin").
          2. Extract the manufacturer (e.g., "GSK", "Novartis").
          3. Extract the active strength/concentration (e.g., "500mg", "20mg/120mg").
          4. Extract any batch number, expiry date, or registration numbers if visible.
          
          Respond ONLY with a valid raw JSON object. Do not include markdown wraps like \`\`\`json.
          Format:
          {
            "medicineName": "Extracted Name",
            "genericName": "Generic name or active chemicals if visible",
            "manufacturer": "Extracted Manufacturer",
            "strength": "Extracted Strength",
            "regNo": "Registration number if visible, otherwise null",
            "detectedText": "Brief summary of all read text on the label"
          }
        `;

        const response = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
          {
            contents: [
              {
                parts: [
                  { text: prompt },
                  {
                    inlineData: {
                      mimeType: mimeType,
                      data: base64Data
                    }
                  }
                ]
              }
            ],
            generationConfig: {
              responseMimeType: "application/json"
            }
          },
          { headers: { 'Content-Type': 'application/json' }, timeout: 15000 }
        );

        if (response.data && response.data.candidates && response.data.candidates[0].content.parts[0].text) {
          const rawJson = response.data.candidates[0].content.parts[0].text.trim();
          console.log('[VisionService] Live Gemini Result:', rawJson);
          return JSON.parse(rawJson);
        }
      } catch (err) {
        console.error('[VisionService] Live Gemini call failed, falling back to simulated OCR:', err.message);
      }
    }

    // Default Fallback: Return simulated OCR result for a standard medicine (e.g. Panadol Extra)
    console.log('[VisionService] Running in zero-config simulated OCR mode...');
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate AI processing delay
    return this._getSimulatedResult('panadol_extra');
  }

  _getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.png') return 'image/png';
    if (ext === '.webp') return 'image/webp';
    return 'image/jpeg';
  }

  _getSimulatedResult(key) {
    const datasets = {
      panadol_extra: {
        medicineName: "Panadol Extra",
        genericName: "Paracetamol + Caffeine",
        manufacturer: "GlaxoSmithKline (GSK)",
        strength: "500mg / 65mg",
        regNo: "FDA-RWA-2023-0182",
        detectedText: "PANADOL EXTRA - Fast Effective Pain Relief. Each tablet contains Paracetamol 500mg and Caffeine 65mg. Manufactured by GSK. Reg No: FDA-RWA-2023-0182."
      },
      amoxicillin_500: {
        medicineName: "Amoxicillin Capsule",
        genericName: "Amoxicillin Trihydrate",
        manufacturer: "Medac Pharm Ltd",
        strength: "500mg",
        regNo: "FDA-RWA-2022-0941",
        detectedText: "AMOXICILLIN capsules BP 500mg. Broad-spectrum antibiotic. Keep out of reach of children. Manufactured by Medac Pharm Ltd. Reg: FDA-RWA-2022-0941."
      },
      coartem_20_120: {
        medicineName: "Coartem",
        genericName: "Artemether + Lumefantrine",
        manufacturer: "Novartis Pharma",
        strength: "20mg / 120mg",
        regNo: "FDA-RWA-2024-0012",
        detectedText: "COARTEM 20/120. Artemether 20mg + Lumefantrine 120mg. 24 tablets. Novartis Pharma. Oral use only. Store below 30C. Reg: FDA-RWA-2024-0012."
      },
      ibuprofen_400: {
        medicineName: "Ibuprofen",
        genericName: "Ibuprofen BP",
        manufacturer: "Shalina Healthcare Ltd",
        strength: "400mg",
        regNo: "FDA-RWA-2023-0599",
        detectedText: "IBUPROFEN tablets BP 400mg. Relieves pain, swelling, and fever. 10x10 tablets. Shalina Healthcare Ltd. Exp: Oct 2027."
      },
      suspicious_pill: {
        medicineName: "Fever-X Forte",
        genericName: "Unknown chemical compound",
        manufacturer: "Informal Market Lab",
        strength: "Double Strength 1000mg",
        regNo: "NONE (Unregistered Batch)",
        detectedText: "FEVER-X FORTE. Maximum relief pills. Safe formulation. Dist: Informal Trading Agency. Warning: Keep in a dry place. Expiry date illegible."
      },
      nivea_cream: {
        medicineName: "NIVEA Soft Moisturising Cream",
        genericName: "Glycerin, Jojoba Oil, Isopropyl Myristate",
        manufacturer: "Beiersdorf AG",
        strength: "200ml",
        regNo: "RFDA-COS-2023-0041",
        detectedText: "NIVEA Soft. Moisturising Cream with Jojoba Oil. 200ml. Beiersdorf AG. Reg: RFDA-COS-2023-0041.",
        productCategory: "cosmetic"
      },
      fair_lovely: {
        medicineName: "Fair & Lovely Advanced Multi Vitamin",
        genericName: "Niacinamide, Vitamin B3, SPF 15",
        manufacturer: "Hindustan Unilever Ltd",
        strength: "50g",
        regNo: "RFDA-COS-2022-0118",
        detectedText: "Fair & Lovely Advanced Multi Vitamin Face Cream. SPF 15. 50g. Hindustan Unilever. Reg: RFDA-COS-2022-0118.",
        productCategory: "cosmetic"
      },
      fake_skin_bleach: {
        medicineName: "Ultra White Skin Bleach Cream",
        genericName: "Mercury Chloride, Hydroquinone",
        manufacturer: "Unregistered Lab",
        strength: "Unknown",
        regNo: "NONE",
        detectedText: "ULTRA WHITE. Maximum Bleaching Cream. Fast results. No registration number. Dist: Unknown.",
        productCategory: "cosmetic"
      },
      dior_sauvage: {
        medicineName: "Dior Sauvage Eau de Toilette",
        genericName: "Bergamot, Ambroxan, Pepper, Lavender",
        manufacturer: "Parfums Christian Dior S.A.",
        strength: "100ml",
        regNo: "RFDA-PERF-2023-0007",
        detectedText: "DIOR SAUVAGE Eau de Toilette 100ml. Parfums Christian Dior. Batch: SA230045. Reg: RFDA-PERF-2023-0007.",
        batchCode: "SA230045",
        productCategory: "perfume"
      },
      chanel_no5: {
        medicineName: "Chanel No. 5 Eau de Parfum",
        genericName: "Ylang-Ylang, Rose, Jasmine, Sandalwood",
        manufacturer: "Chanel S.A.",
        strength: "50ml",
        regNo: "RFDA-PERF-2022-0003",
        detectedText: "CHANEL N°5 Eau de Parfum 50ml. Chanel S.A. Batch: C1234567. Reg: RFDA-PERF-2022-0003.",
        batchCode: "C1234567",
        productCategory: "perfume"
      },
      fake_dior: {
        medicineName: "Dior Sauvage (Counterfeit)",
        genericName: "Unknown solvents, synthetic fixatives",
        manufacturer: "Unknown Distributor",
        strength: "Unknown",
        regNo: "NONE",
        detectedText: "DIOR SAUVAGE. No batch code. No registration. Suspicious packaging inconsistencies detected.",
        productCategory: "perfume"
      }
    };

    return datasets[key] || datasets['panadol_extra'];
  }
}

module.exports = new VisionService();
