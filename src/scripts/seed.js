const { PrismaClient } = require('@prisma/client');
const embeddingService = require('../services/embeddingService');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

const sampleData = {
  agents: [
    {
      name: 'AI Assistant Alpha',
      description: 'Primary AI assistant for general tasks and conversations',
    },
    {
      name: 'Research Bot Beta',
      description: 'Specialized AI for research and data analysis',
    },
    {
      name: 'Creative Agent Gamma',
      description: 'AI focused on creative writing and content generation',
    },
  ],
  sessions: [
    {
      name: 'Morning Learning Session',
      metadata: { environment: 'development', version: '1.0' },
    },
    {
      name: 'Research Session',
      metadata: { project: 'AI Research', priority: 'high' },
    },
    {
      name: 'Creative Writing Session',
      metadata: { genre: 'fiction', mood: 'inspired' },
    },
  ],
  memories: [
    {
      content: 'Learned about Node.js event loop and how it handles asynchronous operations efficiently',
      type: 'SEMANTIC',
      importance: 0.9,
    },
    {
      content: 'Discovered that PostgreSQL with pgvector extension is excellent for storing and querying vector embeddings',
      type: 'SEMANTIC',
      importance: 0.95,
    },
    {
      content: 'Successfully implemented a REST API using Express.js with proper error handling and validation',
      type: 'PROCEDURAL',
      importance: 0.8,
    },
    {
      content: 'Had a conversation with a user about machine learning concepts and explained neural networks',
      type: 'EPISODIC',
      importance: 0.7,
    },
    {
      content: 'Wrote a creative story about a robot learning to understand human emotions',
      type: 'EPISODIC',
      importance: 0.6,
    },
    {
      content: 'Researched the latest developments in transformer architecture and attention mechanisms',
      type: 'SEMANTIC',
      importance: 0.85,
    },
    {
      content: 'Debugged a memory leak issue in the Node.js application by analyzing heap snapshots',
      type: 'PROCEDURAL',
      importance: 0.75,
    },
    {
      content: 'Collaborated with another AI agent to solve a complex problem requiring multiple steps',
      type: 'EPISODIC',
      importance: 0.8,
    },
    {
      content: 'Learned about memory consolidation techniques in artificial neural networks',
      type: 'SEMANTIC',
      importance: 0.9,
    },
    {
      content: 'Created a visualization dashboard showing memory clustering patterns',
      type: 'PROCEDURAL',
      importance: 0.7,
    },
  ],
};

async function seedDatabase() {
  try {
    logger.info('Starting database seeding...');

    // Clear existing data
    await prisma.memoryLink.deleteMany();
    await prisma.proceduralStep.deleteMany();
    await prisma.memory.deleteMany();
    await prisma.session.deleteMany();
    await prisma.agent.deleteMany();
    await prisma.memoryAccess.deleteMany();
    await prisma.systemMetrics.deleteMany();

    // Create agents
    const agents = [];
    for (const agentData of sampleData.agents) {
      const agent = await prisma.agent.create({
        data: agentData,
      });
      agents.push(agent);
      logger.info(`Created agent: ${agent.name}`);
    }

    // Create sessions
    const sessions = [];
    for (let i = 0; i < sampleData.sessions.length; i++) {
      const sessionData = {
        ...sampleData.sessions[i],
        agentId: agents[i % agents.length].id,
      };
      const session = await prisma.session.create({
        data: sessionData,
      });
      sessions.push(session);
      logger.info(`Created session: ${session.name}`);
    }

    // Create memories with embeddings
    const memories = [];
    for (let i = 0; i < sampleData.memories.length; i++) {
      const memoryData = sampleData.memories[i];
      const agentId = agents[i % agents.length].id;
      const sessionId = sessions[i % sessions.length].id;

      try {
        // Generate embedding
        const embedding = await embeddingService.generateEmbedding(memoryData.content);

        const memory = await prisma.memory.create({
          data: {
            ...memoryData,
            agentId,
            sessionId,
            embedding,
            accessCount: Math.floor(Math.random() * 10),
            metadata: {
              source: 'seed_data',
              createdBy: 'seed_script',
            },
          },
        });

        memories.push(memory);
        logger.info(`Created memory: ${memory.content.substring(0, 50)}...`);
      } catch (error) {
        logger.error(`Failed to create memory: ${memoryData.content}`, error);
      }
    }

    // Create some memory links
    let linksCreated = 0;
    for (let i = 0; i < memories.length; i++) {
      for (let j = i + 1; j < memories.length; j++) {
        if (memories[i].embedding && memories[j].embedding) {
          try {
            const similarity = embeddingService.calculateSimilarity(
              memories[i].embedding,
              memories[j].embedding
            );

            if (similarity > 0.7) {
              await prisma.memoryLink.create({
                data: {
                  sourceId: memories[i].id,
                  targetId: memories[j].id,
                  linkType: 'SEMANTIC',
                  strength: similarity,
                  similarity,
                },
              });
              linksCreated++;
            }
          } catch (error) {
            logger.error('Failed to create memory link:', error);
          }
        }
      }
    }

    // Create some procedural steps
    const proceduralMemories = memories.filter(m => m.type === 'PROCEDURAL');
    for (const memory of proceduralMemories) {
      const steps = [
        {
          stepNumber: 1,
          action: 'Analyze the problem',
          parameters: { complexity: 'medium' },
          result: 'Identified key components',
        },
        {
          stepNumber: 2,
          action: 'Design solution',
          parameters: { approach: 'iterative' },
          result: 'Created initial design',
        },
        {
          stepNumber: 3,
          action: 'Implement solution',
          parameters: { language: 'JavaScript' },
          result: 'Working implementation',
        },
        {
          stepNumber: 4,
          action: 'Test and validate',
          parameters: { testType: 'integration' },
          result: 'All tests passed',
        },
      ];

      for (const step of steps) {
        await prisma.proceduralStep.create({
          data: {
            ...step,
            memoryId: memory.id,
          },
        });
      }
    }

    // Create some sample metrics
    const metrics = [
      { metricType: 'response_time', value: 150, metadata: { endpoint: '/memories' } },
      { metricType: 'memory_access_latency', value: 25, metadata: { operation: 'search' } },
      { metricType: 'embedding_generation_time', value: 1200, metadata: { model: 'text-embedding-3-small' } },
      { metricType: 'memory_count', value: memories.length, metadata: { type: 'total' } },
      { metricType: 'link_count', value: linksCreated, metadata: { type: 'semantic' } },
    ];

    for (const metric of metrics) {
      await prisma.systemMetrics.create({
        data: metric,
      });
    }

    logger.info('Database seeding completed successfully!');
    logger.info(`Created ${agents.length} agents`);
    logger.info(`Created ${sessions.length} sessions`);
    logger.info(`Created ${memories.length} memories`);
    logger.info(`Created ${linksCreated} memory links`);
    logger.info(`Created ${proceduralMemories.length * 4} procedural steps`);
    logger.info(`Created ${metrics.length} system metrics`);

  } catch (error) {
    logger.error('Error seeding database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      logger.info('Seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = seedDatabase;
