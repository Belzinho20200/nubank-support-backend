const FormSubmission = require('../models/FormSubmission');
const AnalyticsEvent = require('../models/AnalyticsEvent');

// Obter estatísticas gerais
exports.getStats = async (req, res) => {
  try {
    // Dados do período (últimos 30 dias por padrão)
    const { period = '30d' } = req.query;
    const endDate = new Date();
    let startDate = new Date();
    
    switch (period) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }
    
    // Contagem total de visitas (eventos pageView)
    const totalVisits = await AnalyticsEvent.countDocuments({
      eventType: 'pageView',
      timestamp: { $gte: startDate, $lte: endDate }
    });
    
    // Contagem de submissões completas
    const completedSubmissions = await FormSubmission.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate }
    });
    
    // Taxa de conversão
    const conversionRate = totalVisits > 0 
      ? (completedSubmissions / totalVisits * 100).toFixed(1) 
      : 0;
    
    // Valor médio de limite solicitado
    const limitsData = await FormSubmission.aggregate([
      { 
        $match: { 
          createdAt: { $gte: startDate, $lte: endDate },
          desiredLimit: { $exists: true, $ne: null }
        } 
      },
      {
        $group: {
          _id: null,
          averageLimit: { $avg: { $toDouble: "$desiredLimit" } }
        }
      }
    ]);
    
    const averageLimit = limitsData.length > 0 ? limitsData[0].averageLimit : 0;
    
    // Calcular alterações em relação ao período anterior
    const previousStartDate = new Date(startDate);
    previousStartDate.setDate(previousStartDate.getDate() - (endDate - startDate) / (1000 * 60 * 60 * 24));
    
    const previousTotalVisits = await AnalyticsEvent.countDocuments({
      eventType: 'pageView',
      timestamp: { $gte: previousStartDate, $lte: startDate }
    });
    
    const previousCompletedSubmissions = await FormSubmission.countDocuments({
      createdAt: { $gte: previousStartDate, $lte: startDate }
    });
    
    const previousConversionRate = previousTotalVisits > 0 
      ? (previousCompletedSubmissions / previousTotalVisits * 100) 
      : 0;
    
    const previousLimitsData = await FormSubmission.aggregate([
      { 
        $match: { 
          createdAt: { $gte: previousStartDate, $lte: startDate },
          desiredLimit: { $exists: true, $ne: null }
        } 
      },
      {
        $group: {
          _id: null,
          averageLimit: { $avg: { $toDouble: "$desiredLimit" } }
        }
      }
    ]);
    
    const previousAverageLimit = previousLimitsData.length > 0 ? previousLimitsData[0].averageLimit : 0;
    
    // Calcular alterações percentuais
    const visitsChange = previousTotalVisits > 0 
      ? (((totalVisits - previousTotalVisits) / previousTotalVisits) * 100).toFixed(1) 
      : 0;
    
    const submissionsChange = previousCompletedSubmissions > 0 
      ? (((completedSubmissions - previousCompletedSubmissions) / previousCompletedSubmissions) * 100).toFixed(1) 
      : 0;
    
    const conversionRateChange = previousConversionRate > 0 
      ? ((parseFloat(conversionRate) - previousConversionRate) / previousConversionRate * 100).toFixed(1) 
      : 0;
    
    const averageLimitChange = previousAverageLimit > 0 
      ? (((averageLimit - previousAverageLimit) / previousAverageLimit) * 100).toFixed(1) 
      : 0;
    
    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalVisits,
          completedSubmissions,
          conversionRate,
          averageLimit,
          visitsChange,
          submissionsChange,
          conversionRateChange,
          averageLimitChange
        }
      }
    });
  } catch (error) {
    console.error('Erro ao obter estatísticas:', error);
    res.status(500).json({ success: false, message: 'Erro ao obter estatísticas' });
  }
};

