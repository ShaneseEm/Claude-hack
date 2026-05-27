const express = require('express');
const multer = require('multer');
const path = require('path');
const medicineController = require('../controllers/medicineController');

const router = express.Router();

// Configure Multer Storage for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads');
    // Ensure uploads directory exists
    const fs = require('fs');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}_${file.originalname}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Define Routes
router.post('/analyze', upload.single('medicine'), (req, res, next) => {
  // Let the controller handle the request async
  medicineController.analyzeMedicine(req, res).catch(next);
});

router.get('/products', (req, res, next) => {
  medicineController.getProducts(req, res).catch(next);
});

router.get('/medicines', (req, res, next) => {
  medicineController.getRegisteredMedicines(req, res).catch(next);
});

module.exports = router;
