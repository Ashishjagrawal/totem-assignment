const express = require('express');
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const router = express.Router();
const prisma = new PrismaClient();

// Get memory network data for visualization
router.get('/network', async (req, res) => {
  try {
    const { agentId, maxNodes = 100, minSimilarity = 0.5 } = req.query;

    const whereClause = {
      embedding: { not: null },
      ...(agentId && { agentId }),
    };

    // Get memories with their basic info
    const memories = await prisma.memory.findMany({
      where: whereClause,
      select: {
        id: true,
        content: true,
        type: true,
        importance: true,
        accessCount: true,
        createdAt: true,
      },
      take: parseInt(maxNodes),
      orderBy: { importance: 'desc' },
    });

    // Get links between these memories
    const memoryIds = memories.map(m => m.id);
    const links = await prisma.memoryLink.findMany({
      where: {
        AND: [
          { sourceId: { in: memoryIds } },
          { targetId: { in: memoryIds } },
          { similarity: { gte: parseFloat(minSimilarity) } },
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

    // Format data for network visualization
    const nodes = memories.map(memory => ({
      id: memory.id,
      label: memory.content.substring(0, 50) + (memory.content.length > 50 ? '...' : ''),
      type: memory.type,
      importance: memory.importance,
      accessCount: memory.accessCount,
      createdAt: memory.createdAt,
      size: Math.max(5, memory.importance * 20), // Node size based on importance
      color: getNodeColor(memory.type),
    }));

    const edges = links.map(link => ({
      id: link.id,
      source: link.sourceId,
      target: link.targetId,
      type: link.linkType,
      strength: link.strength,
      similarity: link.similarity,
      width: Math.max(1, link.strength * 5), // Edge width based on strength
      color: getEdgeColor(link.linkType),
    }));

    res.json({
      success: true,
      data: {
        nodes,
        edges,
        stats: {
          totalNodes: nodes.length,
          totalEdges: edges.length,
          nodeTypes: getNodeTypeStats(nodes),
          linkTypes: getLinkTypeStats(edges),
        },
        timestamp: new Date(),
      },
    });
  } catch (error) {
    logger.error('Error getting network data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get network data',
      message: error.message,
    });
  }
});

// Get memory timeline data
router.get('/timeline', async (req, res) => {
  try {
    const { agentId, days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const whereClause = {
      createdAt: { gte: startDate },
      ...(agentId && { agentId }),
    };

    // Get memories with timeline data
    const memories = await prisma.memory.findMany({
      where: whereClause,
      select: {
        id: true,
        content: true,
        type: true,
        importance: true,
        createdAt: true,
        accessCount: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group by date
    const timelineData = memories.reduce((acc, memory) => {
      const date = memory.createdAt.toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = {
          date,
          memories: [],
          totalImportance: 0,
          totalAccess: 0,
        };
      }
      acc[date].memories.push(memory);
      acc[date].totalImportance += memory.importance;
      acc[date].totalAccess += memory.accessCount;
      return acc;
    }, {});

    const timeline = Object.values(timelineData).map(day => ({
      ...day,
      memoryCount: day.memories.length,
      avgImportance: day.totalImportance / day.memories.length,
      avgAccess: day.totalAccess / day.memories.length,
    }));

    res.json({
      success: true,
      data: {
        timeline,
        period: `${days} days`,
        totalMemories: memories.length,
        timestamp: new Date(),
      },
    });
  } catch (error) {
    logger.error('Error getting timeline data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get timeline data',
      message: error.message,
    });
  }
});

// Get memory clustering data for 2D visualization
router.get('/clusters', async (req, res) => {
  try {
    const { agentId, limit = 500 } = req.query;

    const whereClause = {
      embedding: { not: null },
      ...(agentId && { agentId }),
    };

    // Get memories with embeddings
    const memories = await prisma.memory.findMany({
      where: whereClause,
      select: {
        id: true,
        content: true,
        type: true,
        importance: true,
        embedding: true,
        accessCount: true,
        createdAt: true,
      },
      take: parseInt(limit),
    });

    // Simple 2D projection (in a real implementation, you'd use t-SNE or UMAP)
    // Calculate positions based on embeddings using t-SNE-like projection
    const projectedMemories = memories.map((memory, index) => {
      let x, y;
      
      if (memory.embedding && memory.embedding.length > 0) {
        // Use first two dimensions of embedding for positioning
        const embedding = JSON.parse(memory.embedding);
        x = (embedding[0] + 1) * 500; // Normalize to 0-1000 range
        y = (embedding[1] + 1) * 500; // Normalize to 0-1000 range
      } else {
        // Fallback to circular distribution for memories without embeddings
        const angle = (index / memories.length) * 2 * Math.PI;
        const radius = 200 + (memory.importance * 100);
        x = 500 + radius * Math.cos(angle);
        y = 500 + radius * Math.sin(angle);
      }
      
      return {
        id: memory.id,
        content: memory.content.substring(0, 100) + (memory.content.length > 100 ? '...' : ''),
        type: memory.type,
        importance: memory.importance,
        accessCount: memory.accessCount,
        x: Math.max(50, Math.min(950, x)), // Keep within bounds
        y: Math.max(50, Math.min(950, y)), // Keep within bounds
        size: Math.max(5, memory.importance * 20),
        color: getNodeColor(memory.type),
      };
    });

    res.json({
      success: true,
      data: {
        memories: projectedMemories,
        count: projectedMemories.length,
        timestamp: new Date(),
      },
    });
  } catch (error) {
    logger.error('Error getting cluster data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get cluster data',
      message: error.message,
    });
  }
});

// Get memory heatmap data
router.get('/heatmap', async (req, res) => {
  try {
    const { agentId, days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const whereClause = {
      createdAt: { gte: startDate },
      ...(agentId && { agentId }),
    };

    // Get memories grouped by hour and day
    const memories = await prisma.memory.findMany({
      where: whereClause,
      select: {
        id: true,
        type: true,
        importance: true,
        createdAt: true,
        accessCount: true,
      },
    });

    // Create heatmap data
    const heatmapData = {};
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    // Initialize heatmap
    daysOfWeek.forEach(day => {
      heatmapData[day] = {};
      hours.forEach(hour => {
        heatmapData[day][hour] = {
          memoryCount: 0,
          totalImportance: 0,
          totalAccess: 0,
        };
      });
    });

    // Populate heatmap
    memories.forEach(memory => {
      const date = new Date(memory.createdAt);
      const dayOfWeek = daysOfWeek[date.getDay()];
      const hour = date.getHours();

      heatmapData[dayOfWeek][hour].memoryCount++;
      heatmapData[dayOfWeek][hour].totalImportance += memory.importance;
      heatmapData[dayOfWeek][hour].totalAccess += memory.accessCount;
    });

    // Calculate averages
    const heatmap = {};
    daysOfWeek.forEach(day => {
      heatmap[day] = {};
      hours.forEach(hour => {
        const data = heatmapData[day][hour];
        heatmap[day][hour] = {
          memoryCount: data.memoryCount,
          avgImportance: data.memoryCount > 0 ? data.totalImportance / data.memoryCount : 0,
          avgAccess: data.memoryCount > 0 ? data.totalAccess / data.memoryCount : 0,
          intensity: Math.min(1, data.memoryCount / 10), // Normalize for visualization
        };
      });
    });

    res.json({
      success: true,
      data: {
        heatmap,
        period: `${days} days`,
        totalMemories: memories.length,
        timestamp: new Date(),
      },
    });
  } catch (error) {
    logger.error('Error getting heatmap data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get heatmap data',
      message: error.message,
    });
  }
});

// Helper functions
function getNodeColor(type) {
  const colors = {
    EPISODIC: '#FF6B6B',
    SEMANTIC: '#4ECDC4',
    PROCEDURAL: '#45B7D1',
    WORKING: '#96CEB4',
    ARCHIVED: '#D3D3D3',
  };
  return colors[type] || '#95A5A6';
}

function getEdgeColor(linkType) {
  const colors = {
    SEMANTIC: '#E74C3C',
    TEMPORAL: '#3498DB',
    CAUSAL: '#F39C12',
    CONTEXTUAL: '#9B59B6',
    HIERARCHICAL: '#2ECC71',
  };
  return colors[linkType] || '#95A5A6';
}

function getNodeTypeStats(nodes) {
  const stats = {};
  nodes.forEach(node => {
    stats[node.type] = (stats[node.type] || 0) + 1;
  });
  return stats;
}

function getLinkTypeStats(edges) {
  const stats = {};
  edges.forEach(edge => {
    stats[edge.type] = (stats[edge.type] || 0) + 1;
  });
  return stats;
}

module.exports = router;
