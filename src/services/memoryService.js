const { PrismaClient } = require('@prisma/client');
const EmbeddingService = require('./embeddingService');
const logger = require('../utils/logger');

class MemoryService {
  constructor() {
    this.prisma = new PrismaClient();
    this.embeddingService = new EmbeddingService();
    this.similarityThreshold = parseFloat(process.env.SIMILARITY_THRESHOLD) || 0.3;
    this.decayRate = parseFloat(process.env.MEMORY_DECAY_RATE) || 0.01;
  }

  async createMemory(agentId, memoryData) {
    try {
      const { content, type = 'EPISODIC', sessionId = null, metadata = {} } = memoryData;

      // Generate embedding for the content
      const embedding = await this.embeddingService.generateEmbedding(content);

      // Create the memory
      const memory = await this.prisma.memory.create({
        data: {
          agentId,
          sessionId,
          content,
          type,
          embedding: JSON.stringify(embedding),
          metadata,
        },
        include: {
          agent: true,
          session: true,
        },
      });

      // Find and create semantic links
      await this.createSemanticLinks(memory.id, embedding);

      logger.info(`Created memory ${memory.id} for agent ${agentId}`);
      return memory;
    } catch (error) {
      logger.error('Error creating memory:', error);
      throw error;
    }
  }

  async createSemanticLinks(memoryId, embedding) {
    try {
      // Find similar memories
      const similarMemories = await this.findSimilarMemories(embedding, memoryId);

      // Create links for similar memories
      const links = similarMemories.map(similar => ({
        sourceId: memoryId,
        targetId: similar.id,
        linkType: 'SEMANTIC',
        strength: similar.similarity,
        similarity: similar.similarity,
      }));

      if (links.length > 0) {
        await this.prisma.memoryLink.createMany({
          data: links,
          skipDuplicates: true,
        });

        logger.info(`Created ${links.length} semantic links for memory ${memoryId}`);
      }
    } catch (error) {
      logger.error('Error creating semantic links:', error);
      throw error;
    }
  }

  async findSimilarMemories(embedding, excludeId = null) {
    try {
      // Get all memories with embeddings
      const memories = await this.prisma.memory.findMany({
        where: {
          embedding: { not: null },
          ...(excludeId && { id: { not: excludeId } }),
        },
        select: {
          id: true,
          content: true,
          embedding: true,
          type: true,
          importance: true,
        },
      });

      // Calculate similarities
      const similarities = memories.map(memory => ({
        ...memory,
        similarity: this.embeddingService.calculateSimilarity(embedding, JSON.parse(memory.embedding || '[]')),
      }));

      // Filter by threshold and sort by similarity
      return similarities
        .filter(memory => memory.similarity >= this.similarityThreshold)
        .sort((a, b) => b.similarity - a.similarity);
    } catch (error) {
      logger.error('Error finding similar memories:', error);
      throw error;
    }
  }

