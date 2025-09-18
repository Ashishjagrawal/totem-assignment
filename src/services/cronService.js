const cron = require('node-cron');
const memoryEvolutionService = require('./memoryEvolutionService');
const logger = require('../utils/logger');

class CronService {
  constructor() {
    this.jobs = new Map();
    this.isRunning = false;
  }

  start() {
    if (this.isRunning) {
      logger.warn('Cron service is already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting cron service...');

    // Memory decay - run every 6 hours
    this.scheduleJob('memory-decay', '0 */6 * * *', async () => {
      try {
        logger.info('Running scheduled memory decay...');
        const result = await memoryEvolutionService.decayMemories();
        logger.info('Memory decay completed:', result);
      } catch (error) {
        logger.error('Error in scheduled memory decay:', error);
      }
    });

    // Memory consolidation - run daily at 2 AM
    this.scheduleJob('memory-consolidation', '0 2 * * *', async () => {
      try {
        logger.info('Running scheduled memory consolidation...');
        const result = await memoryEvolutionService.consolidateSimilarMemories();
        logger.info('Memory consolidation completed:', result);
      } catch (error) {
        logger.error('Error in scheduled memory consolidation:', error);
      }
    });

    // Memory link updates - run every 4 hours
    this.scheduleJob('memory-links', '0 */4 * * *', async () => {
      try {
        logger.info('Running scheduled memory link updates...');
        const result = await memoryEvolutionService.updateMemoryLinks();
        logger.info('Memory link updates completed:', result);
      } catch (error) {
        logger.error('Error in scheduled memory link updates:', error);
      }
    });

    // Full evolution cycle - run weekly on Sunday at 3 AM
    this.scheduleJob('full-evolution', '0 3 * * 0', async () => {
      try {
        logger.info('Running scheduled full evolution cycle...');
        const result = await memoryEvolutionService.runEvolutionCycle();
        logger.info('Full evolution cycle completed:', result);
      } catch (error) {
        logger.error('Error in scheduled full evolution cycle:', error);
      }
    });

    logger.info('Cron service started successfully');
  }

  stop() {
    if (!this.isRunning) {
      logger.warn('Cron service is not running');
      return;
    }

    this.isRunning = false;
    logger.info('Stopping cron service...');

    // Stop all scheduled jobs
    this.jobs.forEach((job, name) => {
      job.stop();
      logger.info(`Stopped job: ${name}`);
    });

    this.jobs.clear();
    logger.info('Cron service stopped');
  }

  scheduleJob(name, schedule, task) {
    if (this.jobs.has(name)) {
      logger.warn(`Job ${name} already exists, stopping previous instance`);
      this.jobs.get(name).stop();
    }

    const job = cron.schedule(schedule, task, {
      scheduled: false,
      timezone: 'UTC',
    });

    job.start();
    this.jobs.set(name, job);

    logger.info(`Scheduled job: ${name} with schedule: ${schedule}`);
  }

  getJobStatus() {
    const status = {};
    this.jobs.forEach((job, name) => {
      status[name] = {
        running: job.running,
        scheduled: job.scheduled,
      };
    });
    return status;
  }

  runJobNow(jobName) {
    const job = this.jobs.get(jobName);
    if (!job) {
      throw new Error(`Job ${jobName} not found`);
    }

    logger.info(`Manually triggering job: ${jobName}`);
    // Note: This is a simplified approach. In a real implementation,
    // you'd want to extract the task function and call it directly
    return job.fireOnTick();
  }
}

module.exports = new CronService();
