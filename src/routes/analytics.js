const express = require('express');
const { PrismaClient, Prisma } = require('@prisma/client');
const logger = require('../utils/logger');

const router = express.Router();
const prisma = new PrismaClient();

// Get system metrics
router.get('/metrics', async (req, res) => {
  try {
    const { timeRange = '24h', agentId } = req.query;
    
    // Calculate time range
    const now = new Date();
    let startTime;
    
    switch (timeRange) {
      case '1h':
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    const whereClause = {
      timestamp: {
        gte: startTime,
      },
      ...(agentId && { agentId }),
    };

    // Get memory statistics
    const memoryStats = await prisma.memory.groupBy({
      by: ['type'],
      where: {
        createdAt: { gte: startTime },
        ...(agentId && { agentId }),
      },
      _count: { id: true },
      _avg: { importance: true, accessCount: true },
    });

    // Get access patterns
    const accessPatterns = await prisma.memoryAccess.groupBy({
      by: ['accessType'],
      where: whereClause,
      _count: { id: true },
    });

    // Get memory links statistics
    const linkStats = await prisma.memoryLink.groupBy({
      by: ['linkType'],
      where: {
        createdAt: { gte: startTime },
      },
      _count: { id: true },
      _avg: { strength: true, similarity: true },
    });

    // Get top accessed memories
    const topMemories = await prisma.memory.findMany({
      where: {
        lastAccessed: { gte: startTime },
        ...(agentId && { agentId }),
      },
      orderBy: { accessCount: 'desc' },
      take: 10,
      select: {
        id: true,
        content: true,
        type: true,
        accessCount: true,
        importance: true,
        lastAccessed: true,
      },
    });

    // Get system performance metrics
    const systemMetrics = await prisma.systemMetrics.findMany({
      where: {
        timestamp: { gte: startTime },
      },
      orderBy: { timestamp: 'desc' },
      take: 100,
    });

    res.json({
      success: true,
      data: {
        timeRange,
        memoryStats,
        accessPatterns,
        linkStats,
        topMemories,
        systemMetrics,
        timestamp: now,
      },
    });
  } catch (error) {
    logger.error('Error getting metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get metrics',
      message: error.message,
    });
  }
});

// Get memory evolution data
router.get('/evolution', async (req, res) => {
  try {
    const { agentId, days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const whereClause = {
      createdAt: { gte: startDate },
      ...(agentId && { agentId }),
    };

    // Get daily memory creation counts using Prisma ORM instead of raw SQL
    const dailyMemories = await prisma.memory.groupBy({
      by: ['type'],
      where: whereClause,
      _count: {
        id: true
      },
      orderBy: {
        type: 'asc'
      }
    });

    // Get memory importance over time
    const importanceEvolution = await prisma.memory.findMany({
      where: whereClause,
      select: {
        id: true,
        importance: true,
        createdAt: true,
        type: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Get link creation over time using Prisma ORM
    const linkEvolution = await prisma.memoryLink.groupBy({
      by: ['linkType'],
      where: {
        createdAt: { gte: startDate }
      },
      _count: {
        id: true
      },
      orderBy: {
        linkType: 'asc'
      }
    });

    res.json({
      success: true,
      data: {
        dailyMemories,
        importanceEvolution,
        linkEvolution,
        period: `${days} days`,
        timestamp: new Date(),
      },
    });
  } catch (error) {
    logger.error('Error getting evolution data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get evolution data',
      message: error.message,
    });
  }
});

// Get memory clustering data
router.get('/clustering', async (req, res) => {
  try {
    const { agentId, limit = 1000 } = req.query;

    const whereClause = {
      embedding: { not: null },
      ...(agentId && { agentId }),
    };

    // Get memories with embeddings for clustering
    const memories = await prisma.memory.findMany({
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
      take: parseInt(limit),
    });

    // Get memory links for network visualization
    const links = await prisma.memoryLink.findMany({
      where: {
        OR: [
          { source: whereClause },
          { target: whereClause },
        ],
      },
      select: {
        id: true,
        sourceId: true,
        targetId: true,
        linkType: true,
        strength: true,
        similarity: true,
      },
    });

    res.json({
      success: true,
      data: {
        memories,
        links,
        count: memories.length,
        timestamp: new Date(),
      },
    });
  } catch (error) {
    logger.error('Error getting clustering data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get clustering data',
      message: error.message,
    });
  }
});

// Get performance metrics
router.get('/performance', async (req, res) => {
  try {
    const { timeRange = '1h' } = req.query;
    
    const now = new Date();
    let startTime;
    
    switch (timeRange) {
      case '1h':
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
    }

    // Get API response times (this would be tracked by middleware in a real implementation)
    const responseTimeMetrics = await prisma.systemMetrics.findMany({
      where: {
        metricType: 'response_time',
        timestamp: { gte: startTime },
      },
      orderBy: { timestamp: 'desc' },
    });

    // Get memory access latency
    const accessLatency = await prisma.systemMetrics.findMany({
      where: {
        metricType: 'memory_access_latency',
        timestamp: { gte: startTime },
      },
      orderBy: { timestamp: 'desc' },
    });

    // Get embedding generation time
    const embeddingTime = await prisma.systemMetrics.findMany({
      where: {
        metricType: 'embedding_generation_time',
        timestamp: { gte: startTime },
      },
      orderBy: { timestamp: 'desc' },
    });

    // Calculate averages
    const avgResponseTime = responseTimeMetrics.length > 0 
      ? responseTimeMetrics.reduce((sum, m) => sum + m.value, 0) / responseTimeMetrics.length 
      : 0;

    const avgAccessLatency = accessLatency.length > 0 
      ? accessLatency.reduce((sum, m) => sum + m.value, 0) / accessLatency.length 
      : 0;

    const avgEmbeddingTime = embeddingTime.length > 0 
      ? embeddingTime.reduce((sum, m) => sum + m.value, 0) / embeddingTime.length 
      : 0;

    res.json({
      success: true,
      data: {
        timeRange,
        metrics: {
          avgResponseTime,
          avgAccessLatency,
          avgEmbeddingTime,
        },
        rawData: {
          responseTimeMetrics,
          accessLatency,
          embeddingTime,
        },
        timestamp: now,
      },
    });
  } catch (error) {
    logger.error('Error getting performance metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get performance metrics',
      message: error.message,
    });
  }
});

// Record system metric
router.post('/metrics', async (req, res) => {
  try {
    const { metricType, value, metadata = {} } = req.body;

    if (!metricType || value === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Metric type and value are required',
      });
    }

    const metric = await prisma.systemMetrics.create({
      data: {
        metricType,
        value: parseFloat(value),
        metadata,
      },
    });

    res.status(201).json({
      success: true,
      data: metric,
      message: 'Metric recorded successfully',
    });
  } catch (error) {
    logger.error('Error recording metric:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record metric',
      message: error.message,
    });
  }
});

module.exports = router;
