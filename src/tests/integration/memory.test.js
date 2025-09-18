const request = require('supertest');
const app = require('../../server');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

describe('Memory API Integration Tests', () => {
  let testAgent;
  let testSession;

  beforeAll(async () => {
    // Create test agent
    testAgent = await prisma.agent.create({
      data: {
        name: 'Test Agent',
        description: 'Test agent for integration tests',
      },
    });

    // Create test session
    testSession = await prisma.session.create({
      data: {
        agentId: testAgent.id,
        name: 'Test Session',
      },
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.memoryLink.deleteMany();
    await prisma.proceduralStep.deleteMany();
    await prisma.memory.deleteMany();
    await prisma.session.deleteMany();
    await prisma.agent.deleteMany();
    await prisma.$disconnect();
  });

  describe('POST /api/v1/memories', () => {
    it('should create a new memory', async () => {
      const memoryData = {
        agentId: testAgent.id,
        content: 'This is a test memory about learning Node.js',
        type: 'EPISODIC',
        sessionId: testSession.id,
        metadata: { source: 'test' },
      };

      const response = await request(app)
        .post('/api/v1/memories')
        .send(memoryData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.content).toBe(memoryData.content);
      expect(response.body.data.agentId).toBe(testAgent.id);
      expect(response.body.data.type).toBe(memoryData.type);
    });

    it('should return 400 for invalid data', async () => {
      const invalidData = {
        agentId: 'invalid-uuid',
        content: '',
      };

      const response = await request(app)
        .post('/api/v1/memories')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation error');
    });
  });

  describe('GET /api/v1/memories/:id', () => {
    let testMemory;

    beforeAll(async () => {
      testMemory = await prisma.memory.create({
        data: {
          agentId: testAgent.id,
          content: 'Test memory for retrieval',
          type: 'EPISODIC',
          importance: 0.8,
        },
      });
    });

    it('should retrieve a memory by ID', async () => {
      const response = await request(app)
        .get(`/api/v1/memories/${testMemory.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testMemory.id);
      expect(response.body.data.content).toBe(testMemory.content);
    });

    it('should return 404 for non-existent memory', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .get(`/api/v1/memories/${fakeId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Memory not found');
    });
  });

  describe('PUT /api/v1/memories/:id', () => {
    let testMemory;

    beforeAll(async () => {
      testMemory = await prisma.memory.create({
        data: {
          agentId: testAgent.id,
          content: 'Original test memory content',
          type: 'EPISODIC',
          importance: 0.5,
        },
      });
    });

    it('should update a memory', async () => {
      const updateData = {
        content: 'Updated test memory content',
        importance: 0.9,
      };

      const response = await request(app)
        .put(`/api/v1/memories/${testMemory.id}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.content).toBe(updateData.content);
      expect(response.body.data.importance).toBe(updateData.importance);
    });
  });

  describe('DELETE /api/v1/memories/:id', () => {
    let testMemory;

    beforeEach(async () => {
      testMemory = await prisma.memory.create({
        data: {
          agentId: testAgent.id,
          content: 'Memory to be deleted',
          type: 'EPISODIC',
        },
      });
    });

    it('should delete a memory', async () => {
      const response = await request(app)
        .delete(`/api/v1/memories/${testMemory.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Memory deleted successfully');

      // Verify memory is deleted
      const deletedMemory = await prisma.memory.findUnique({
        where: { id: testMemory.id },
      });
      expect(deletedMemory).toBeNull();
    });
  });

  describe('POST /api/v1/memories/search', () => {
    beforeAll(async () => {
      // Create test memories for search
      await prisma.memory.createMany({
        data: [
          {
            agentId: testAgent.id,
            content: 'Learning about machine learning algorithms',
            type: 'SEMANTIC',
            importance: 0.8,
          },
          {
            agentId: testAgent.id,
            content: 'Understanding neural networks and deep learning',
            type: 'SEMANTIC',
            importance: 0.9,
          },
          {
            agentId: testAgent.id,
            content: 'Cooking pasta for dinner',
            type: 'EPISODIC',
            importance: 0.3,
          },
        ],
      });
    });

    it('should search memories by content', async () => {
      const searchData = {
        agentId: testAgent.id,
        query: 'machine learning',
        limit: 5,
      };

      const response = await request(app)
        .post('/api/v1/memories/search')
        .send(searchData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('memories');
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data.query).toBe(searchData.query);
    });

    it('should return 400 for missing agent ID', async () => {
      const searchData = {
        query: 'test query',
      };

      const response = await request(app)
        .post('/api/v1/memories/search')
        .send(searchData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Agent ID is required for memory search');
    });
  });

  describe('GET /api/v1/memories/stats/:agentId', () => {
    it('should get memory statistics', async () => {
      const response = await request(app)
        .get(`/api/v1/memories/stats/${testAgent.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalMemories');
      expect(response.body.data).toHaveProperty('totalLinks');
      expect(response.body.data).toHaveProperty('byType');
    });
  });
});
