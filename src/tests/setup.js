// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL?.replace('memory_warehouse', 'memory_warehouse_test') || 'postgresql://postgres:postgres@localhost:5432/memory_warehouse_test?schema=public';

// Set a mock OpenAI API key for tests
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'test-api-key';

// Use different ports for different test suites to avoid conflicts
process.env.PORT = process.env.PORT || (3000 + Math.floor(Math.random() * 1000));

const { PrismaClient } = require('@prisma/client');

// Setup test database
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_DATABASE_URL,
    },
  },
});

// Global test setup
beforeAll(async () => {
  // Skip database cleanup for unit tests (they use mocks)
  if (process.env.NODE_ENV === 'test' && process.env.TEST_TYPE === 'unit') {
    return;
  }
  
  try {
    // Clean up test database in the correct order (respecting foreign key constraints)
    await prisma.memoryLink.deleteMany();
    await prisma.proceduralStep.deleteMany();
    await prisma.memoryAccess.deleteMany();
    await prisma.systemMetrics.deleteMany();
    await prisma.memory.deleteMany();
    await prisma.session.deleteMany();
    await prisma.agent.deleteMany();
  } catch (error) {
    console.warn('Warning: Could not clean up test database:', error.message);
  }
});

// Global test teardown
afterAll(async () => {
  try {
    await prisma.$disconnect();
  } catch (error) {
    console.warn('Warning: Could not disconnect from test database:', error.message);
  }
});

// Make prisma available to tests
global.prisma = prisma;