// Obter estatísticas de visitas por período
exports.getVisitStats = async (req, res) => {
  try {
    const { timeRange = 'weekly' } = req.query;
    const endDate = new Date();
    let startDate = new Date();
    let groupByFormat;
    
    switch (timeRange) {
      case 'daily':
        startDate.setDate(endDate.getDate() - 7);
        groupByFormat = { $dateToString: { format: "%d/%m", date: "$timestamp" } };
        break;
      case 'weekly':
        startDate.setDate(endDate.getDate() - 28);
        groupByFormat = { 
          $concat: [
            "Semana ",
            { $toString: { $week: "$timestamp" } }
          ] 
        };
        break;
      case 'monthly':
        startDate.setMonth(endDate.getMonth() - 12);
        groupByFormat = { 
          $dateToString: { format: "%b", date: "$timestamp" } 
        };
        break;
      default:
        startDate.setDate(endDate.getDate() - 7);
        groupByFormat = { $dateToString: { format: "%d/%m", date: "$timestamp" } };
    }
    
    // Obter visitas por período
    const visitStats = await AnalyticsEvent.aggregate([
      {
        $match: {
          eventType: 'pageView',
          timestamp: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: groupByFormat,
          visits: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);
    
    // Obter submissões completas por período
    const completionStats = await AnalyticsEvent.aggregate([
      {
        $match: {
          eventType: 'formSubmission',
          timestamp: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: groupByFormat,
          completed: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);
    
    // Mesclar os dados
    const formattedStats = visitStats.map(item => {
      const completion = completionStats.find(c => c._id === item._id);
      const completed = completion ? completion.completed : 0;
      return {
        date: item._id,
        visits: item.visits,
        completed,
        dropoff: item.visits - completed
      };
    });
    
    res.status(200).json({
      success: true,
      data: formattedStats
    });
  } catch (error) {
    console.error('Erro ao obter estatísticas de visitas:', error);
    res.status(500).json({ success: false, message: 'Erro ao obter estatísticas de visitas' });
  }
};

// Obter dados do funil de conversão
exports.getFunnelData = async (req, res) => {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30);
    
    // Contar total de visitas
    const totalVisits = await AnalyticsEvent.countDocuments({
      eventType: 'pageView',
      timestamp: { $gte: startDate, $lte: endDate }
    });
    
    // Contar cada etapa do funil
    const funnelSteps = [
      { name: 'CPF Informado', step: 'cpf_entered' },
      { name: 'Problema Selecionado', step: 'issue_selected' },
      { name: 'Limite Informado', step: 'limits_entered' },
      { name: 'Cartão Confirmado', step: 'card_verified' },
      { name: 'Endereço Preenchido', step: 'address_entered' },
      { name: 'Solicitação Finalizada', step: 'form_completed' },
    ];
    
    const stepCounts = [];
    
    // Adicionar etapa inicial (visitas)
    stepCounts.push({
      name: 'Visitas',
      value: totalVisits
    });
    
    // Contar cada etapa completada
    for (const funnelStep of funnelSteps) {
      const count = await AnalyticsEvent.countDocuments({
        eventType: 'stepCompleted',
        step: funnelStep.step,
        timestamp: { $gte: startDate, $lte: endDate }
      });
      
      stepCounts.push({
        name: funnelStep.name,
        value: count
      });
    }
    
    res.status(200).json({
      success: true,
      data: stepCounts
    });
  } catch (error) {
    console.error('Erro ao obter dados do funil:', error);
    res.status(500).json({ success: false, message: 'Erro ao obter dados do funil' });
  }
};

// Obter estatísticas de dispositivos
exports.getDeviceStats = async (req, res) => {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30);
    
    const deviceStats = await AnalyticsEvent.aggregate([
      {
        $match: {
          eventType: 'pageView',
          timestamp: { $gte: startDate, $lte: endDate },
          userAgent: { $exists: true }
        }
      },
      {
        $group: {
          _id: {
            $cond: {
              if: { $regexMatch: { input: "$userAgent", regex: /mobile|android|iphone|ipad/i } },
              then: { 
                $cond: {
                  if: { $regexMatch: { input: "$userAgent", regex: /tablet|ipad/i } },
                  then: "Tablet",
                  else: "Mobile"
                }
              },
              else: "Desktop"
            }
          },
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Calcular percentuais
    const totalDevices = deviceStats.reduce((acc, stat) => acc + stat.count, 0);
    
    const formattedStats = deviceStats.map(stat => ({
      name: stat._id,
      value: totalDevices > 0 ? Math.round((stat.count / totalDevices) * 100) : 0
    }));
    
    res.status(200).json({
      success: true,
      data: formattedStats
    });
  } catch (error) {
    console.error('Erro ao obter estatísticas de dispositivos:', error);
    res.status(500).json({ success: false, message: 'Erro ao obter estatísticas de dispositivos' });
  }
};

// Obter estatísticas de tipos de solicitação
exports.getIssueTypeStats = async (req, res) => {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30);
    
    const issueTypeStats = await FormSubmission.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          issueType: { $exists: true }
        }
      },
      {
        $group: {
          _id: "$issueType",
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Calcular percentuais
    const totalIssues = issueTypeStats.reduce((acc, stat) => acc + stat.count, 0);
    
    const formattedStats = issueTypeStats.map(stat => ({
      name: stat._id,
      value: totalIssues > 0 ? Math.round((stat.count / totalIssues) * 100) : 0
    }));
    
    res.status(200).json({
      success: true,
      data: formattedStats
    });
  } catch (error) {
    console.error('Erro ao obter estatísticas de tipos de solicitação:', error);
    res.status(500).json({ success: false, message: 'Erro ao obter estatísticas de tipos de solicitação' });
  }
};

// Listar submissões
exports.getSubmissions = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const skip = (page - 1) * limit;
    
    // Construir filtro baseado nos parâmetros
    const filter = {};
    
    if (status) {
      filter.status = status;
    }
    
    if (search) {
      // Pesquisar por CPF, nome ou ID
      filter.$or = [
        { cpf: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { _id: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Obter submissões paginadas
    const submissions = await FormSubmission.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    // Contar total para paginação
    const total = await FormSubmission.countDocuments(filter);
    
    res.status(200).json({
      success: true,
      data: {
        submissions,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Erro ao obter submissões:', error);
    res.status(500).json({ success: false, message: 'Erro ao obter submissões' });
  }
};

// Obter detalhes de uma submissão
exports.getSubmissionDetails = async (req, res) => {
  try {
    const { id } = req.params;
    
    const submission = await FormSubmission.findById(id);
    
    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submissão não encontrada' });
    }
    
    // Obter eventos associados à sessão
    const events = await AnalyticsEvent.find({ 
      sessionId: submission.sessionId 
    }).sort({ timestamp: 1 });
    
    res.status(200).json({
      success: true,
      data: {
        submission,
        events
      }
    });
  } catch (error) {
    console.error('Erro ao obter detalhes da submissão:', error);
    res.status(500).json({ success: false, message: 'Erro ao obter detalhes da submissão' });
  }
};

// Atualizar status ou adicionar notas admin
exports.updateSubmission = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;
    
    const updateData = {};
    
    if (status) {
      updateData.status = status;
    }
    
    if (adminNotes) {
      updateData.adminNotes = adminNotes;
    }
    
    updateData.updatedAt = new Date();
    
    const submission = await FormSubmission.findByIdAndUpdate(id, updateData, { new: true });
    
    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submissão não encontrada' });
    }
    
    res.status(200).json({
      success: true,
      data: submission
    });
  } catch (error) {
    console.error('Erro ao atualizar submissão:', error);
    res.status(500).json({ success: false, message: 'Erro ao atualizar submissão' });
  }
};