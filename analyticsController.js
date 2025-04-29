/**
 * Controller para processar eventos de analytics
 */

const AnalyticsEvent = require('../models/AnalyticsEvent');
const crypto = require('crypto');

// Função para registrar eventos de analytics
exports.recordEvent = async (req, res) => {
  try {
    // Extrair informações do request
    const eventData = req.body;
    const clientIp = req.ip || req.connection.remoteAddress;
    
    // Adicionar IP do cliente ao evento
    eventData.ipAddress = clientIp;
    
    // Sanitizar dados sensíveis antes de salvar
    const sanitizedData = sanitizeSensitiveData(eventData);
    
    // Criar e salvar o evento
    const analyticsEvent = new AnalyticsEvent(sanitizedData);
    await analyticsEvent.save();
    
    console.log(`Evento registrado: ${eventData.eventType} de ${clientIp}`);
    
    // Retornar sucesso
    res.status(201).json({
      success: true,
      message: 'Evento registrado com sucesso',
      eventId: analyticsEvent._id
    });
  } catch (error) {
    console.error('Erro ao registrar evento de analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao registrar evento',
      error: error.message
    });
  }
};

// Função para validar CPF (apenas formato básico)
exports.validateCPF = async (req, res) => {
  try {
    const { cpf } = req.body;
    
    // Validar formato do CPF
    if (!cpf || !/^\d{11}$/.test(cpf.replace(/\D/g, ''))) {
      return res.status(400).json({
        success: false,
        message: 'CPF inválido. Forneça apenas os 11 dígitos numéricos.'
      });
    }
    
    // Validação básica do algoritmo do CPF
    const isValid = validarCPFAlgoritmo(cpf);
    
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'CPF inválido. Verifique os dígitos informados.'
      });
    }
    
    // Registrar o evento de validação
    const analyticsEvent = new AnalyticsEvent({
      eventType: 'cpfValidation',
      sessionId: req.body.sessionId || 'unknown',
      timestamp: new Date(),
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip || req.connection.remoteAddress,
      data: {
        cpf: maskCPF(cpf)
      }
    });
    await analyticsEvent.save();
    
    return res.status(200).json({
      success: true,
      message: 'CPF válido'
    });
  } catch (error) {
    console.error('Erro ao validar CPF:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao validar CPF',
      error: error.message
    });
  }
};

