const express = require('express');
const Joi = require('joi');
const { PrismaClient } = require('@prisma/client');
const AgentService = require('../services/agentService');
const logger = require('../utils/logger');

const router = express.Router();
const prisma = new PrismaClient();
const agentService = new AgentService();

// Validation schemas
const createAgentSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  description: Joi.string().max(500).optional(),
  metadata: Joi.object().optional(),
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

    const agent = await agentService.createAgent(value);
    
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

    const result = await agentService.listAgents(parseInt(page), parseInt(limit));

    res.json({
      success: true,
      data: result,
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

    const agent = await agentService.getAgent(id);

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

    const agent = await agentService.updateAgent(id, value);
    
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

    await agentService.deleteAgent(id);
    
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

    const session = await agentService.createSession(id, value);
    
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

    const result = await agentService.getAgentSessions(id, parseInt(page), parseInt(limit));

    res.json({
      success: true,
      data: result,
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

    const session = await agentService.endSession(sessionId);
    
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
