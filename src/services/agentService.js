const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

class AgentService {
  constructor() {
    this.prisma = new PrismaClient();
  }

  async createAgent(agentData) {
    try {
      const { name, type = 'AI_AGENT', description = '', metadata = {} } = agentData;

      const agent = await this.prisma.agent.create({
        data: {
          name,
          type,
          description,
          metadata,
        },
      });

      logger.info(`Created agent ${agent.id}: ${agent.name}`);
      return agent;
    } catch (error) {
      logger.error('Error creating agent:', error);
      throw error;
    }
  }

  async getAgent(agentId) {
    try {
      const agent = await this.prisma.agent.findUnique({
        where: { id: agentId },
        include: {
          memories: {
            orderBy: { startTime: 'desc' },
            take: 10,
          },
          sessions: {
            orderBy: { startTime: 'desc' },
            take: 5,
          },
        },
      });

      if (!agent) {
        throw new Error('Agent not found');
      }

      return agent;
    } catch (error) {
      logger.error('Error getting agent:', error);
      throw error;
    }
  }

  async updateAgent(agentId, updateData) {
    try {
      const { name, description, metadata } = updateData;

      const agent = await this.prisma.agent.update({
        where: { id: agentId },
        data: {
          ...(name && { name }),
          ...(description && { description }),
          ...(metadata && { metadata }),
        },
      });

      logger.info(`Updated agent ${agent.id}`);
      return agent;
    } catch (error) {
      logger.error('Error updating agent:', error);
      throw error;
    }
  }

  async deleteAgent(agentId) {
    try {
      await this.prisma.agent.delete({
        where: { id: agentId },
      });

      logger.info(`Deleted agent ${agentId}`);
      return { success: true };
    } catch (error) {
      logger.error('Error deleting agent:', error);
      throw error;
    }
  }

  async listAgents(page = 1, limit = 10) {
    try {
      const skip = (page - 1) * limit;

      const [agents, total] = await Promise.all([
        this.prisma.agent.findMany({
          skip,
          take: limit,
          orderBy: { startTime: 'desc' },
          include: {
            _count: {
              select: {
                memories: true,
                sessions: true,
              },
            },
          },
        }),
        this.prisma.agent.count(),
      ]);

      return {
        agents,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error listing agents:', error);
      throw error;
    }
  }

  async createSession(agentId, sessionData) {
    try {
      const { name, description = '', metadata = {} } = sessionData;

      const session = await this.prisma.session.create({
        data: {
          agentId,
          name,
          description,
          metadata,
        },
      });

      logger.info(`Created session ${session.id} for agent ${agentId}`);
      return session;
    } catch (error) {
      logger.error('Error creating session:', error);
      throw error;
    }
  }

  async endSession(sessionId) {
    try {
      const session = await this.prisma.session.update({
        where: { id: sessionId },
        data: {
          endTime: new Date(),
        },
      });

      logger.info(`Ended session ${sessionId}`);
      return session;
    } catch (error) {
      logger.error('Error ending session:', error);
      throw error;
    }
  }

  async getAgentSessions(agentId, page = 1, limit = 10) {
    try {
      const skip = (page - 1) * limit;

      const [sessions, total] = await Promise.all([
        this.prisma.session.findMany({
          where: { agentId },
          skip,
          take: limit,
          orderBy: { startTime: 'desc' },
          include: {
            _count: {
              select: {
                memories: true,
              },
            },
          },
        }),
        this.prisma.session.count({
          where: { agentId },
        }),
      ]);

      return {
        sessions,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error getting agent sessions:', error);
      throw error;
    }
  }
}

module.exports = AgentService;
