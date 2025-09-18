const request = require('supertest');
const app = require('../../server');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

describe('Visualization API Integration Tests', () => {
  let testAgent;
  let testMemories = [];

  beforeAll(async () => {
    // Create test agent
    testAgent = await prisma.agent.create({
      data: {
        name: 'Visualization Test Agent',
        description: 'Agent for testing visualization',
      },
    });

    // Create test memories with different types and timestamps
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    testMemories = await Promise.all([
      prisma.memory.create({
        data: {
          agentId: testAgent.id,
          content: 'Memory about machine learning concepts',
          type: 'SEMANTIC',
          importance: 0.9,
          accessCount: 10,
          createdAt: now,
        },
      }),
      prisma.memory.create({
        data: {
          agentId: testAgent.id,
          content: 'Memory about neural networks and deep learning',
          type: 'SEMANTIC',
          importance: 0.8,
          accessCount: 7,
          createdAt: yesterday,
        },
      }),
      prisma.memory.create({
        data: {
          agentId: testAgent.id,
          content: 'Step-by-step process for training a model',
          type: 'PROCEDURAL',
          importance: 0.7,
          accessCount: 5,
          createdAt: lastWeek,
        },
      }),
      prisma.memory.create({
        data: {
          agentId: testAgent.id,
          content: 'Personal experience with debugging code',
          type: 'EPISODIC',
          importance: 0.6,
          accessCount: 3,
          createdAt: yesterday,
        },
      }),
    ]);

    // Create memory links
    await prisma.memoryLink.createMany({
      data: [
        {
          sourceId: testMemories[0].id,
          targetId: testMemories[1].id,
          linkType: 'SEMANTIC',
          strength: 0.8,
          similarity: 0.8,
        },
        {
          sourceId: testMemories[1].id,
          targetId: testMemories[2].id,
          linkType: 'TEMPORAL',
          strength: 0.6,
          similarity: 0.6,
        },
      ],
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.memoryLink.deleteMany();
    await prisma.memory.deleteMany();
    await prisma.agent.deleteMany();
    await prisma.$disconnect();
  });

  describe('GET /api/v1/visualization/network', () => {
    it('should get memory network data', async () => {
      const response = await request(app)
        .get('/api/v1/visualization/network')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('nodes');
      expect(response.body.data).toHaveProperty('edges');
      expect(response.body.data).toHaveProperty('stats');
      expect(Array.isArray(response.body.data.nodes)).toBe(true);
      expect(Array.isArray(response.body.data.edges)).toBe(true);
    });

    it('should get network data for specific agent', async () => {
      const response = await request(app)
        .get(`/api/v1/visualization/network?agentId=${testAgent.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('nodes');
      expect(response.body.data).toHaveProperty('edges');
    });

    it('should respect maxNodes parameter', async () => {
      const response = await request(app)
        .get('/api/v1/visualization/network?maxNodes=2')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.nodes.length).toBeLessThanOrEqual(2);
    });

    it('should respect minSimilarity parameter', async () => {
      const response = await request(app)
        .get('/api/v1/visualization/network?minSimilarity=0.9')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('nodes');
      expect(response.body.data).toHaveProperty('edges');
    });

    it('should include proper node structure', async () => {
      const response = await request(app)
        .get('/api/v1/visualization/network')
        .expect(200);

      expect(response.body.success).toBe(true);
      
      if (response.body.data.nodes.length > 0) {
        const node = response.body.data.nodes[0];
        expect(node).toHaveProperty('id');
        expect(node).toHaveProperty('label');
        expect(node).toHaveProperty('type');
        expect(node).toHaveProperty('importance');
        expect(node).toHaveProperty('size');
        expect(node).toHaveProperty('color');
      }
    });

    it('should include proper edge structure', async () => {
      const response = await request(app)
        .get('/api/v1/visualization/network')
        .expect(200);

      expect(response.body.success).toBe(true);
      
      if (response.body.data.edges.length > 0) {
        const edge = response.body.data.edges[0];
        expect(edge).toHaveProperty('id');
        expect(edge).toHaveProperty('source');
        expect(edge).toHaveProperty('target');
        expect(edge).toHaveProperty('type');
        expect(edge).toHaveProperty('strength');
        expect(edge).toHaveProperty('width');
        expect(edge).toHaveProperty('color');
      }
    });
  });

  describe('GET /api/v1/visualization/timeline', () => {
    it('should get memory timeline data', async () => {
      const response = await request(app)
        .get('/api/v1/visualization/timeline')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('timeline');
      expect(response.body.data).toHaveProperty('period');
      expect(response.body.data).toHaveProperty('totalMemories');
      expect(Array.isArray(response.body.data.timeline)).toBe(true);
    });

    it('should get timeline data for specific agent', async () => {
      const response = await request(app)
        .get(`/api/v1/visualization/timeline?agentId=${testAgent.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('timeline');
    });

    it('should get timeline data for different periods', async () => {
      const periods = [7, 30, 90];
      
      for (const days of periods) {
        const response = await request(app)
          .get(`/api/v1/visualization/timeline?days=${days}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.period).toBe(`${days} days`);
      }
    });

    it('should include proper timeline structure', async () => {
      const response = await request(app)
        .get('/api/v1/visualization/timeline')
        .expect(200);

      expect(response.body.success).toBe(true);
      
      if (response.body.data.timeline.length > 0) {
        const day = response.body.data.timeline[0];
        expect(day).toHaveProperty('date');
        expect(day).toHaveProperty('memories');
        expect(day).toHaveProperty('memoryCount');
        expect(day).toHaveProperty('avgImportance');
        expect(day).toHaveProperty('avgAccess');
        expect(Array.isArray(day.memories)).toBe(true);
      }
    });
  });

  describe('GET /api/v1/visualization/clusters', () => {
    it('should get memory clustering data', async () => {
      const response = await request(app)
        .get('/api/v1/visualization/clusters')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('memories');
      expect(response.body.data).toHaveProperty('count');
      expect(Array.isArray(response.body.data.memories)).toBe(true);
    });

    it('should get cluster data for specific agent', async () => {
      const response = await request(app)
        .get(`/api/v1/visualization/clusters?agentId=${testAgent.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('memories');
    });

    it('should respect limit parameter', async () => {
      const response = await request(app)
        .get('/api/v1/visualization/clusters?limit=2')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.memories.length).toBeLessThanOrEqual(2);
    });

    it('should include proper cluster structure', async () => {
      const response = await request(app)
        .get('/api/v1/visualization/clusters')
        .expect(200);

      expect(response.body.success).toBe(true);
      
      if (response.body.data.memories.length > 0) {
        const memory = response.body.data.memories[0];
        expect(memory).toHaveProperty('id');
        expect(memory).toHaveProperty('content');
        expect(memory).toHaveProperty('type');
        expect(memory).toHaveProperty('importance');
        expect(memory).toHaveProperty('x');
        expect(memory).toHaveProperty('y');
        expect(memory).toHaveProperty('size');
        expect(memory).toHaveProperty('color');
      }
    });
  });

  describe('GET /api/v1/visualization/heatmap', () => {
    it('should get memory heatmap data', async () => {
      const response = await request(app)
        .get('/api/v1/visualization/heatmap')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('heatmap');
      expect(response.body.data).toHaveProperty('period');
      expect(response.body.data).toHaveProperty('totalMemories');
      expect(typeof response.body.data.heatmap).toBe('object');
    });

    it('should get heatmap data for specific agent', async () => {
      const response = await request(app)
        .get(`/api/v1/visualization/heatmap?agentId=${testAgent.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('heatmap');
    });

    it('should get heatmap data for different periods', async () => {
      const periods = [7, 30, 90];
      
      for (const days of periods) {
        const response = await request(app)
          .get(`/api/v1/visualization/heatmap?days=${days}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.period).toBe(`${days} days`);
      }
    });

    it('should include proper heatmap structure', async () => {
      const response = await request(app)
        .get('/api/v1/visualization/heatmap')
        .expect(200);

      expect(response.body.success).toBe(true);
      
      const heatmap = response.body.data.heatmap;
      const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      
      daysOfWeek.forEach(day => {
        expect(heatmap).toHaveProperty(day);
        expect(typeof heatmap[day]).toBe('object');
        
        // Check that each day has 24 hours (0-23)
        for (let hour = 0; hour < 24; hour++) {
          expect(heatmap[day]).toHaveProperty(hour.toString());
          const hourData = heatmap[day][hour.toString()];
          expect(hourData).toHaveProperty('memoryCount');
          expect(hourData).toHaveProperty('avgImportance');
          expect(hourData).toHaveProperty('avgAccess');
          expect(hourData).toHaveProperty('intensity');
        }
      });
    });
  });
});
