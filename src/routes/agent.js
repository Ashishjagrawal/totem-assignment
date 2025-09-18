const express = require('express');
const Joi = require('joi');
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const router = express.Router();
const prisma = new PrismaClient();

// Validation schemas
const createAgentSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  description: Joi.string().max(500).optional(),
});

const updateAgentSchema = Joi.object({
  name: Joi.string().min(1).max(100).optional(),
  description: Joi.string().max(500).optional(),
});

const createSessionSchema = Joi.object({
  agentId: Joi.string().uuid().required(),
  name: Joi.string().max(100).optional(),
  metadata: Joi.object().optional(),
});

// Create a new agent
router.post('/', async (req, res) => {
  try {
    const { error, value } = createAgentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.details.map(d => d.message),
      });
    }

    const agent = await prisma.agent.create({
      data: value,
    });
    
    res.status(201).json({
      success: true,
      data: agent,
      message: 'Agent created successfully',
    });
  } catch (error) {
    logger.error('Error creating agent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create agent',
      message: error.message,
    });
  }
});

// Get all agents
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const whereClause = search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ],
    } : {};

    const [agents, total] = await Promise.all([
      prisma.agent.findMany({
        where: whereClause,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              memories: true,
              sessions: true,
            },
          },
        },
      }),
      prisma.agent.count({ where: whereClause }),
    ]);

    res.json({
      success: true,
      data: {
        agents,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    logger.error('Error getting agents:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get agents',
      message: error.message,
    });
  }
});

// Get agent by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid agent ID format',
      });
    }

    const agent = await prisma.agent.findUnique({
      where: { id },
      include: {
        memories: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            content: true,
            type: true,
            importance: true,
            createdAt: true,
          },
        },
        sessions: {
          take: 5,
          orderBy: { startTime: 'desc' },
          select: {
            id: true,
            name: true,
            startTime: true,
            endTime: true,
          },
        },
        _count: {
          select: {
            memories: true,
            sessions: true,
          },
        },
      },
    });

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found',
      });
    }

    res.json({
      success: true,
      data: agent,
    });
  } catch (error) {
    logger.error('Error getting agent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get agent',
      message: error.message,
    });
  }
});

// Update agent
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid agent ID format',
      });
    }

    const { error, value } = updateAgentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.details.map(d => d.message),
      });
    }

    const agent = await prisma.agent.update({
      where: { id },
      data: value,
    });
    
    res.json({
      success: true,
      data: agent,
      message: 'Agent updated successfully',
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Agent not found',
      });
    }
    
    logger.error('Error updating agent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update agent',
      message: error.message,
    });
  }
});

// Delete agent
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid agent ID format',
      });
    }

    await prisma.agent.delete({
      where: { id },
    });
    
    res.json({
      success: true,
      message: 'Agent deleted successfully',
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Agent not found',
      });
    }
    
    logger.error('Error deleting agent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete agent',
      message: error.message,
    });
  }
});

// Create a new session
router.post('/:id/sessions', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid agent ID format',
      });
    }

    const { error, value } = createSessionSchema.validate({
      ...req.body,
      agentId: id,
    });
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.details.map(d => d.message),
      });
    }

    const session = await prisma.session.create({
      data: value,
    });
    
    res.status(201).json({
      success: true,
      data: session,
      message: 'Session created successfully',
    });
  } catch (error) {
    logger.error('Error creating session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create session',
      message: error.message,
    });
  }
});

// Get agent sessions
router.get('/:id/sessions', async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    if (!id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid agent ID format',
      });
    }

    const [sessions, total] = await Promise.all([
      prisma.session.findMany({
        where: { agentId: id },
        skip,
        take: parseInt(limit),
        orderBy: { startTime: 'desc' },
        include: {
          _count: {
            select: {
              memories: true,
            },
          },
        },
      }),
      prisma.session.count({ where: { agentId: id } }),
    ]);

    res.json({
      success: true,
      data: {
        sessions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    logger.error('Error getting agent sessions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get agent sessions',
      message: error.message,
    });
  }
});

// End session
router.put('/:id/sessions/:sessionId/end', async (req, res) => {
  try {
    const { id, sessionId } = req.params;
    
    if (!id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid agent ID format',
      });
    }

    if (!sessionId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid session ID format',
      });
    }

    const session = await prisma.session.update({
      where: {
        id: sessionId,
        agentId: id,
      },
      data: {
        endTime: new Date(),
      },
    });
    
    res.json({
      success: true,
      data: session,
      message: 'Session ended successfully',
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
      });
    }
    
    logger.error('Error ending session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to end session',
      message: error.message,
    });
  }
});

module.exports = router;
