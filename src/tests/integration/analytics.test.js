const request = require('supertest');
const app = require('../../server');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

describe('Analytics API Integration Tests', () => {
  let testAgent;
  let testMemories = [];

  beforeAll(async () => {
    // Create test agent
    testAgent = await prisma.agent.create({
      data: {
        name: 'Analytics Test Agent',
        description: 'Agent for testing analytics',
      },
    });

    // Create test memories
    testMemories = await Promise.all([
      prisma.memory.create({
        data: {
          agentId: testAgent.id,
          content: 'Test memory 1 for analytics',
          type: 'EPISODIC',
          importance: 0.8,
          accessCount: 5,
        },
      }),
      prisma.memory.create({
        data: {
          agentId: testAgent.id,
          content: 'Test memory 2 for analytics',
          type: 'SEMANTIC',
          importance: 0.9,
          accessCount: 3,
        },
      }),
      prisma.memory.create({
        data: {
          agentId: testAgent.id,
          content: 'Test memory 3 for analytics',
          type: 'PROCEDURAL',
          importance: 0.7,
          accessCount: 8,
        },
      }),
    ]);

    // Create some memory links
    await prisma.memoryLink.create({
      data: {
        sourceId: testMemories[0].id,
        targetId: testMemories[1].id,
        linkType: 'SEMANTIC',
        strength: 0.8,
        similarity: 0.8,
      },
    });

    // Create some system metrics
    await prisma.systemMetrics.createMany({
      data: [
        {
          metricType: 'response_time',
          value: 150,
          metadata: { endpoint: '/memories' },
        },
        {
          metricType: 'memory_access_latency',
          value: 25,
          metadata: { operation: 'search' },
        },
        {
          metricType: 'embedding_generation_time',
          value: 1200,
          metadata: { model: 'text-embedding-3-small' },
        },
      ],
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.memoryLink.deleteMany();
    await prisma.memory.deleteMany();
    await prisma.agent.deleteMany();
    await prisma.systemMetrics.deleteMany();
    await prisma.$disconnect();
  });

  describe('GET /api/v1/analytics/metrics', () => {
    it('should get system metrics', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/metrics')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('memoryStats');
      expect(response.body.data).toHaveProperty('accessPatterns');
      expect(response.body.data).toHaveProperty('linkStats');
      expect(response.body.data).toHaveProperty('topMemories');
      expect(response.body.data).toHaveProperty('systemMetrics');
    });

    it('should get metrics for specific agent', async () => {
      const response = await request(app)
        .get(`/api/v1/analytics/metrics?agentId=${testAgent.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('memoryStats');
    });

    it('should get metrics for different time ranges', async () => {
      const timeRanges = ['1h', '24h', '7d', '30d'];
      
      for (const timeRange of timeRanges) {
        const response = await request(app)
          .get(`/api/v1/analytics/metrics?timeRange=${timeRange}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.timeRange).toBe(timeRange);
      }
    });
  });

  describe('GET /api/v1/analytics/evolution', () => {
    it('should get memory evolution data', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/evolution')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('dailyMemories');
      expect(response.body.data).toHaveProperty('importanceEvolution');
      expect(response.body.data).toHaveProperty('linkEvolution');
      expect(response.body.data).toHaveProperty('period');
    });

    it('should get evolution data for specific agent', async () => {
      const response = await request(app)
        .get(`/api/v1/analytics/evolution?agentId=${testAgent.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('dailyMemories');
    });

    it('should get evolution data for different periods', async () => {
      const periods = [7, 30, 90];
      
      for (const days of periods) {
        const response = await request(app)
          .get(`/api/v1/analytics/evolution?days=${days}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.period).toBe(`${days} days`);
      }
    });
  });

  describe('GET /api/v1/analytics/clustering', () => {
    it('should get memory clustering data', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/clustering')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('memories');
      expect(response.body.data).toHaveProperty('links');
      expect(response.body.data).toHaveProperty('count');
    });

    it('should get clustering data for specific agent', async () => {
      const response = await request(app)
        .get(`/api/v1/analytics/clustering?agentId=${testAgent.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('memories');
    });

    it('should respect limit parameter', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/clustering?limit=2')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.memories.length).toBeLessThanOrEqual(2);
    });
  });

  describe('GET /api/v1/analytics/performance', () => {
    it('should get performance metrics', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/performance')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('timeRange');
      expect(response.body.data).toHaveProperty('metrics');
      expect(response.body.data).toHaveProperty('rawData');
    });

    it('should get performance metrics for different time ranges', async () => {
      const timeRanges = ['1h', '24h', '7d'];
      
      for (const timeRange of timeRanges) {
        const response = await request(app)
          .get(`/api/v1/analytics/performance?timeRange=${timeRange}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.timeRange).toBe(timeRange);
      }
    });
  });

  describe('POST /api/v1/analytics/metrics', () => {
    it('should record a system metric', async () => {
      const metricData = {
        metricType: 'test_metric',
        value: 100,
        metadata: { test: true },
      };

      const response = await request(app)
        .post('/api/v1/analytics/metrics')
        .send(metricData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.metricType).toBe(metricData.metricType);
      expect(response.body.data.value).toBe(metricData.value);
    });

    it('should return 400 for missing required fields', async () => {
      const invalidData = {
        value: 100,
        // Missing metricType
      };

      const response = await request(app)
        .post('/api/v1/analytics/metrics')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Metric type and value are required');
    });
  });
});
