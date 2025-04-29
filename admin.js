// routes/admin.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// Estatísticas gerais
router.get('/stats', adminController.getStats);

// Estatísticas de visitas
router.get('/stats/visits', adminController.getVisitStats);

// Dados do funil
router.get('/stats/funnel', adminController.getFunnelData);

// Estatísticas de dispositivos
router.get('/stats/devices', adminController.getDeviceStats);

// Estatísticas de tipos de solicitação
router.get('/stats/issueTypes', adminController.getIssueTypeStats);

// Listar submissões
router.get('/submissions', adminController.getSubmissions);

// Obter detalhes de uma submissão
router.get('/submissions/:id', adminController.getSubmissionDetails);

// Atualizar uma submissão
router.patch('/submissions/:id', adminController.updateSubmission);

module.exports = router;