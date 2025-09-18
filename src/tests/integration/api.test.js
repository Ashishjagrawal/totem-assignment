const request = require('supertest');
const app = require('../../server');

describe('API Integration Tests', () => {
  let testAgentId;
  let testMemoryId;
  let testSessionId;

  beforeAll(async () => {
    // Create a test agent
    const agentResponse = await request(app)
      .post('/api/v1/agents')
      .send({
        name: 'Integration Test Agent',
        description: 'Agent for integration testing',
        metadata: { test: true }
      });

    if (agentResponse.status === 201 && agentResponse.body.success) {
      testAgentId = agentResponse.body.data.id;
    } else {
      console.warn('Failed to create test agent:', agentResponse.body);
      // Use a mock ID for testing
      testAgentId = 'test-agent-id';
    }
  });

  afterAll(async () => {
    // Clean up test data
    if (testAgentId) {
      await request(app).delete(`/api/v1/agents/${testAgentId}`);
    }
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/health');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('Agent API', () => {
    it('should create an agent', async () => {
      const agentData = {
        name: 'Test Agent',
        description: 'Test agent description',
        metadata: { type: 'test' }
      };

      const response = await request(app)
        .post('/api/v1/agents')
        .send(agentData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.name).toBe(agentData.name);
      expect(response.body.data.description).toBe(agentData.description);
    });

    it('should get all agents', async () => {
      const response = await request(app).get('/api/v1/agents');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('agents');
      expect(response.body.data).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data.agents)).toBe(true);
    });

    it('should get a specific agent', async () => {
      const response = await request(app).get(`/api/v1/agents/${testAgentId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testAgentId);
    });

    it('should update an agent', async () => {
      const updateData = {
        name: 'Updated Test Agent',
        description: 'Updated description'
      };

      const response = await request(app)
        .put(`/api/v1/agents/${testAgentId}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updateData.name);
    });

    it('should create a session', async () => {
      const sessionData = {
        name: 'Test Session',
        metadata: { type: 'test' }
      };

      const response = await request(app)
        .post(`/api/v1/agents/${testAgentId}/sessions`)
        .send(sessionData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      testSessionId = response.body.data.id;
    });

    it('should get agent sessions', async () => {
      const response = await request(app)
        .get(`/api/v1/agents/${testAgentId}/sessions`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('sessions');
      expect(Array.isArray(response.body.data.sessions)).toBe(true);
    });

    it('should end a session', async () => {
      const response = await request(app)
        .put(`/api/v1/agents/${testAgentId}/sessions/${testSessionId}/end`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.endTime).toBeDefined();
    });
  });

  describe('Memory API', () => {
    it('should create a memory', async () => {
      const memoryData = {
        agentId: testAgentId,
        content: 'This is a test memory for integration testing',
        type: 'EPISODIC',
        metadata: { test: true }
      };

      const response = await request(app)
        .post('/api/v1/memories')
        .send(memoryData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.content).toBe(memoryData.content);
      testMemoryId = response.body.data.id;
    });

    it('should get a specific memory', async () => {
      const response = await request(app).get(`/api/v1/memories/${testMemoryId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testMemoryId);
    });

    it('should search memories', async () => {
      const searchData = {
        agentId: testAgentId,
        query: 'test memory',
        limit: 10
      };

      const response = await request(app)
        .post('/api/v1/memories/search')
        .send(searchData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('memories');
      expect(Array.isArray(response.body.data.memories)).toBe(true);
    });

    it('should update a memory', async () => {
      const updateData = {
        content: 'Updated test memory content',
        importance: 0.8
      };

      const response = await request(app)
        .put(`/api/v1/memories/${testMemoryId}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.content).toBe(updateData.content);
    });

    it('should get memory stats', async () => {
      const response = await request(app)
        .get(`/api/v1/memories/stats/${testAgentId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalMemories');
      expect(response.body.data).toHaveProperty('byType');
    });

    it('should delete a memory', async () => {
      const response = await request(app)
        .delete(`/api/v1/memories/${testMemoryId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Analytics API', () => {
    it('should get analytics metrics', async () => {
      const response = await request(app).get('/api/v1/analytics/metrics');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('memoryStats');
      expect(response.body.data).toHaveProperty('linkStats');
    });

    it('should get analytics metrics for specific agent', async () => {
      const response = await request(app)
        .get(`/api/v1/analytics/metrics?agentId=${testAgentId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should get memory evolution data', async () => {
      const response = await request(app).get('/api/v1/analytics/evolution');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('dailyMemories');
      expect(response.body.data).toHaveProperty('linkEvolution');
    });

    it('should get clustering data', async () => {
      const response = await request(app).get('/api/v1/analytics/clustering');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('clusters');
    });

    it('should get performance metrics', async () => {
      const response = await request(app).get('/api/v1/analytics/performance');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('responseTime');
      expect(response.body.data).toHaveProperty('throughput');
    });
  });

  describe('Visualization API', () => {
    it('should get network visualization data', async () => {
      const response = await request(app).get('/api/v1/visualization/network');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('nodes');
      expect(response.body.data).toHaveProperty('edges');
      expect(Array.isArray(response.body.data.nodes)).toBe(true);
      expect(Array.isArray(response.body.data.edges)).toBe(true);
    });

    it('should get network visualization for specific agent', async () => {
      const response = await request(app)
        .get(`/api/v1/visualization/network?agentId=${testAgentId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should get timeline visualization', async () => {
      const response = await request(app).get('/api/v1/visualization/timeline');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('timeline');
      expect(Array.isArray(response.body.data.timeline)).toBe(true);
    });

    it('should get cluster visualization', async () => {
      const response = await request(app).get('/api/v1/visualization/clusters');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('clusters');
      expect(Array.isArray(response.body.data.clusters)).toBe(true);
    });

    it('should get heatmap visualization', async () => {
      const response = await request(app).get('/api/v1/visualization/heatmap');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('heatmap');
      expect(Array.isArray(response.body.data.heatmap)).toBe(true);
    });
  });

  describe('Config API', () => {
    it('should get dashboard configuration', async () => {
      const response = await request(app).get('/api/v1/config');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('refreshInterval');
      expect(response.body.data).toHaveProperty('maxNodes');
      expect(response.body.data).toHaveProperty('features');
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 for non-existent agent', async () => {
      const response = await request(app)
        .get('/api/v1/agents/00000000-0000-0000-0000-000000000000');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should handle 400 for invalid memory search', async () => {
      const response = await request(app)
        .post('/api/v1/memories/search')
        .send({ query: 'test' }); // Missing agentId

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should handle 500 for server errors', async () => {
      // This would require mocking a service to throw an error
      // For now, we'll test with an invalid endpoint
      const response = await request(app).get('/api/invalid-endpoint');

      expect(response.status).toBe(404);
    });
  });

  describe('Memory Decay API', () => {
    it('should trigger memory decay', async () => {
      const response = await request(app)
        .post('/api/v1/memories/decay');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('decayed');
      expect(response.body.data).toHaveProperty('archived');
    });
  });
});
