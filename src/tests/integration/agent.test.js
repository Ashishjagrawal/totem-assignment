const request = require('supertest');
const app = require('../../server');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

describe('Agent API Integration Tests', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /api/v1/agents', () => {
    it('should create a new agent', async () => {
      const agentData = {
        name: 'Test Agent',
        description: 'A test agent for integration testing',
      };

      const response = await request(app)
        .post('/api/v1/agents')
        .send(agentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.name).toBe(agentData.name);
      expect(response.body.data.description).toBe(agentData.description);
    });

    it('should return 400 for invalid data', async () => {
      const invalidData = {
        name: '', // Empty name should fail validation
      };

      const response = await request(app)
        .post('/api/v1/agents')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation error');
    });
  });

  describe('GET /api/v1/agents', () => {
    it('should list all agents with pagination', async () => {
      const response = await request(app)
        .get('/api/v1/agents?page=1&limit=10')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('agents');
      expect(response.body.data).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data.agents)).toBe(true);
    });

    it('should search agents by name', async () => {
      const response = await request(app)
        .get('/api/v1/agents?search=Test')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.agents).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: expect.stringContaining('Test'),
          }),
        ])
      );
    });
  });

  describe('GET /api/v1/agents/:id', () => {
    let testAgent;

    beforeAll(async () => {
      testAgent = await prisma.agent.create({
        data: {
          name: 'Test Agent for Retrieval',
          description: 'Agent for testing retrieval',
        },
      });
    });

    it('should retrieve an agent by ID', async () => {
      const response = await request(app)
        .get(`/api/v1/agents/${testAgent.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testAgent.id);
      expect(response.body.data.name).toBe(testAgent.name);
    });

    it('should return 404 for non-existent agent', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .get(`/api/v1/agents/${fakeId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Agent not found');
    });
  });

  describe('PUT /api/v1/agents/:id', () => {
    let testAgent;

    beforeEach(async () => {
      testAgent = await prisma.agent.create({
        data: {
          name: 'Agent to Update',
          description: 'Original description',
        },
      });
    });

    it('should update an agent', async () => {
      const updateData = {
        name: 'Updated Agent Name',
        description: 'Updated description',
      };

      const response = await request(app)
        .put(`/api/v1/agents/${testAgent.id}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.description).toBe(updateData.description);
    });
  });

  describe('DELETE /api/v1/agents/:id', () => {
    let testAgent;

    beforeEach(async () => {
      testAgent = await prisma.agent.create({
        data: {
          name: 'Agent to Delete',
          description: 'This agent will be deleted',
        },
      });
    });

    it('should delete an agent', async () => {
      const response = await request(app)
        .delete(`/api/v1/agents/${testAgent.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Agent deleted successfully');

      // Verify agent is deleted
      const deletedAgent = await prisma.agent.findUnique({
        where: { id: testAgent.id },
      });
      expect(deletedAgent).toBeNull();
    });
  });

  describe('POST /api/v1/agents/:id/sessions', () => {
    let testAgent;

    beforeAll(async () => {
      testAgent = await prisma.agent.create({
        data: {
          name: 'Agent for Sessions',
          description: 'Agent for testing sessions',
        },
      });
    });

    it('should create a new session', async () => {
      const sessionData = {
        name: 'Test Session',
        metadata: { environment: 'test' },
      };

      const response = await request(app)
        .post(`/api/v1/agents/${testAgent.id}/sessions`)
        .send(sessionData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.agentId).toBe(testAgent.id);
      expect(response.body.data.name).toBe(sessionData.name);
    });
  });

  describe('GET /api/v1/agents/:id/sessions', () => {
    let testAgent;

    beforeAll(async () => {
      testAgent = await prisma.agent.create({
        data: {
          name: 'Agent for Session List',
          description: 'Agent for testing session listing',
        },
      });

      // Create some test sessions
      await prisma.session.createMany({
        data: [
          {
            agentId: testAgent.id,
            name: 'Session 1',
          },
          {
            agentId: testAgent.id,
            name: 'Session 2',
          },
        ],
      });
    });

    it('should list agent sessions with pagination', async () => {
      const response = await request(app)
        .get(`/api/v1/agents/${testAgent.id}/sessions?page=1&limit=10`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('sessions');
      expect(response.body.data).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data.sessions)).toBe(true);
    });
  });

  describe('PUT /api/v1/agents/:id/sessions/:sessionId/end', () => {
    let testAgent;
    let testSession;

    beforeAll(async () => {
      testAgent = await prisma.agent.create({
        data: {
          name: 'Agent for Session End',
          description: 'Agent for testing session ending',
        },
      });

      testSession = await prisma.session.create({
        data: {
          agentId: testAgent.id,
          name: 'Session to End',
        },
      });
    });

    it('should end a session', async () => {
      const response = await request(app)
        .put(`/api/v1/agents/${testAgent.id}/sessions/${testSession.id}/end`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.endTime).not.toBeNull();
    });
  });
});
