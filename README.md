# AgukaMed — AI Safe Product & Medicine Verification Assistant

<img width="1197" height="884" alt="image" src="https://github.com/user-attachments/assets/ccab5751-90e8-443d-8470-61ac5f5cef63" />


> AI-powered verification system for medicines, cosmetics, perfumes, and health products with Kinyarwanda voice guidance and accessibility-first design.

---

# 🌍 Overview

AgukaMed is an African-first AI platform designed to help people verify the authenticity and safety of:

- 💊 Medicines
- 🧴 Cosmetics
- 🌸 Perfumes
- 🧼 Skin-care products
- 🧪 Beauty products

using:

- Vision AI
- OCR label scanning
- Product registry verification
- Counterfeit detection
- Simplified dosage explanations
- Kinyarwanda audio guidance
- SMS / USSD accessibility concepts

The system is designed especially for:

- Elderly users
- Rural communities
- Low-literacy users
- Smartphone and non-smartphone users
- Communities affected by counterfeit products

---

# ✨ Features

## 💊 Medicine Verification

Verify:

- Tablets
- Syrups
- Prescription medicines
- Over-the-counter drugs

Checks include:

- Registration number validation
- Expiry detection
- Manufacturer verification
- Suspicious batch detection
- Fake packaging analysis

---

## 🧴 Cosmetic & Perfume Verification

Detect suspicious or fake:

- Perfumes
- Creams
- Lotions
- Skin-care products
- Beauty products

AI checks include:

- Brand verification
- OCR label consistency
- Counterfeit warning patterns
- Expiry validation
- Packaging mismatch detection

---

## 🤖 Vision AI Scanning

AgukaMed uses AI-powered image analysis to scan:

- Labels
- QR codes
- Batch numbers
- Expiry dates
- Product names

Supports:

- Upload scanning
- Live camera scanning
- Demo preset products

---

## 🔊 Kinyarwanda Voice Guidance

The platform generates:

- Simplified English instructions
- Kinyarwanda audio guidance

Perfect for:

- Elderly users
- Non-literate users
- Visually impaired users

---

## 📱 Non-Smartphone Accessibility Concepts

AgukaMed also includes concepts for:

- SMS verification
- USSD verification
- Voice-call/IVR systems
- Community health kiosks

Example:

```text
VERIFY PANADOL RW2231
```

Response:

```text
SAFE ✔ Registered Product
```

---

# 🏗 System Architecture

```text
Frontend (Vanilla JS)
        │
        ▼
Express API Server
        │
 ┌──────┼────────┬───────────┬───────────┐
 ▼      ▼        ▼           ▼
Vision  Verify   AI Simpl.   TTS
Service Service  Service     Service
        │
        ▼
 JSON Product Registry Database
```

---

# 🛠 Tech Stack

## Frontend

- HTML5
- CSS3
- Vanilla JavaScript
- WebRTC Camera API
- Glassmorphism UI
- Responsive Design

---

## Backend

- Node.js
- Express.js
- Multer
- dotenv
- fs-extra

---

## AI & APIs

- Google Gemini Vision API
- OpenAI Vision API (optional)
- ElevenLabs TTS (optional)
- Google Translate TTS fallback

---

# 📂 Project Structure

```text
agukamed/
│
├── public/
│   ├── index.html
│   ├── style.css
│   ├── app.js
│   ├── audio/
│   ├── images/
│   └── demos/
│
├── uploads/
│
├── data/
│   ├── medicines.json
│   ├── cosmetics.json
│   └── perfumes.json
│
├── server/
│   ├── services/
│   │   ├── visionService.js
│   │   ├── verifyService.js
│   │   ├── ttsService.js
│   │   ├── aiSimplifier.js
│   │   └── authenticityService.js
│   │
│   ├── controllers/
│   │   └── medicineController.js
│   │
│   ├── routes/
│   │   └── medicineRoutes.js
│   │
│   └── utils/
│
├── .env
├── package.json
└── server.js
```

---

# ⚡ Installation

## 1. Clone Repository

```bash
git clone https://github.com/your-username/agukamed.git
```

```bash
cd agukamed
```

---

## 2. Install Dependencies

```bash
npm install
```

---

## 3. Create Environment Variables

Create `.env`

```env
PORT=5000

GEMINI_API_KEY=
OPENAI_API_KEY=
ELEVENLABS_API_KEY=
```

---

# 🚀 Running The Project

## Start Server

```bash
npm start
```

Server runs on:

```text
http://localhost:5000
```

---

# 🔄 Demo Mode vs Live Mode

## Demo Mode (No API Keys Required)

If `.env` is empty:

- realistic AI simulation runs
- fake OCR pipeline executes
- preloaded medicine demos appear
- Kinyarwanda demo audio plays

Perfect for hackathon demos.

---

## Live Mode

If API keys exist:

- real Vision AI analysis runs
- real OCR extraction executes
- real TTS audio generation works

---

# 📡 API Endpoints

# POST `/api/analyze`

Analyze uploaded product image.

## Request

```text
multipart/form-data
```

## Response

```json
{
  "productName": "Panadol Extra",
  "verified": true,
  "category": "Medicine",
  "expiryStatus": "Valid",
  "simplifiedInstructions": {
    "en": "Take after food.",
    "rw": "Fata nyuma yo kurya."
  },
  "audioUrl": "/audio/panadol.mp3"
}
```

---

# GET `/api/products`

Returns demo product dataset.

---

# 🎨 UI Features

- Dark luxury interface
- Glassmorphism cards
- AI scanning animations
- Live camera support
- Animated timeline
- Equalizer audio player
- Responsive mobile design

---

# 📱 Planned Accessibility Features

- SMS verification
- USSD integration
- Voice-call IVR
- Offline mode
- Community health kiosk support

---

# 🔒 Security

- Multer image validation
- File size limits
- Image-only uploads
- Safe local file handling

---

# 🧪 Verification Flow

```text
1. Upload Product
2. AI Reads Label
3. Product Verified
4. Instructions Simplified
5. Kinyarwanda Audio Generated
6. Result Displayed
```

---

# 🌍 Social Impact

AgukaMed aims to:

- Reduce counterfeit medicine usage
- Improve medicine safety awareness
- Help low-literacy communities
- Improve rural healthcare access
- Detect fake cosmetics & perfumes
- Support African public health systems

---

# 🔮 Future Expansion

## Planned Features

- Blockchain medicine tracking
- Rwanda FDA integration
- WhatsApp AI bot
- Offline mobile app
- Pharmacy dashboard
- QR verification system
- Real telecom USSD integration

---

# 🏆 Why AgukaMed Is Different

Most solutions only provide:

- medicine lookup
OR
- barcode scanning
OR
- SMS verification

AgukaMed combines:

- AI Vision
- Product authenticity checks
- Kinyarwanda accessibility
- Voice guidance
- Cosmetics verification
- Real-time UX
- African-first accessibility

into one platform.

---

# 📸 Demo Scenarios

## ✅ Safe Medicine

- Scan Panadol
- AI verifies medicine
- Audio instructions generated

---

## ❌ Fake Perfume

- Scan suspicious perfume
- AI detects counterfeit patterns
- Warning displayed

---

# 👩🏽‍💻 Author

**Bethelhem Alemayehu Ejigu**

Passionate about building African-first AI and accessibility solutions that empower communities through technology.

---

# 📜 License

MIT License

---

# ⭐ Final Vision

> “AgukaMed is building Africa’s accessible AI infrastructure for medicine and product safety — across smartphones, SMS, USSD, voice systems, and community healthcare networks.”
