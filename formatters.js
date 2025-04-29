/**
 * Utilitários para formatação de dados
 */

// Formatar CPF: 000.000.000-00
const formatarCPF = (cpf) => {
    const cpfLimpo = cpf.replace(/\D/g, '');
    
    if (cpfLimpo.length !== 11) {
      return cpfLimpo;
    }
    
    return `${cpfLimpo.substring(0, 3)}.${cpfLimpo.substring(3, 6)}.${cpfLimpo.substring(6, 9)}-${cpfLimpo.substring(9)}`;
  };
  
  // Mascarar CPF: 123.*****78
  const mascaraCPF = (cpf) => {
    const cpfLimpo = cpf.replace(/\D/g, '');
    
    if (cpfLimpo.length !== 11) {
      return cpfLimpo;
    }
    
    return `${cpfLimpo.substring(0, 3)}*****${cpfLimpo.substring(9)}`;
  };
  
  // Formatar valor monetário: R$ 1.000,00
  const formatarMoeda = (valor) => {
    if (typeof valor === 'string') {
      valor = parseFloat(valor.replace(/[^\d,.]/g, '').replace('.', '').replace(',', '.'));
    }
    
    if (isNaN(valor)) {
      return 'R$ 0,00';
    }
    
    return valor.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };
  
  // Formatar data para exibição: DD/MM/YYYY
  const formatarData = (data) => {
    if (!data) {
      return '';
    }
    
    const dataObj = new Date(data);
    
    if (isNaN(dataObj.getTime())) {
      return data.toString();
    }
    
    const dia = String(dataObj.getDate()).padStart(2, '0');
    const mes = String(dataObj.getMonth() + 1).padStart(2, '0');
    const ano = dataObj.getFullYear();
    
    return `${dia}/${mes}/${ano}`;
  };
  
  // Formatar data e hora para exibição: DD/MM/YYYY HH:MM
  const formatarDataHora = (data) => {
    if (!data) {
      return '';
    }
    
    const dataObj = new Date(data);
    
    if (isNaN(dataObj.getTime())) {
      return data.toString();
    }
    
    const dia = String(dataObj.getDate()).padStart(2, '0');
    const mes = String(dataObj.getMonth() + 1).padStart(2, '0');
    const ano = dataObj.getFullYear();
    const hora = String(dataObj.getHours()).padStart(2, '0');
    const minuto = String(dataObj.getMinutes()).padStart(2, '0');
    
    return `${dia}/${mes}/${ano} ${hora}:${minuto}`;
  };
  
  // Formatar CEP: 00000-000
  const formatarCEP = (cep) => {
    const cepLimpo = cep.replace(/\D/g, '');
    
    if (cepLimpo.length !== 8) {
      return cepLimpo;
    }
    
    return `${cepLimpo.substring(0, 5)}-${cepLimpo.substring(5)}`;
  };
  
  // Formatar número de cartão: **** **** **** 1234
  const formatarCartao = (numero) => {
    const numeroLimpo = numero.replace(/\D/g, '');
    
    if (numeroLimpo.length < 4) {
      return numeroLimpo;
    }
    
    // Mostrar apenas os últimos 4 dígitos
    return `**** **** **** ${numeroLimpo.slice(-4)}`;
  };
  
  // Formatar telefone: (00) 00000-0000
  const formatarTelefone = (telefone) => {
    const telefoneLimpo = telefone.replace(/\D/g, '');
    
    if (telefoneLimpo.length < 10) {
      return telefoneLimpo;
    }
    
    if (telefoneLimpo.length === 11) {
      // Celular com 9 dígitos
      return `(${telefoneLimpo.slice(0, 2)}) ${telefoneLimpo.slice(2, 7)}-${telefoneLimpo.slice(7)}`;
    }
    
    // Telefone fixo
    return `(${telefoneLimpo.slice(0, 2)}) ${telefoneLimpo.slice(2, 6)}-${telefoneLimpo.slice(6)}`;
  };
  
  module.exports = {
    formatarCPF,
    mascaraCPF,
    formatarMoeda,
    formatarData,
    formatarDataHora,
    formatarCEP,
    formatarCartao,
    formatarTelefone
  };