const { PrismaClient } = require('@prisma/client');
const embeddingService = require('./embeddingService');
const logger = require('../utils/logger');

class MemoryEvolutionService {
  constructor() {
    this.prisma = new PrismaClient();
    this.decayRate = parseFloat(process.env.MEMORY_DECAY_RATE) || 0.01;
    this.maxMemoryAge = parseInt(process.env.MAX_MEMORY_AGE_DAYS) || 365;
    this.similarityThreshold = parseFloat(process.env.SIMILARITY_THRESHOLD) || 0.7;
  }

  async decayMemories() {
    try {
      logger.info('Starting memory decay process...');

      // Calculate decay for all memories
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
          type: { not: 'ARCHIVED' },
        },
        data: {
          type: 'ARCHIVED',
        },
      });

      // Remove very old memories that haven't been accessed
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.maxMemoryAge);

      const deletedMemories = await this.prisma.memory.deleteMany({
        where: {
          AND: [
            { createdAt: { lt: cutoffDate } },
            { lastAccessed: { lt: cutoffDate } },
            { accessCount: { lte: 1 } },
            { importance: { lte: 0.05 } },
          ],
        },
      });

      logger.info(`Memory decay completed: ${decayedMemories.count} decayed, ${archivedMemories.count} archived, ${deletedMemories.count} deleted`);

      return {
        decayed: decayedMemories.count,
        archived: archivedMemories.count,
        deleted: deletedMemories.count,
      };
    } catch (error) {
      logger.error('Error in memory decay process:', error);
      throw error;
    }
  }

  async consolidateSimilarMemories(agentId = null) {
    try {
      logger.info('Starting memory consolidation process...');

      const whereClause = {
        type: { not: 'ARCHIVED' },
        embedding: { not: null },
        ...(agentId && { agentId }),
      };

      // Get all memories with embeddings
      const memories = await this.prisma.memory.findMany({
        where: whereClause,
        select: {
          id: true,
          content: true,
          type: true,
          importance: true,
          embedding: true,
          createdAt: true,
          accessCount: true,
        },
        orderBy: { importance: 'desc' },
      });

      const consolidated = [];
      const processed = new Set();

      for (let i = 0; i < memories.length; i++) {
        if (processed.has(memories[i].id)) continue;

        const memory = memories[i];
        const similarMemories = [];

        // Find similar memories
        for (let j = i + 1; j < memories.length; j++) {
          if (processed.has(memories[j].id)) continue;

          const similarity = embeddingService.calculateSimilarity(
            memory.embedding,
            memories[j].embedding
          );

          if (similarity >= this.similarityThreshold) {
            similarMemories.push({
              ...memories[j],
              similarity,
            });
          }
        }

        if (similarMemories.length > 0) {
          // Consolidate similar memories
          const consolidatedMemory = await this.consolidateMemoryGroup([
            memory,
            ...similarMemories,
          ]);

          consolidated.push(consolidatedMemory);

          // Mark all memories in the group as processed
          processed.add(memory.id);
          similarMemories.forEach(m => processed.add(m.id));
        } else {
          processed.add(memory.id);
        }
      }

      logger.info(`Memory consolidation completed: ${consolidated.length} groups consolidated`);

      return {
        consolidated: consolidated.length,
        totalProcessed: processed.size,
      };
    } catch (error) {
      logger.error('Error in memory consolidation process:', error);
      throw error;
    }
  }

  async consolidateMemoryGroup(memories) {
    try {
      // Sort by importance and access count
      const sortedMemories = memories.sort((a, b) => {
        const scoreA = a.importance * Math.log(a.accessCount + 1);
        const scoreB = b.importance * Math.log(b.accessCount + 1);
        return scoreB - scoreA;
      });

      const primaryMemory = sortedMemories[0];
      const secondaryMemories = sortedMemories.slice(1);

      // Combine content
      const combinedContent = this.combineMemoryContent(sortedMemories);

      // Calculate new importance (weighted average)
      const totalWeight = sortedMemories.reduce((sum, m) => sum + m.importance, 0);
      const newImportance = Math.min(1, totalWeight / sortedMemories.length);

      // Calculate new access count
      const newAccessCount = sortedMemories.reduce((sum, m) => sum + m.accessCount, 0);

      // Update primary memory
      const updatedMemory = await this.prisma.memory.update({
        where: { id: primaryMemory.id },
        data: {
          content: combinedContent,
          importance: newImportance,
          accessCount: newAccessCount,
          metadata: {
            ...primaryMemory.metadata,
            consolidated: true,
            originalCount: sortedMemories.length,
            consolidatedAt: new Date(),
          },
        },
      });

      // Create links to secondary memories
      const links = secondaryMemories.map(memory => ({
        sourceId: primaryMemory.id,
        targetId: memory.id,
        linkType: 'HIERARCHICAL',
        strength: 1.0,
        similarity: memory.similarity,
      }));

      if (links.length > 0) {
        await this.prisma.memoryLink.createMany({
          data: links,
          skipDuplicates: true,
        });
      }

      // Archive secondary memories
      await this.prisma.memory.updateMany({
        where: {
          id: { in: secondaryMemories.map(m => m.id) },
        },
        data: {
          type: 'ARCHIVED',
          metadata: {
            consolidatedInto: primaryMemory.id,
            consolidatedAt: new Date(),
          },
        },
      });

      return updatedMemory;
    } catch (error) {
      logger.error('Error consolidating memory group:', error);
      throw error;
    }
  }

  combineMemoryContent(memories) {
    // Simple content combination - in a real implementation, you'd use more sophisticated NLP
    const contents = memories.map(m => m.content);
    
    // Remove duplicates and combine
    const uniqueContents = [...new Set(contents)];
    
    // If all contents are similar, return the most important one
    if (uniqueContents.length === 1) {
      return uniqueContents[0];
    }

    // Otherwise, combine with separators
    return uniqueContents.join('\n\n---\n\n');
  }

  async transferKnowledge(sourceAgentId, targetAgentId, memoryTypes = ['SEMANTIC', 'PROCEDURAL']) {
    try {
      logger.info(`Starting knowledge transfer from agent ${sourceAgentId} to agent ${targetAgentId}`);

      // Get memories from source agent
      const sourceMemories = await this.prisma.memory.findMany({
        where: {
          agentId: sourceAgentId,
          type: { in: memoryTypes },
          importance: { gte: 0.5 }, // Only transfer important memories
        },
        select: {
          id: true,
          content: true,
          type: true,
          importance: true,
          metadata: true,
        },
      });

      let transferred = 0;

      for (const memory of sourceMemories) {
        // Check if similar memory already exists in target agent
        const existingMemories = await this.prisma.memory.findMany({
          where: {
            agentId: targetAgentId,
            type: memory.type,
          },
          select: {
            id: true,
            content: true,
            embedding: true,
          },
        });

        // Generate embedding for source memory
        const sourceEmbedding = await embeddingService.generateEmbedding(memory.content);

        // Check for similar memories
        let isSimilar = false;
        for (const existing of existingMemories) {
          if (existing.embedding) {
            const similarity = embeddingService.calculateSimilarity(
              sourceEmbedding,
              existing.embedding
            );
            if (similarity >= this.similarityThreshold) {
              isSimilar = true;
              break;
            }
          }
        }

        // If no similar memory exists, transfer it
        if (!isSimilar) {
          await this.prisma.memory.create({
            data: {
              agentId: targetAgentId,
              content: memory.content,
              type: memory.type,
              importance: memory.importance * 0.8, // Reduce importance for transferred memory
              embedding: sourceEmbedding,
              metadata: {
                ...memory.metadata,
                transferred: true,
                sourceAgentId,
                originalMemoryId: memory.id,
                transferredAt: new Date(),
              },
            },
          });

          transferred++;
        }
      }

      logger.info(`Knowledge transfer completed: ${transferred} memories transferred`);

      return {
        transferred,
        totalSourceMemories: sourceMemories.length,
      };
    } catch (error) {
      logger.error('Error in knowledge transfer process:', error);
      throw error;
    }
  }

  async updateMemoryLinks() {
    try {
      logger.info('Starting memory link update process...');

      // Get all memories with embeddings
      const memories = await this.prisma.memory.findMany({
        where: {
          embedding: { not: null },
          type: { not: 'ARCHIVED' },
        },
        select: {
          id: true,
          embedding: true,
        },
      });

      let linksCreated = 0;
      let linksUpdated = 0;

      for (let i = 0; i < memories.length; i++) {
        const memory = memories[i];
        
        // Find similar memories
        const similarMemories = await this.findSimilarMemories(memory.embedding, memory.id);

        for (const similar of similarMemories) {
          // Check if link already exists
          const existingLink = await this.prisma.memoryLink.findFirst({
            where: {
              OR: [
                { sourceId: memory.id, targetId: similar.id },
                { sourceId: similar.id, targetId: memory.id },
              ],
              linkType: 'SEMANTIC',
            },
          });

          if (existingLink) {
            // Update existing link
            await this.prisma.memoryLink.update({
              where: { id: existingLink.id },
              data: {
                strength: similar.similarity,
                similarity: similar.similarity,
                updatedAt: new Date(),
              },
            });
            linksUpdated++;
          } else {
            // Create new link
            await this.prisma.memoryLink.create({
              data: {
                sourceId: memory.id,
                targetId: similar.id,
                linkType: 'SEMANTIC',
                strength: similar.similarity,
                similarity: similar.similarity,
              },
            });
            linksCreated++;
          }
        }
      }

      logger.info(`Memory link update completed: ${linksCreated} created, ${linksUpdated} updated`);

      return {
        linksCreated,
        linksUpdated,
      };
    } catch (error) {
      logger.error('Error updating memory links:', error);
      throw error;
    }
  }

  async findSimilarMemories(embedding, excludeId) {
    try {
      const memories = await this.prisma.memory.findMany({
        where: {
          embedding: { not: null },
          id: { not: excludeId },
          type: { not: 'ARCHIVED' },
        },
        select: {
          id: true,
          embedding: true,
        },
      });

      const similarities = memories.map(memory => ({
        ...memory,
        similarity: embeddingService.calculateSimilarity(embedding, memory.embedding),
      }));

      return similarities
        .filter(memory => memory.similarity >= this.similarityThreshold)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 10); // Limit to top 10 similar memories
    } catch (error) {
      logger.error('Error finding similar memories:', error);
      throw error;
    }
  }

  async runEvolutionCycle() {
    try {
      logger.info('Starting memory evolution cycle...');

      const results = {
        decay: await this.decayMemories(),
        consolidation: await this.consolidateSimilarMemories(),
        linkUpdate: await this.updateMemoryLinks(),
      };

      logger.info('Memory evolution cycle completed:', results);

      return results;
    } catch (error) {
      logger.error('Error in memory evolution cycle:', error);
      throw error;
    }
  }
}

module.exports = new MemoryEvolutionService();
