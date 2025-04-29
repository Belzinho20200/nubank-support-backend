/**
 * Utilitários para validação e formatação de dados
 */

// Validar CPF
export const validarCPF = (cpf) => {
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
  
  // Validar número de cartão de crédito (algoritmo de Luhn)
  export const validarCartao = (numero) => {
    const numeroLimpo = numero.replace(/\D/g, '');
    
    if (numeroLimpo.length < 13 || numeroLimpo.length > 19) {
      return false;
    }
    
    // Algoritmo de Luhn (Mod 10)
    let soma = 0;
    let dobrar = false;
    
    // Iterar de trás para frente
    for (let i = numeroLimpo.length - 1; i >= 0; i--) {
      let digito = parseInt(numeroLimpo.charAt(i));
      
      if (dobrar) {
        digito *= 2;
        if (digito > 9) {
          digito -= 9;
        }
      }
      
      soma += digito;
      dobrar = !dobrar;
    }
    
    // Número válido se a soma for múltiplo de 10
    return (soma % 10) === 0;
  };
  
  // Formatação de CPF: 000.000.000-00
  export const formatarCPF = (cpf) => {
    const cpfLimpo = cpf.replace(/\D/g, '');
    
    if (cpfLimpo.length <= 3) {
      return cpfLimpo;
    }
    
    if (cpfLimpo.length <= 6) {
      return `${cpfLimpo.substring(0, 3)}.${cpfLimpo.substring(3)}`;
    }
    
    if (cpfLimpo.length <= 9) {
      return `${cpfLimpo.substring(0, 3)}.${cpfLimpo.substring(3, 6)}.${cpfLimpo.substring(6)}`;
    }
    
    return `${cpfLimpo.substring(0, 3)}.${cpfLimpo.substring(3, 6)}.${cpfLimpo.substring(6, 9)}-${cpfLimpo.substring(9, 11)}`;
  };
  
  // Formatação de cartão: 0000 0000 0000 0000
  export const formatarCartao = (numero) => {
    const numeroLimpo = numero.replace(/\D/g, '');
    
    if (numeroLimpo.length <= 4) {
      return numeroLimpo;
    }
    
    if (numeroLimpo.length <= 8) {
      return `${numeroLimpo.substring(0, 4)} ${numeroLimpo.substring(4)}`;
    }
    
    if (numeroLimpo.length <= 12) {
      return `${numeroLimpo.substring(0, 4)} ${numeroLimpo.substring(4, 8)} ${numeroLimpo.substring(8)}`;
    }
    
    return `${numeroLimpo.substring(0, 4)} ${numeroLimpo.substring(4, 8)} ${numeroLimpo.substring(8, 12)} ${numeroLimpo.substring(12, 16)}`;
  };
  
  // Formatação de moeda: R$ 0,00
  export const formatarMoeda = (valor) => {
    const valorLimpo = valor.replace(/\D/g, '');
    
    if (valorLimpo === '') {
      return '';
    }
    
    const valorNumerico = parseFloat(valorLimpo) / 100;
    
    return `R$ ${valorNumerico.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };
  
  // Validar e-mail
  export const validarEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
  };
  
  // Validar CEP
  export const validarCEP = (cep) => {
    const cepLimpo = cep.replace(/\D/g, '');
    return cepLimpo.length === 8;
  };
  
  // Formatação de CEP: 00000-000
  export const formatarCEP = (cep) => {
    const cepLimpo = cep.replace(/\D/g, '');
    
    if (cepLimpo.length <= 5) {
      return cepLimpo;
    }
    
    return `${cepLimpo.substring(0, 5)}-${cepLimpo.substring(5, 8)}`;
  };