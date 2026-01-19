/**
 * ATLAS Gateway - API Routes
 * Endpoints for Dashboard and external integrations
 *
 * @module src/gateway/routes/api
 */
const express = require('express');
const router = express.Router();

const logger = require('../../core/logger').child('API');
const { getSupabase } = require('../../core/supabase');
const { publishEvent, EVENT_TYPES, getRecentEvents } = require('../../core/event-bus');

// In-memory job storage (will be migrated to DB later)
const jobs = new Map();

/**
 * GET /api/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

/**
 * GET /api/agents
 * List all registered agents and their status
 */
router.get('/agents', async (req, res) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .order('name');

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    res.json({ success: true, agents: data });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

/**
 * GET /api/events
 * Get recent events for monitoring
 */
router.get('/events', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const agentId = req.query.agent || null;

    const result = await getRecentEvents(limit, agentId);

    if (!result.success) {
      return res.status(500).json({ success: false, error: result.error });
    }

    res.json({ success: true, events: result.data });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

/**
 * GET /api/leads
 * Get all leads with optional status filter
 */
router.get('/leads', async (req, res) => {
  try {
    const supabase = getSupabase();
    const status = req.query.status;

    let query = supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query.limit(100);

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    res.json({ success: true, leads: data });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

/**
 * GET /api/leads/:id/conversations
 * Get conversation history for a specific lead
 */
router.get('/leads/:id/conversations', async (req, res) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('lead_id', req.params.id)
      .order('created_at', { ascending: true });

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    res.json({ success: true, conversations: data });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

/**
 * POST /api/video/start
 * Start a video generation job
 */
router.post('/video/start', async (req, res) => {
  try {
    const { title, idea, image } = req.body;

    if (!title && !idea) {
      return res.status(400).json({ success: false, error: 'Title or idea required' });
    }

    const jobId = Date.now().toString();
    logger.info(`Video job ${jobId} started: ${title || idea}`);

    // Store initial job state
    jobs.set(jobId, {
      status: 'processing',
      steps: ['Iniciando...'],
      result: null,
      createdAt: new Date().toISOString(),
    });

    // Publish event for Marcus (Marketing agent)
    await publishEvent(
      EVENT_TYPES.VIDEO_REQUESTED,
      'gateway',
      { jobId, title, idea, image },
      'marcus'
    );

    // Fire and forget - start video generation
    (async () => {
      try {
        const { generateViralVideo } = require('../../../video_engine');
        const result = await generateViralVideo(title, idea, image);

        jobs.set(jobId, {
          status: 'completed',
          steps: ['Done'],
          result,
          completedAt: new Date().toISOString(),
        });

        // Publish completion event
        await publishEvent(
          EVENT_TYPES.VIDEO_COMPLETED,
          'marcus',
          { jobId, result },
          null
        );

        logger.info(`Video job ${jobId} completed`);
      } catch (error) {
        logger.error(`Video job ${jobId} failed:`, error);
        jobs.set(jobId, {
          status: 'failed',
          error: error.message,
          failedAt: new Date().toISOString(),
        });

        await publishEvent(
          EVENT_TYPES.VIDEO_FAILED,
          'marcus',
          { jobId, error: error.message },
          null
        );
      }
    })();

    res.json({ success: true, jobId });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

/**
 * GET /api/video/status/:id
 * Get status of a video generation job
 */
router.get('/video/status/:id', (req, res) => {
  const job = jobs.get(req.params.id);

  if (!job) {
    return res.status(404).json({ success: false, error: 'Job not found' });
  }

  res.json({ success: true, job });
});

/**
 * GET /api/video/jobs
 * List all video jobs (for dashboard)
 */
router.get('/video/jobs', async (req, res) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('video_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    res.json({ success: true, jobs: data });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

/**
 * POST /api/supervisor/train
 * Trigger supervisor training review
 */
router.post('/supervisor/train', async (req, res) => {
  try {
    const { phone } = req.body;
    logger.info(`Supervisor invoked for: ${phone || 'Latest chat'}`);

    const { exec } = require('child_process');
    const path = require('path');
    const scriptPath = path.join(__dirname, '..', '..', '..', 'agents', 'supervisor.js');
    const cmd = `node "${scriptPath}" ${phone || ''}`;

    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        logger.error(`Supervisor error: ${error.message}`);
        return res.json({ success: false, error: error.message });
      }

      const approved = stdout.includes('Estado: APROBADO');
      const improving = stdout.includes('Estado: MEJORAR');

      res.json({
        success: true,
        status: approved ? 'APROBADO' : (improving ? 'MEJORANDO' : 'UNKNOWN'),
        logs: stdout,
      });
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

/**
 * GET /api/prices
 * Get service prices (for dashboard data viewer)
 */
router.get('/prices', async (req, res) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('service_prices')
      .select('*')
      .order('make', { ascending: true });

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    res.json({ success: true, prices: data });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

/**
 * GET /api/price-requests
 * Get pending price requests
 */
router.get('/price-requests', async (req, res) => {
  try {
    const supabase = getSupabase();
    const status = req.query.status || 'pending';

    const { data, error } = await supabase
      .from('price_requests')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    res.json({ success: true, requests: data });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

/**
 * GET /api/scheduled-jobs
 * Get scheduled jobs for Diego (Operations)
 */
router.get('/scheduled-jobs', async (req, res) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('scheduled_jobs')
      .select('*')
      .order('scheduled_for', { ascending: true });

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    res.json({ success: true, jobs: data });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
