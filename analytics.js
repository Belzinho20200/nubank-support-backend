// routes/analytics.js
const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');

// Rota para registrar eventos de analytics
router.post('/', analyticsController.recordEvent);

// Rota para validação simples de CPF (apenas validação de formato)
router.post('/validate-cpf', analyticsController.validateCPF);

// Rota para obter estatísticas (apenas para admin)
router.get('/stats', analyticsController.getStats);

// Rota para listar eventos (apenas para admin)
router.get('/events', analyticsController.getEvents);

module.exports = router;