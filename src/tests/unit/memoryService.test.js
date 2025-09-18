// Mock EmbeddingService first
const mockGenerateEmbedding = jest.fn();
const mockCalculateSimilarity = jest.fn();

jest.mock('../../services/embeddingService', () => {
  return jest.fn().mockImplementation(() => ({
    generateEmbedding: mockGenerateEmbedding,
    calculateSimilarity: mockCalculateSimilarity,
  }));
});

const MemoryService = require('../../services/memoryService');

// Mock Prisma
const mockPrisma = {
  memory: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    updateMany: jest.fn(),
    groupBy: jest.fn(),
    count: jest.fn(),
  },
  memoryLink: {
    create: jest.fn(),
    findMany: jest.fn(),
    deleteMany: jest.fn(),
    createMany: jest.fn(),
    count: jest.fn(),
  },
  proceduralStep: {
    deleteMany: jest.fn(),
  },
  agent: {
    findUnique: jest.fn(),
  },
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => mockPrisma),
  Prisma: {
    MemoryType: {
      EPISODIC: 'EPISODIC',
      SEMANTIC: 'SEMANTIC',
      PROCEDURAL: 'PROCEDURAL',
      WORKING: 'WORKING',
      ARCHIVED: 'ARCHIVED',
    },
    LinkType: {
      SEMANTIC: 'SEMANTIC',
      TEMPORAL: 'TEMPORAL',
      CAUSAL: 'CAUSAL',
      CONTEXTUAL: 'CONTEXTUAL',
      HIERARCHICAL: 'HIERARCHICAL',
    },
  },
}));

