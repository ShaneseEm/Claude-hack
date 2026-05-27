const axios = require('axios');

/**
 * Service to simplify complex medical jargon into simple layman English and clear Kinyarwanda
 */
class AISimplifier {
  /**
   * Simplify medicine instructions
   * @param {object} scannedData - Identified medicine metadata
   * @param {object} verificationReport - Report from verifyService
   * @returns {Promise<object>} Simplified instructions (English + Kinyarwanda)
   */
  async simplifyInstructions(scannedData, verificationReport) {
    console.log('[AISimplifier] Simplifying instructions...');

    // If it's a verified medicine/product, pull pre-rendered instructions from database record
    if (verificationReport.verified && verificationReport.registryRecord) {
      const rec = verificationReport.registryRecord;
      console.log('[AISimplifier] Pulling pre-rendered simplified instructions from database.');
      // Support both medicine fields and cosmetic/perfume fields
      return {
        dosageSimpleEn: rec.dosageSimpleEn || rec.instructions || 'Use as directed on packaging.',
        dosageSimpleRw: rec.dosageSimpleRw || rec.instructionsRw || 'Koresha nk\'uko byanditse ku agashya.',
        warningEn: rec.warningEn || rec.warnings || 'Follow standard safety guidelines.',
        warningRw: rec.warningRw || rec.warningRw || 'Kurikiza amabwiriza y\'umutekano.',
        source: 'Verified Rwanda FDA Database'
      };
    }

    // If it's an unverified/suspicious product, provide explicit warnings
    if (scannedData.medicineName === 'Fever-X Forte' || !verificationReport.verified) {
      const isCounterfeit = (scannedData.regNo === 'NONE (Unregistered Batch)' || (scannedData.medicineName || '').toLowerCase().includes('fever-x'));
      
      if (isCounterfeit) {
        return {
          dosageSimpleEn: "STOP: Do not ingest this medicine. It is a counterfeit or unregistered drug and may contain dangerous chemicals.",
          dosageSimpleRw: "HAGARARA: Ntugafate uyu muti. Uyu muti ni umwiganano cyangwa utabaruye, kandi ushobora kuba urimo ibinyabutabire byangiza ubuzima bwawe.",
          warningEn: "DANGER: High risk of liver damage, poisoning, or zero active therapeutic effects. Turn it over to medical authorities.",
          warningRw: "AKAGA: Ushobora kwangiza umwijima cyangwa ukaba wakuroga. Umitange ku kigo cy'ubuzima kikwegereye.",
          source: 'System Counterfeit Intelligence Alert'
        };
      }

      // Generic unverified fallback
      return {
        dosageSimpleEn: "Warning: Medicine is unverified. Consult a doctor or pharmacist before ingestion. If authentic, take strictly as prescribed by a medical doctor.",
        dosageSimpleRw: "Ibyitonderwa: Uyu muti ntabwo wemejwe. Baza muganga cyangwa umuhanga mu by'imiti (pharmacist) mbere yo kuwunywa.",
        warningEn: "CAUTION: Unregistered pharmaceutical batch. Standard safety profile unknown.",
        warningRw: "INAMA: Uyu muti ntubonetse muri gahunda y'imiti yemewe muri Rwanda. Ubuziranenge bwawo ntibuzwi.",
        source: 'Standard Security Protocol Fallback'
      };
    }

    // If API Key is present, perform a dynamic AI simplification!
    if (process.env.GEMINI_API_KEY) {
      try {
        console.log('[AISimplifier] GEMINI_API_KEY detected. Generating dynamic AI translation...');
        
        const prompt = `
          You are a professional clinical pharmacist.
          Convert these complex medical details into:
          1. Ultra-simple, plain English instructions (max 2 sentences, layman terms).
          2. Accurate, simplified Kinyarwanda translations of the dosage instructions (max 2 sentences, written in natural Kinyarwanda).
          3. Crucial safety warnings in English.
          4. Crucial safety warnings in Kinyarwanda.
          
          Input:
          Brand Name: ${scannedData.medicineName}
          Ingredients: ${scannedData.genericName}
          Detected Label Text: ${scannedData.detectedText}
          
          Respond ONLY with a valid raw JSON object. Do not include markdown wraps like \`\`\`json.
          Format:
          {
            "dosageSimpleEn": "Layman English instructions here",
            "dosageSimpleRw": "Natural Kinyarwanda translation here",
            "warningEn": "Safety warning in English here",
            "warningRw": "Safety warning in Kinyarwanda here"
          }
        `;

        const response = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
          {
            contents: [
              {
                parts: [
                  { text: prompt }
                ]
              }
            ],
            generationConfig: {
              responseMimeType: "application/json"
            }
          },
          { headers: { 'Content-Type': 'application/json' }, timeout: 10000 }
        );

        if (response.data && response.data.candidates && response.data.candidates[0].content.parts[0].text) {
          const rawJson = response.data.candidates[0].content.parts[0].text.trim();
          console.log('[AISimplifier] Live AI translation result:', rawJson);
          const parsed = JSON.parse(rawJson);
          return {
            ...parsed,
            source: 'Dynamic Gemini-1.5-Flash Model'
          };
        }
      } catch (err) {
        console.error('[AISimplifier] Live AI translation failed, falling back to static rules:', err.message);
      }
    }

    // Default Fallback (should not be hit under normal circumstances)
    return {
      dosageSimpleEn: "Take 1 tablet twice a day with meals as directed by your physician.",
      dosageSimpleRw: "Fata ikinini 1 inshuro 2 ku munsi uherekeje amafunguro cyangwa nk'uko muganga yabigutegetse.",
      warningEn: "Do not exceed standard prescribed limits. Keep away from children.",
      warningRw: "Nturenze urugero wagatsinzwe na muganga. Wubike kure y'abana.",
      source: 'Default System Rule Engine'
    };
  }
}

module.exports = new AISimplifier();
