// routes/stats.js
const express = require('express');
const router = express.Router();
const db = require('../../config/db');

// @route   GET /api/stats
// @desc    Obter estatísticas gerais
// @access  Public
router.get('/', async (req, res) => {
  try {
    // Aqui implementaríamos lógica para buscar estatísticas
    // Como este é um exemplo simples, retornaremos dados básicos
    
    // Contar submissões totais
    const allSubmissions = await db.getSubmissions();
    const totalCount = allSubmissions.length;
    
    // Contagem por tipo
    const issueTypeCounts = {
      limite: 0,
      bugs: 0, 
      aumentarLimite: 0,
      emprestimo: 0
    };
    
    // Contagem por status
    const statusCounts = {
      novo: 0,
      'em-análise': 0,
      atendido: 0,
      cancelado: 0
    };
    
    // Calcular as contagens
    allSubmissions.forEach(submission => {
      // Contar por tipo
      if (issueTypeCounts.hasOwnProperty(submission.issueType)) {
        issueTypeCounts[submission.issueType]++;
      }
      
      // Contar por status
      if (statusCounts.hasOwnProperty(submission.status)) {
        statusCounts[submission.status]++;
      }
    });
    
    res.json({
      totalSubmissions: totalCount,
      issueTypeCounts,
      statusCounts,
      lastUpdate: new Date()
    });
  } catch (err) {
    console.error('Erro ao obter estatísticas:', err);
    res.status(500).json({ error: 'Erro ao obter estatísticas' });
  }
});

module.exports = router;