describe('MemoryService', () => {
  let memoryService;

  beforeEach(() => {
    memoryService = new MemoryService();
    memoryService.prisma = mockPrisma;
    memoryService.similarityThreshold = 0.2; // Set lower threshold for testing
    jest.clearAllMocks();
  });

  describe('createMemory', () => {
    it('should create a memory with embedding', async () => {
      const agentId = 'agent-123';
      const memoryData = {
        content: 'Test memory content',
        type: 'EPISODIC',
      };
      const mockEmbedding = [0.1, 0.2, 0.3];
      const mockMemory = {
        id: 'memory-123',
        agentId,
        ...memoryData,
        embedding: JSON.stringify(mockEmbedding),
        createdAt: new Date(),
      };

      mockGenerateEmbedding.mockResolvedValue(mockEmbedding);
      mockPrisma.memory.create.mockResolvedValue(mockMemory);
      mockPrisma.memory.findMany.mockResolvedValue([]); // No similar memories
      mockPrisma.memoryLink.createMany.mockResolvedValue({ count: 0 });

      const result = await memoryService.createMemory(agentId, memoryData);

      expect(mockGenerateEmbedding).toHaveBeenCalledWith(memoryData.content);
      expect(mockPrisma.memory.create).toHaveBeenCalledWith({
        data: {
          agentId,
          sessionId: null,
          content: memoryData.content,
          type: memoryData.type,
          embedding: JSON.stringify(mockEmbedding),
          metadata: {},
        },
        include: {
          agent: true,
          session: true,
        },
      });
      expect(result).toEqual(mockMemory);
    });

    it('should handle embedding generation failure', async () => {
      const agentId = 'agent-123';
      const memoryData = { content: 'Test memory content' };

      mockGenerateEmbedding.mockRejectedValue(new Error('Embedding failed'));

      await expect(memoryService.createMemory(agentId, memoryData))
        .rejects.toThrow('Embedding failed');
    });
  });

  describe('findSimilarMemories', () => {
    it('should find similar memories based on embedding', async () => {
      const embedding = [0.1, 0.2, 0.3];
      const excludeId = 'memory-123';
      const mockMemories = [
        { id: 'memory-1', embedding: JSON.stringify([0.1, 0.2, 0.3]), content: 'test1', type: 'EPISODIC', importance: 0.8 },
        { id: 'memory-2', embedding: JSON.stringify([0.9, 0.8, 0.7]), content: 'test2', type: 'SEMANTIC', importance: 0.6 },
      ];

      mockPrisma.memory.findMany.mockResolvedValue(mockMemories);
      mockCalculateSimilarity
        .mockReturnValueOnce(0.8) // Similar (above threshold)
        .mockReturnValueOnce(0.4); // Similar (above threshold)

      const result = await memoryService.findSimilarMemories(embedding, excludeId);

      expect(mockPrisma.memory.findMany).toHaveBeenCalledWith({
        where: {
          embedding: { not: null },
          id: { not: excludeId },
        },
        select: {
          id: true,
          content: true,
          embedding: true,
          type: true,
          importance: true,
        },
      });
      expect(result).toHaveLength(2);
      expect(result[0].similarity).toBe(0.8);
      expect(result[1].similarity).toBe(0.4);
    });
  });

  describe('updateMemory', () => {
    it('should update memory successfully', async () => {
      const memoryId = 'memory-123';
      const updateData = {
        content: 'Updated content',
        importance: 0.8,
      };
      const mockEmbedding = [0.1, 0.2, 0.3];
      const mockUpdatedMemory = {
        id: memoryId,
        ...updateData,
        updatedAt: new Date(),
      };

      mockGenerateEmbedding.mockResolvedValue(mockEmbedding);
      mockPrisma.memory.update.mockResolvedValue(mockUpdatedMemory);
      mockPrisma.memoryLink.deleteMany.mockResolvedValue({ count: 2 });
      mockPrisma.memoryLink.createMany.mockResolvedValue({ count: 1 });

      const result = await memoryService.updateMemory(memoryId, updateData);

      expect(mockGenerateEmbedding).toHaveBeenCalledWith(updateData.content);
      expect(mockPrisma.memory.update).toHaveBeenCalledWith({
        where: { id: memoryId },
        data: {
          content: updateData.content,
          importance: updateData.importance,
          embedding: JSON.stringify(mockEmbedding),
          updatedAt: expect.any(Date),
        },
        include: {
          agent: true,
          session: true,
        },
      });
      expect(result).toEqual(mockUpdatedMemory);
    });

    it('should handle memory not found', async () => {
      const memoryId = 'memory-123';
      const updateData = { content: 'Updated content' };

      mockPrisma.memory.update.mockRejectedValue(new Error('Record not found'));

      await expect(memoryService.updateMemory(memoryId, updateData))
        .rejects.toThrow('Record not found');
    });
  });

  describe('deleteMemory', () => {
    it('should delete memory successfully', async () => {
      const memoryId = 'memory-123';

      mockPrisma.memoryLink.deleteMany.mockResolvedValue({ count: 2 });
      mockPrisma.proceduralStep.deleteMany.mockResolvedValue({ count: 1 });
      mockPrisma.memory.delete.mockResolvedValue({ id: memoryId });

      const result = await memoryService.deleteMemory(memoryId);

      expect(mockPrisma.memoryLink.deleteMany).toHaveBeenCalled();
      expect(mockPrisma.proceduralStep.deleteMany).toHaveBeenCalledWith({
        where: { memoryId },
      });
      expect(mockPrisma.memory.delete).toHaveBeenCalledWith({
        where: { id: memoryId },
      });
      expect(result).toEqual({ success: true });
    });
  });

  describe('getMemoryStats', () => {
    it('should return memory statistics for an agent', async () => {
      const agentId = 'agent-123';
      const mockStats = [
        { type: 'EPISODIC', _count: { id: 5 }, _avg: { importance: 0.8, accessCount: 3 } },
        { type: 'SEMANTIC', _count: { id: 3 }, _avg: { importance: 0.6, accessCount: 2 } },
        { type: 'PROCEDURAL', _count: { id: 2 }, _avg: { importance: 0.9, accessCount: 5 } },
      ];

      mockPrisma.memory.groupBy.mockResolvedValue(mockStats);
      mockPrisma.memory.count.mockResolvedValue(10);
      mockPrisma.memoryLink.count.mockResolvedValue(15);

      const result = await memoryService.getMemoryStats(agentId);

      expect(mockPrisma.memory.groupBy).toHaveBeenCalledWith({
        by: ['type'],
        where: { agentId },
        _count: { id: true },
        _avg: { importance: true, accessCount: true },
      });
      expect(mockPrisma.memory.count).toHaveBeenCalledWith({
        where: { agentId },
      });
      expect(mockPrisma.memoryLink.count).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.totalMemories).toBe(10);
      expect(result.totalLinks).toBe(15);
    });
  });
});