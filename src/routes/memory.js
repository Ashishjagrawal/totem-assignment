const express = require('express');
const Joi = require('joi');
const MemoryService = require('../services/memoryService');
const memoryService = new MemoryService();
const logger = require('../utils/logger');

const router = express.Router();

// Validation schemas
const createMemorySchema = Joi.object({
  agentId: Joi.string().uuid().required(),
  content: Joi.string().min(1).max(10000).required(),
  type: Joi.string().valid('EPISODIC', 'SEMANTIC', 'PROCEDURAL', 'WORKING', 'ARCHIVED').default('EPISODIC'),
  sessionId: Joi.string().uuid().optional(),
  metadata: Joi.object().optional(),
});

const updateMemorySchema = Joi.object({
  content: Joi.string().min(1).max(10000).optional(),
  type: Joi.string().valid('EPISODIC', 'SEMANTIC', 'PROCEDURAL', 'WORKING', 'ARCHIVED').optional(),
  importance: Joi.number().min(0).max(1).optional(),
  metadata: Joi.object().optional(),
});

const searchMemoriesSchema = Joi.object({
  query: Joi.string().min(1).max(1000).required(),
  type: Joi.string().valid('EPISODIC', 'SEMANTIC', 'PROCEDURAL', 'WORKING', 'ARCHIVED').optional(),
  limit: Joi.number().integer().min(1).max(100).default(10),
  offset: Joi.number().integer().min(0).default(0),
  minSimilarity: Joi.number().min(0).max(1).default(0.7),
  agentId: Joi.string().uuid().required(),
});

// Create a new memory
router.post('/', async (req, res) => {
  try {
    const { error, value } = createMemorySchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.details.map(d => d.message),
      });
    }

    const memory = await memoryService.createMemory(value.agentId, value);
    
    res.status(201).json({
      success: true,
      data: memory,
      message: 'Memory created successfully',
    });
  } catch (error) {
    logger.error('Error creating memory:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create memory',
      message: error.message,
    });
  }
});

// Get memory by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid memory ID format',
      });
    }

    const memory = await memoryService.getMemoryById(id);
    
    if (!memory) {
      return res.status(404).json({
        success: false,
        error: 'Memory not found',
      });
    }

    res.json({
      success: true,
      data: memory,
    });
  } catch (error) {
    logger.error('Error getting memory:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get memory',
      message: error.message,
    });
  }
});

// Update memory
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid memory ID format',
      });
    }

    const { error, value } = updateMemorySchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.details.map(d => d.message),
      });
    }

    const memory = await memoryService.updateMemory(id, value);
    
    res.json({
      success: true,
      data: memory,
      message: 'Memory updated successfully',
    });
  } catch (error) {
    logger.error('Error updating memory:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update memory',
      message: error.message,
    });
  }
});

// Delete memory
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid memory ID format',
      });
    }

    await memoryService.deleteMemory(id);
    
    res.json({
      success: true,
      message: 'Memory deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting memory:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete memory',
      message: error.message,
    });
  }
});

// Search memories
router.post('/search', async (req, res) => {
  try {
    const { error, value } = searchMemoriesSchema.validate(req.body);
    if (error) {
      // Check if agentId is missing
      if (error.details.some(d => d.path.includes('agentId'))) {
        return res.status(400).json({
          success: false,
          error: 'Agent ID is required for memory search',
        });
      }
      
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.details.map(d => d.message),
      });
    }

    const { agentId, ...searchOptions } = value;

    const results = await memoryService.searchMemories(agentId, value.query, searchOptions);
    
    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    logger.error('Error searching memories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search memories',
      message: error.message,
    });
  }
});

// Get memory statistics
router.get('/stats/:agentId?', async (req, res) => {
  try {
    const { agentId } = req.params;
    
    if (agentId && !agentId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid agent ID format',
      });
    }

    const stats = await memoryService.getMemoryStats(agentId);
    
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Error getting memory stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get memory statistics',
      message: error.message,
    });
  }
});

// Trigger memory decay (admin endpoint)
router.post('/decay', async (req, res) => {
  try {
    const results = await memoryService.decayMemories();
    
    res.json({
      success: true,
      data: results,
      message: 'Memory decay process completed',
    });
  } catch (error) {
    logger.error('Error decaying memories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to decay memories',
      message: error.message,
    });
  }
});

module.exports = router;
