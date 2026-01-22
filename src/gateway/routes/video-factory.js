/**
 * Video Factory API Routes
 * REST endpoints for the UGC video pipeline
 *
 * @module src/gateway/routes/video-factory
 */
const express = require('express');
const router = express.Router();
const videoFactory = require('../../services/video-factory');
const logger = require('../../core/logger').child('VideoFactoryAPI');

/**
 * POST /video-factory/jobs
 * Create a new video job
 */
router.post('/jobs', async (req, res) => {
  try {
    const {
      productName,
      description,
      scene,
      idealCustomer,
      photoLink,
      videoStyle,
      autoProcess = false,
    } = req.body;

    if (!productName) {
      return res.status(400).json({
        success: false,
        error: 'productName is required',
      });
    }

    // Create job
    const result = await videoFactory.createVideoJob({
      productName,
      description,
      scene,
      idealCustomer,
      photoLink,
      videoStyle,
    });

    if (!result.success) {
      return res.status(500).json(result);
    }

    // Auto-process if requested (async, don't wait)
    if (autoProcess) {
      videoFactory.processVideoJob(result.job.id)
        .then((r) => logger.info(`Job ${result.job.id} processed: ${r.success}`))
        .catch((e) => logger.error(`Job ${result.job.id} failed: ${e.message}`));
    }

    res.json({
      success: true,
      job: result.job,
      message: autoProcess ? 'Job created and processing started' : 'Job created',
    });
  } catch (e) {
    logger.error(`Create job error: ${e.message}`);
    res.status(500).json({ success: false, error: e.message });
  }
});

/**
 * POST /video-factory/jobs/:id/process
 * Process a specific job
 */
router.post('/jobs/:id/process', async (req, res) => {
  try {
    const { id } = req.params;
    const { sync = false } = req.body;

    if (sync) {
      // Wait for completion (can take 5-10 minutes)
      const result = await videoFactory.processVideoJob(id);
      res.json(result);
    } else {
      // Start async and return immediately
      videoFactory.processVideoJob(id)
        .then((r) => logger.info(`Job ${id} processed: ${r.success}`))
        .catch((e) => logger.error(`Job ${id} failed: ${e.message}`));

      res.json({
        success: true,
        message: 'Processing started',
        jobId: id,
      });
    }
  } catch (e) {
    logger.error(`Process job error: ${e.message}`);
    res.status(500).json({ success: false, error: e.message });
  }
});

/**
 * GET /video-factory/jobs
 * Get all jobs with optional filters
 */
router.get('/jobs', async (req, res) => {
  try {
    const { status, limit = 50 } = req.query;
    const result = await videoFactory.getJobs({ status, limit: parseInt(limit) });
    res.json(result);
  } catch (e) {
    logger.error(`Get jobs error: ${e.message}`);
    res.status(500).json({ success: false, error: e.message });
  }
});

/**
 * GET /video-factory/jobs/:id
 * Get a specific job
 */
router.get('/jobs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await videoFactory.getJobs({ limit: 1 });

    // Filter by ID (not ideal but simple)
    const { getSupabase } = require('../../core/supabase');
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('video_factory')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    res.json({ success: true, job: data });
  } catch (e) {
    logger.error(`Get job error: ${e.message}`);
    res.status(500).json({ success: false, error: e.message });
  }
});

/**
 * POST /video-factory/process-pending
 * Process all pending jobs
 */
router.post('/process-pending', async (req, res) => {
  try {
    const pending = await videoFactory.getPendingJobs();

    if (!pending.success || !pending.jobs?.length) {
      return res.json({ success: true, message: 'No pending jobs', processed: 0 });
    }

    // Start processing all (async)
    pending.jobs.forEach((job) => {
      videoFactory.processVideoJob(job.id)
        .then((r) => logger.info(`Job ${job.id} processed: ${r.success}`))
        .catch((e) => logger.error(`Job ${job.id} failed: ${e.message}`));
    });

    res.json({
      success: true,
      message: `Processing ${pending.jobs.length} jobs`,
      jobIds: pending.jobs.map((j) => j.id),
    });
  } catch (e) {
    logger.error(`Process pending error: ${e.message}`);
    res.status(500).json({ success: false, error: e.message });
  }
});

/**
 * POST /video-factory/quick
 * Quick create and process in one call
 */
router.post('/quick', async (req, res) => {
  try {
    const {
      productName,
      description,
      scene,
      idealCustomer,
      photoLink,
      videoStyle,
    } = req.body;

    if (!productName) {
      return res.status(400).json({
        success: false,
        error: 'productName is required',
      });
    }

    // Create job first
    const createResult = await videoFactory.createVideoJob({
      productName,
      description,
      scene,
      idealCustomer,
      photoLink,
      videoStyle,
    });

    if (!createResult.success) {
      return res.status(500).json(createResult);
    }

    // Return job ID immediately, process async
    videoFactory.processVideoJob(createResult.job.id)
      .then((r) => logger.info(`Quick job ${createResult.job.id}: ${r.success}`))
      .catch((e) => logger.error(`Quick job failed: ${e.message}`));

    res.json({
      success: true,
      message: 'Video generation started',
      job: createResult.job,
      checkStatus: `/video-factory/jobs/${createResult.job.id}`,
    });
  } catch (e) {
    logger.error(`Quick create error: ${e.message}`);
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
