// server.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

// Importar configuração do banco de dados - CAMINHO CORRIGIDO
const db = require('./config/db');

// Inicializar Express
const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(bodyParser.json());

// Conectar ao MongoDB usando a função importada
db.connectToDatabase()
  .then(() => console.log('MongoDB conectado via função db.connectToDatabase()'))
  .catch(err => {
    console.error('Erro ao conectar ao MongoDB:', err);
    process.exit(1);
  });

// Definir rotas - CAMINHOS CORRIGIDOS PARA MESMA PASTA
const submissionsRoute = require('./routes/submissions');
const statsRoute = require('./routes/stats');

app.use('/api/submissions', submissionsRoute);
app.use('/api/stats', statsRoute);

// Rota para analytics (eventos de tracking)
app.post('/api/analytics/events', (req, res) => {
  try {
    const eventData = req.body;
    
    // Aqui você poderia salvar os eventos em uma coleção separada
    // ou usar um serviço de analytics como o Google Analytics
    
    // Por enquanto, apenas logamos no console para fins de desenvolvimento
    console.log('Evento de analytics recebido:', eventData);
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Erro ao processar evento de analytics:', error);
    res.status(500).json({ error: 'Erro ao processar evento de analytics' });
  }
});

// Endpoint de status para verificar se o servidor está rodando
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Servir arquivos estáticos em produção
if (process.env.NODE_ENV === 'production') {
  // Servir arquivos estáticos da pasta build - CAMINHO CORRIGIDO
  app.use(express.static(path.join(__dirname, '../build')));
  
  // Qualquer rota não reconhecida deve carregar o React app
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../build', 'index.html'));
  });
}

// Iniciar o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

// Tratar erros não capturados para evitar queda do servidor
process.on('unhandledRejection', (err) => {
  console.log('Erro não tratado:', err);
  // Não fechamos o servidor em produção, apenas logamos o erro
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});
