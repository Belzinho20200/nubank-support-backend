/**
 * Controller para operações relacionadas a submissões de formulários
 */

const FormSubmission = require('../models/FormSubmission');
const AnalyticsEvent = require('../models/AnalyticsEvent');

// Criar uma nova submissão
exports.createSubmission = async (req, res) => {
  try {
    const { sessionId, formData, userAgent, timestamp } = req.body;
    const clientIp = req.ip || req.connection.remoteAddress;
    
    // Validar entradas necessárias
    if (!sessionId || !formData) {
      return res.status(400).json({
        success: false,
        message: 'Dados incompletos. É necessário fornecer sessionId e formData.'
      });
    }
    
    // Converter formData para o formato estruturado do modelo
    const submissionData = FormSubmission.converterFormData(formData);
    
    // Criar a submissão
    const submission = new FormSubmission({
      sessionId,
      cpf: formData.cpf,
      tipoProblema: formData.issueType,
      userAgent,
      ipAddress: clientIp,
      timestamp: timestamp || new Date(),
      ...submissionData
    });
    
    // Gerar protocolo
    submission.gerarProtocolo();
    
    // Salvar no banco de dados
    await submission.save();
    
    // Registrar evento de analytics
    const analyticsEvent = new AnalyticsEvent({
      eventType: 'formSubmissionSuccess',
      sessionId: sessionId,
      timestamp: new Date(),
      userAgent: userAgent,
      ipAddress: clientIp,
      data: {
        submissionId: submission._id,
        tipoProblema: formData.issueType,
        protocolo: submission.protocoloGerado
      }
    });
    await analyticsEvent.save();
    
    // Retornar sucesso com dados sanitizados
    res.status(201).json({
      success: true,
      message: 'Submissão registrada com sucesso',
      data: {
        id: submission._id,
        protocolo: submission.protocoloGerado,
        timestamp: submission.timestamp
      }
    });
  } catch (error) {
    console.error('Erro ao registrar submissão:', error);
    
    // Registrar evento de erro
    try {
      const analyticsEvent = new AnalyticsEvent({
        eventType: 'formSubmissionError',
        sessionId: req.body.sessionId || 'unknown',
        timestamp: new Date(),
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip || req.connection.remoteAddress,
        data: {
          error: error.message
        }
      });
      await analyticsEvent.save();
    } catch (analyticsError) {
      console.error('Erro ao registrar evento de analytics:', analyticsError);
    }
    
    res.status(500).json({
      success: false,
      message: 'Erro ao registrar submissão',
      error: error.message
    });
  }
};

// Buscar submissão por ID
exports.getSubmissionById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const submission = await FormSubmission.findById(id);
    
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submissão não encontrada'
      });
    }
    
    // Retornar dados sanitizados
    res.status(200).json({
      success: true,
      data: submission.sanitizarParaExibicao()
    });
  } catch (error) {
    console.error('Erro ao buscar submissão:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar submissão',
      error: error.message
    });
  }
};

// Buscar submissões por CPF
exports.getSubmissionsByCPF = async (req, res) => {
  try {
    const { cpf } = req.params;
    
    // Limpar e validar o CPF
    const cpfLimpo = cpf.replace(/\D/g, '');
    
    if (!FormSubmission.validarCPF(cpfLimpo)) {
      return res.status(400).json({
        success: false,
        message: 'CPF inválido'
      });
    }
    
    // Buscar submissões
    const submissions = await FormSubmission.find({ cpf: cpfLimpo })
      .sort({ createdAt: -1 });
    
    // Sanitizar dados para exibição
    const sanitizedSubmissions = submissions.map(sub => sub.sanitizarParaExibicao());
    
    res.status(200).json({
      success: true,
      count: submissions.length,
      data: sanitizedSubmissions
    });
  } catch (error) {
    console.error('Erro ao buscar submissões por CPF:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar submissões',
      error: error.message
    });
  }
};

// Atualizar status de uma submissão
exports.updateSubmissionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    // Validar status
    const statusesValidos = ['novo', 'em_análise', 'atendido', 'cancelado'];
    if (!statusesValidos.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status inválido'
      });
    }
    
    const submission = await FormSubmission.findByIdAndUpdate(
      id,
      { status, updatedAt: new Date() },
      { new: true }
    );
    
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submissão não encontrada'
      });
    }
    
    // Registrar evento de atualização
    const analyticsEvent = new AnalyticsEvent({
      eventType: 'submissionStatusUpdate',
      sessionId: submission.sessionId,
      timestamp: new Date(),
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip || req.connection.remoteAddress,
      data: {
        submissionId: submission._id,
        oldStatus: submission.status,
        newStatus: status
      }
    });
    await analyticsEvent.save();
    
    res.status(200).json({
      success: true,
      message: 'Status atualizado com sucesso',
      data: submission.sanitizarParaExibicao()
    });
  } catch (error) {
    console.error('Erro ao atualizar status da submissão:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar status',
      error: error.message
    });
  }
};

// Listar todas as submissões (com paginação)
exports.listSubmissions = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    
    // Construir filtro
    const filter = {};
    if (status) {
      filter.status = status;
    }
    
    // Calcular skip para paginação
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Buscar submissões
    const submissions = await FormSubmission.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    // Contar total
    const total = await FormSubmission.countDocuments(filter);
    
    // Sanitizar dados para exibição
    const sanitizedSubmissions = submissions.map(sub => sub.sanitizarParaExibicao());
    
    res.status(200).json({
      success: true,
      count: submissions.length,
      total,
      pages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      data: sanitizedSubmissions
    });
  } catch (error) {
    console.error('Erro ao listar submissões:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao listar submissões',
      error: error.message
    });
  }
};

// Adicionar comentário administrativo a uma submissão
exports.addSubmissionComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { comment, adminUser } = req.body;
    
    if (!comment) {
      return res.status(400).json({
        success: false,
        message: 'Comentário não pode estar vazio'
      });
    }
    
    const submission = await FormSubmission.findById(id);
    
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submissão não encontrada'
      });
    }
    
    // Adicionar comentário
    if (!submission.adminComments) {
      submission.adminComments = [];
    }
    
    submission.adminComments.push({
      text: comment,
      createdBy: adminUser || 'admin',
      createdAt: new Date()
    });
    
    submission.updatedAt = new Date();
    
    await submission.save();
    
    res.status(200).json({
      success: true,
      message: 'Comentário adicionado com sucesso',
      data: submission.sanitizarParaExibicao()
    });
  } catch (error) {
    console.error('Erro ao adicionar comentário:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao adicionar comentário',
      error: error.message
    });
  }
};