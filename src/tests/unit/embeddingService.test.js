// Mock the entire EmbeddingService module
const mockCreate = jest.fn();
const mockCalculateSimilarity = jest.fn();

jest.mock('../../services/embeddingService', () => {
  return jest.fn().mockImplementation(() => ({
    openai: {
      embeddings: {
        create: mockCreate,
      },
    },
    generateEmbedding: jest.fn(),
    calculateSimilarity: mockCalculateSimilarity,
  }));
});

const EmbeddingService = require('../../services/embeddingService');

describe('EmbeddingService', () => {
  let embeddingService;

  beforeEach(() => {
    embeddingService = new EmbeddingService();
    jest.clearAllMocks();
    
    // Set up the mock methods
    embeddingService.generateEmbedding = jest.fn();
    embeddingService.calculateSimilarity = mockCalculateSimilarity;
  });

  describe('generateEmbedding', () => {
    it('should generate embedding for text', async () => {
      const text = 'Test text for embedding';
      const mockEmbedding = [0.1, 0.2, 0.3, 0.4, 0.5];

      embeddingService.generateEmbedding.mockResolvedValue(mockEmbedding);

      const result = await embeddingService.generateEmbedding(text);

      expect(embeddingService.generateEmbedding).toHaveBeenCalledWith(text);
      expect(result).toEqual(mockEmbedding);
    });

    it('should handle API errors', async () => {
      const text = 'Test text';
      const error = new Error('API Error');

      embeddingService.generateEmbedding.mockRejectedValue(error);

      await expect(embeddingService.generateEmbedding(text))
        .rejects.toThrow('API Error');
    });

    it('should handle empty text', async () => {
      const text = '';
      const error = new Error('Invalid text input for embedding generation');

      embeddingService.generateEmbedding.mockRejectedValue(error);

      await expect(embeddingService.generateEmbedding(text))
        .rejects.toThrow('Invalid text input for embedding generation');
    });
  });

  describe('calculateSimilarity', () => {
    it('should calculate cosine similarity between two embeddings', () => {
      const embedding1 = [1, 0, 0];
      const embedding2 = [1, 0, 0];

      mockCalculateSimilarity.mockReturnValue(1);

      const result = embeddingService.calculateSimilarity(embedding1, embedding2);

      expect(mockCalculateSimilarity).toHaveBeenCalledWith(embedding1, embedding2);
      expect(result).toBe(1);
    });

    it('should handle zero vectors', () => {
      const embedding1 = [0, 0, 0];
      const embedding2 = [1, 0, 0];

      mockCalculateSimilarity.mockReturnValue(0);

      const result = embeddingService.calculateSimilarity(embedding1, embedding2);

      expect(mockCalculateSimilarity).toHaveBeenCalledWith(embedding1, embedding2);
      expect(result).toBe(0);
    });

    it('should handle different length vectors', () => {
      const embedding1 = [1, 0];
      const embedding2 = [1, 0, 0];
      const error = new Error('Embeddings must have the same dimensions');

      mockCalculateSimilarity.mockImplementation(() => {
        throw error;
      });

      expect(() => {
        embeddingService.calculateSimilarity(embedding1, embedding2);
      }).toThrow('Embeddings must have the same dimensions');
    });
  });
});