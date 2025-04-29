// routes/submissions.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');

// @route   POST /api/submissions
// @desc    Criar uma nova submissão
// @access  Public
router.post('/', async (req, res) => {
  try {
    const submissionData = req.body;
    
    // Validação básica
    if (!submissionData.cpf) {
      return res.status(400).json({ error: 'CPF é obrigatório' });
    }
    
    // Gerar número de protocolo único
    const protocol = Math.floor(Math.random() * 9000000) + 1000000;
    
    // Preparar dados para salvar
    const dataToSave = {
      ...submissionData,
      protocol: protocol.toString(),
      // Não estamos mais modificando o número do cartão para exibir apenas 4 dígitos
      // Salvando o número completo agora (não recomendado em produção!)
    };
    
    // Salvar no banco de dados
    const submissionId = await db.saveSubmission(dataToSave);
    
    res.status(201).json({
      success: true,
      message: 'Submissão salva com sucesso',
      id: submissionId,
      protocol: protocol
    });
  } catch (err) {
    console.error('Erro ao processar submissão:', err);
    res.status(500).json({ error: 'Erro ao processar submissão' });
  }
});

// @route   GET /api/submissions
// @desc    Obter todas as submissões
// @access  Public
router.get('/', async (req, res) => {
  try {
    const submissions = await db.getSubmissions();
    res.json(submissions);
  } catch (err) {
    console.error('Erro ao buscar submissões:', err);
    res.status(500).json({ error: 'Erro ao buscar submissões' });
  }
});

// @route   PATCH /api/submissions/:id/status
// @desc    Atualizar o status de uma submissão
// @access  Public
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ error: 'Status é obrigatório' });
    }
    
    const success = await db.updateSubmissionStatus(id, status);
    
    if (success) {
      res.json({ success: true, message: 'Status atualizado com sucesso' });
    } else {
      res.status(404).json({ error: 'Submissão não encontrada' });
    }
  } catch (err) {
    console.error('Erro ao atualizar status:', err);
    res.status(500).json({ error: 'Erro ao atualizar status' });
  }
});

module.exports = router;