  async searchMemories(agentId, query, options = {}) {
    try {
      const {
        type = null,
        limit = 10,
        offset = 0,
        includeSimilar = true,
        minSimilarity = this.similarityThreshold,
      } = options;

      // Generate embedding for the query
      const queryEmbedding = await this.embeddingService.generateEmbedding(query);

      // Find similar memories using vector similarity
      const similarMemories = await this.findSimilarMemories(queryEmbedding);

      // Filter by agent and type if specified
      let filteredMemories = similarMemories.filter(memory => {
        if (memory.agentId !== agentId) return false;
        if (type && memory.type !== type) return false;
        if (memory.similarity < minSimilarity) return false;
        return true;
      });

      // Apply pagination
      const paginatedMemories = filteredMemories.slice(offset, offset + limit);

      // Update access count and last accessed
      if (paginatedMemories.length > 0) {
        await this.prisma.memory.updateMany({
          where: {
            id: { in: paginatedMemories.map(m => m.id) },
          },
          data: {
            accessCount: { increment: 1 },
            lastAccessed: new Date(),
          },
        });
      }

      return {
        memories: paginatedMemories,
        total: filteredMemories.length,
        query,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Error searching memories:', error);
      throw error;
    }
  }

  async getMemoryById(memoryId) {
    try {
      const memory = await this.prisma.memory.findUnique({
        where: { id: memoryId },
        include: {
          agent: true,
          session: true,
          sourceLinks: {
            include: {
              target: true,
            },
          },
          targetLinks: {
            include: {
              source: true,
            },
          },
          steps: {
            orderBy: { stepNumber: 'asc' },
          },
        },
      });

      if (memory) {
        // Update access count
        await this.prisma.memory.update({
          where: { id: memoryId },
          data: {
            accessCount: { increment: 1 },
            lastAccessed: new Date(),
          },
        });
      }

      return memory;
    } catch (error) {
      logger.error('Error getting memory by ID:', error);
      throw error;
    }
  }

  async updateMemory(memoryId, updateData) {
    try {
      const { content, type, importance, metadata } = updateData;

      // If content is being updated, regenerate embedding
      let embedding = null;
      if (content) {
        embedding = await this.embeddingService.generateEmbedding(content);
      }

      const memory = await this.prisma.memory.update({
        where: { id: memoryId },
        data: {
          ...(content && { content }),
          ...(type && { type }),
          ...(importance !== undefined && { importance }),
          ...(metadata && { metadata }),
          ...(embedding && { embedding: JSON.stringify(embedding) }),
          updatedAt: new Date(),
        },
        include: {
          agent: true,
          session: true,
        },
      });

      // If content was updated, recreate semantic links
      if (content && embedding) {
        // Remove existing semantic links
        await this.prisma.memoryLink.deleteMany({
          where: {
            OR: [
              { sourceId: memoryId, linkType: 'SEMANTIC' },
              { targetId: memoryId, linkType: 'SEMANTIC' },
            ],
          },
        });

        // Create new semantic links
        await this.createSemanticLinks(memoryId, embedding);
      }

      logger.info(`Updated memory ${memoryId}`);
      return memory;
    } catch (error) {
      logger.error('Error updating memory:', error);
      throw error;
    }
  }

  async deleteMemory(memoryId) {
    try {
      // Delete associated links first
      await this.prisma.memoryLink.deleteMany({
        where: {
          OR: [
            { sourceId: memoryId },
            { targetId: memoryId },
          ],
        },
      });

      // Delete procedural steps
      await this.prisma.proceduralStep.deleteMany({
        where: { memoryId },
      });

      // Delete the memory
      await this.prisma.memory.delete({
        where: { id: memoryId },
      });

      logger.info(`Deleted memory ${memoryId}`);
      return { success: true };
    } catch (error) {
      logger.error('Error deleting memory:', error);
      throw error;
    }
  }

  async decayMemories() {
    try {
      const decayedMemories = await this.prisma.memory.updateMany({
        where: {
          importance: { gt: 0 },
        },
        data: {
          importance: {
            decrement: this.decayRate,
          },
        },
      });

      // Archive memories with very low importance
      const archivedMemories = await this.prisma.memory.updateMany({
        where: {
          importance: { lte: 0.1 },
        },
        data: {
          type: 'ARCHIVED',
        },
      });

      logger.info(`Decayed ${decayedMemories.count} memories, archived ${archivedMemories.count} memories`);
      return { decayed: decayedMemories.count, archived: archivedMemories.count };
    } catch (error) {
      logger.error('Error decaying memories:', error);
      throw error;
    }
  }

  async getMemoryStats(agentId = null) {
    try {
      const whereClause = agentId ? { agentId } : {};

      const stats = await this.prisma.memory.groupBy({
        by: ['type'],
        where: whereClause,
        _count: {
          id: true,
        },
        _avg: {
          importance: true,
          accessCount: true,
        },
      });

      const totalMemories = await this.prisma.memory.count({
        where: whereClause,
      });

      const totalLinks = await this.prisma.memoryLink.count();

      return {
        totalMemories,
        totalLinks,
        byType: stats,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Error getting memory stats:', error);
      throw error;
    }
  }
}

module.exports = MemoryService;
