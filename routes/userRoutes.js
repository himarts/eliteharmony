const express = require('express');
const router = express.Router();
const { seedUsers } = require('../controllers/seed');

// ...existing code...

router.post('/seed', seedUsers);

// ...existing code...

module.exports = router;
