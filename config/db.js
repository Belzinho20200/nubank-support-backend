// db.js
const { MongoClient } = require('mongodb');

// Substitua pela sua string de conexão do MongoDB
const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/nubank-support";
const client = new MongoClient(uri);

// Conecta ao MongoDB
async function connectToDatabase() {
  try {
    await client.connect();
    console.log("Conectado com sucesso ao MongoDB");
    // Usar o mesmo nome de banco de dados da string de conexão
    return client.db("nubank-support");
  } catch (error) {
    console.error("Erro ao conectar ao MongoDB:", error);
    throw error;
  }
}

// Salva uma submissão no banco de dados
async function saveSubmission(submissionData) {
  try {
    const database = await connectToDatabase();
    const submissions = database.collection("submissions");
    
    // Adiciona timestamp à submissão
    const submission = {
      ...submissionData,
      createdAt: new Date(),
      status: "novo" // Status inicial
    };
    
    const result = await submissions.insertOne(submission);
    console.log(`Submissão salva com ID: ${result.insertedId}`);
    return result.insertedId;
  } catch (error) {
    console.error("Erro ao salvar submissão:", error);
    throw error;
  } finally {
    // Fechar conexão após operação
    // await client.close(); // Comentado para permitir reutilização da conexão
  }
}

// Obtém todas as submissões
async function getSubmissions() {
  try {
    const database = await connectToDatabase();
    const submissions = database.collection("submissions");
    
    return await submissions.find({}).sort({ createdAt: -1 }).toArray();
  } catch (error) {
    console.error("Erro ao buscar submissões:", error);
    throw error;
  }
}

// Atualiza o status de uma submissão
async function updateSubmissionStatus(submissionId, newStatus) {
  try {
    const database = await connectToDatabase();
    const submissions = database.collection("submissions");
    
    const result = await submissions.updateOne(
      { _id: submissionId },
      { $set: { status: newStatus, updatedAt: new Date() } }
    );
    
    return result.modifiedCount > 0;
  } catch (error) {
    console.error("Erro ao atualizar status da submissão:", error);
    throw error;
  }
}

// Fecha a conexão com o MongoDB
async function closeConnection() {
  await client.close();
  console.log("Conexão com MongoDB fechada");
}

module.exports = {
  connectToDatabase,
  saveSubmission,
  getSubmissions,
  updateSubmissionStatus,
  closeConnection
};
