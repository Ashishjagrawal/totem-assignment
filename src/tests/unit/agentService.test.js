const AgentService = require('../../services/agentService');

// Mock Prisma
const mockPrisma = {
  agent: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  session: {
    create: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => mockPrisma),
}));

describe('AgentService', () => {
  let agentService;

  beforeEach(() => {
    agentService = new AgentService();
    agentService.prisma = mockPrisma;
    jest.clearAllMocks();
  });

  describe('createAgent', () => {
    it('should create a new agent', async () => {
      const agentData = {
        name: 'Test Agent',
        description: 'Test agent description',
        metadata: { type: 'test' }
      };
      const mockAgent = {
        id: 'agent-123',
        ...agentData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.agent.create.mockResolvedValue(mockAgent);

      const result = await agentService.createAgent(agentData);

      expect(mockPrisma.agent.create).toHaveBeenCalledWith({
        data: {
          ...agentData,
          type: 'AI_AGENT',
        },
      });
      expect(result).toEqual(mockAgent);
    });

    it('should handle creation errors', async () => {
      const agentData = {
        name: 'Test Agent',
      };
      const error = new Error('Creation failed');

      mockPrisma.agent.create.mockRejectedValue(error);

      await expect(agentService.createAgent(agentData))
        .rejects.toThrow('Creation failed');
    });
  });

  describe('getAgent', () => {
    it('should retrieve an agent by ID', async () => {
      const agentId = 'agent-123';
      const mockAgent = {
        id: agentId,
        name: 'Test Agent',
        memories: [],
        sessions: [],
      };

      mockPrisma.agent.findUnique.mockResolvedValue(mockAgent);

      const result = await agentService.getAgent(agentId);

      expect(mockPrisma.agent.findUnique).toHaveBeenCalledWith({
        where: { id: agentId },
        include: {
          memories: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
          sessions: {
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
        },
      });
      expect(result).toEqual(mockAgent);
    });

    it('should throw error for non-existent agent', async () => {
      const agentId = 'non-existent-id';

      mockPrisma.agent.findUnique.mockResolvedValue(null);

      await expect(agentService.getAgent(agentId))
        .rejects.toThrow('Agent not found');
    });
  });

  describe('listAgents', () => {
    it('should retrieve agents with pagination', async () => {
      const mockAgents = [
        { id: 'agent-1', name: 'Agent 1' },
        { id: 'agent-2', name: 'Agent 2' }
      ];

      mockPrisma.agent.findMany.mockResolvedValue(mockAgents);
      mockPrisma.agent.count.mockResolvedValue(2);

      const result = await agentService.listAgents(1, 10);

      expect(mockPrisma.agent.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              memories: true,
              sessions: true,
            },
          },
        },
      });
      expect(result.agents).toEqual(mockAgents);
      expect(result.pagination.total).toBe(2);
    });
  });

  describe('updateAgent', () => {
    it('should update an agent', async () => {
      const agentId = 'agent-123';
      const updateData = {
        name: 'Updated Agent',
        description: 'Updated description',
      };
      const mockUpdatedAgent = {
        id: agentId,
        ...updateData,
        updatedAt: new Date(),
      };

      mockPrisma.agent.update.mockResolvedValue(mockUpdatedAgent);

      const result = await agentService.updateAgent(agentId, updateData);

      expect(mockPrisma.agent.update).toHaveBeenCalledWith({
        where: { id: agentId },
        data: updateData,
      });
      expect(result).toEqual(mockUpdatedAgent);
    });
  });

  describe('deleteAgent', () => {
    it('should delete an agent', async () => {
      const agentId = 'agent-123';

      mockPrisma.agent.delete.mockResolvedValue({});

      const result = await agentService.deleteAgent(agentId);

      expect(mockPrisma.agent.delete).toHaveBeenCalledWith({
        where: { id: agentId },
      });
      expect(result).toEqual({ success: true });
    });
  });
});