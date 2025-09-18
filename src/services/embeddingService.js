const OpenAI = require('openai');
const logger = require('../utils/logger');

class EmbeddingService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.model = 'text-embedding-3-small'; // Latest embedding model
    this.dimensions = 1536;
  }

  async generateEmbedding(text) {
    try {
      if (!text || typeof text !== 'string') {
        throw new Error('Invalid text input for embedding generation');
      }

      const response = await this.openai.embeddings.create({
        model: this.model,
        input: text.trim(),
        dimensions: this.dimensions,
      });

      return response.data[0].embedding;
    } catch (error) {
      logger.error('Error generating embedding:', error);
      throw new Error(`Failed to generate embedding: ${error.message}`);
    }
  }

  async generateEmbeddings(texts) {
    try {
      if (!Array.isArray(texts) || texts.length === 0) {
        throw new Error('Invalid texts array for embedding generation');
      }

      const response = await this.openai.embeddings.create({
        model: this.model,
        input: texts.map(text => text.trim()),
        dimensions: this.dimensions,
      });

      return response.data.map(item => item.embedding);
    } catch (error) {
      logger.error('Error generating embeddings:', error);
      throw new Error(`Failed to generate embeddings: ${error.message}`);
    }
  }

  calculateSimilarity(embedding1, embedding2) {
    if (!embedding1 || !embedding2) {
      return 0;
    }

    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings must have the same dimensions');
    }

    // Calculate cosine similarity
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }

    norm1 = Math.sqrt(norm1);
    norm2 = Math.sqrt(norm2);

    if (norm1 === 0 || norm2 === 0) {
      return 0;
    }

    return dotProduct / (norm1 * norm2);
  }

  calculateDistance(embedding1, embedding2) {
    // Calculate Euclidean distance
    if (!embedding1 || !embedding2) {
      return Infinity;
    }

    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings must have the same dimensions');
    }

    let sum = 0;
    for (let i = 0; i < embedding1.length; i++) {
      const diff = embedding1[i] - embedding2[i];
      sum += diff * diff;
    }

    return Math.sqrt(sum);
  }
}

module.exports = new EmbeddingService();