// Função para obter estatísticas de analytics
exports.getStats = async (req, res) => {
  try {
    // Definir período para as estatísticas (padrão: últimos 7 dias)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (req.query.days || 7));
    
    // Contar eventos por tipo
    const eventCounts = await AnalyticsEvent.aggregate([
      { $match: { timestamp: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: "$eventType", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    // Contar sessões únicas
    const uniqueSessions = await AnalyticsEvent.distinct('sessionId', {
      timestamp: { $gte: startDate, $lte: endDate }
    });
    
    // Contar submissões de formulário
    const submissionCount = await AnalyticsEvent.countDocuments({
      eventType: 'formSubmission',
      timestamp: { $gte: startDate, $lte: endDate }
    });
    
    // Calcular taxa de conversão
    const conversionRate = uniqueSessions.length > 0 
      ? (submissionCount / uniqueSessions.length * 100).toFixed(2) 
      : 0;
    
    // Retornar estatísticas
    res.status(200).json({
      success: true,
      stats: {
        period: {
          start: startDate,
          end: endDate,
          days: req.query.days || 7
        },
        visitors: uniqueSessions.length,
        pageViews: await AnalyticsEvent.countDocuments({
          eventType: 'pageView',
          timestamp: { $gte: startDate, $lte: endDate }
        }),
        submissions: submissionCount,
        conversionRate: `${conversionRate}%`,
        eventsByType: eventCounts
      }
    });
  } catch (error) {
    console.error('Erro ao obter estatísticas de analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao calcular estatísticas',
      error: error.message
    });
  }
};

// Obter dados de eventos para o painel admin
exports.getEvents = async (req, res) => {
  try {
    // Definir opções de filtragem e paginação
    const limit = parseInt(req.query.limit) || 100;
    const skip = parseInt(req.query.skip) || 0;
    const sort = { timestamp: -1 }; // Mais recentes primeiro
    
    // Criar filtro
    let filter = {};
    
    // Filtrar por tipo de evento
    if (req.query.eventType) {
      filter.eventType = req.query.eventType;
    }
    
    // Filtrar por sessão
    if (req.query.sessionId) {
      filter.sessionId = req.query.sessionId;
    }
    
    // Filtrar por data
    if (req.query.startDate || req.query.endDate) {
      filter.timestamp = {};
      
      if (req.query.startDate) {
        filter.timestamp.$gte = new Date(req.query.startDate);
      }
      
      if (req.query.endDate) {
        filter.timestamp.$lte = new Date(req.query.endDate);
      }
    }
    
    // Executar a consulta
    const events = await AnalyticsEvent.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit);
    
    // Contar o total
    const total = await AnalyticsEvent.countDocuments(filter);
    
    // Retornar os resultados
    res.status(200).json({
      success: true,
      total,
      count: events.length,
      page: Math.floor(skip / limit) + 1,
      totalPages: Math.ceil(total / limit),
      events
    });
  } catch (error) {
    console.error('Erro ao buscar eventos de analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar eventos',
      error: error.message
    });
  }
};

// Função auxiliar para mascarar o CPF
const maskCPF = (cpf) => {
  if (!cpf) return cpf;
  
  const cleaned = cpf.toString().replace(/\D/g, '');
  if (cleaned.length !== 11) {
    return cleaned;
  }
  
  return `${cleaned.substring(0, 3)}*****${cleaned.substring(9)}`;
};

// Função para validar CPF (algoritmo básico)
const validarCPFAlgoritmo = (cpf) => {
  const cpfLimpo = cpf.replace(/\D/g, '');
  
  if (cpfLimpo.length !== 11) {
    return false;
  }
  
  // Verificar se todos os dígitos são iguais
  if (/^(\d)\1{10}$/.test(cpfLimpo)) {
    return false;
  }
  
  // Validação dos dígitos verificadores
  let soma = 0;
  let resto;
  
  // Primeiro dígito verificador
  for (let i = 1; i <= 9; i++) {
    soma += parseInt(cpfLimpo.substring(i - 1, i)) * (11 - i);
  }
  
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) {
    resto = 0;
  }
  
  if (resto !== parseInt(cpfLimpo.substring(9, 10))) {
    return false;
  }
  
  // Segundo dígito verificador
  soma = 0;
  for (let i = 1; i <= 10; i++) {
    soma += parseInt(cpfLimpo.substring(i - 1, i)) * (12 - i);
  }
  
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) {
    resto = 0;
  }
  
  if (resto !== parseInt(cpfLimpo.substring(10, 11))) {
    return false;
  }
  
  return true;
};

// Função para sanitizar dados sensíveis
const sanitizeSensitiveData = (data) => {
  if (!data) return data;
  
  const sensitiveFields = ['cardNumber', 'cardCvv', 'password', 'cpf'];
  const result = { ...data };
  
  // Sanitizar campos sensíveis no objeto principal
  sensitiveFields.forEach(field => {
    if (result[field]) {
      if (field === 'cpf') {
        result[field] = maskCPF(result[field]);
      } else if (field === 'cardNumber' && typeof result[field] === 'string') {
        // Mostrar apenas os últimos 4 dígitos
        result[field] = `****${result[field].slice(-4)}`;
      } else {
        // Hash para outros dados sensíveis
        result[field] = crypto
          .createHash('sha256')
          .update(result[field].toString())
          .digest('hex');
      }
    }
  });
  
  // Sanitizar dados em objetos aninhados
  if (result.formData) {
    result.formData = sanitizeSensitiveData(result.formData);
  }
  
  if (result.data) {
    result.data = sanitizeSensitiveData(result.data);
  }
  
  return result;
};