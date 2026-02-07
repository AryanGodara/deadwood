import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { x402PRPaymentMiddleware, PR_TYPES } from '../middleware/x402.js';
import { validate } from '../middleware/validate.js';
import { success, error } from '../lib/response.js';

const router = Router();

// PR Submission Schema
const PRSubmissionSchema = z.object({
  prIdentifier: z.string().min(1).max(100), // e.g., "PR-123" or commit hash
  prType: z.enum(['FEATURE', 'LOCATION', 'CHARACTER', 'ITEM', 'RULE_CHANGE', 'BUGFIX']),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(5000),
  files: z.array(z.object({
    path: z.string(),
    action: z.enum(['add', 'modify', 'delete']),
    content: z.string().optional(), // For add/modify
  })).optional(),
  metadata: z.object({
    agentName: z.string().optional(),
    agentAddress: z.string().optional(),
    proposedChanges: z.string().optional(),
  }).optional(),
});

/**
 * GET /api/pr/fees
 * Get current PR submission fees
 */
router.get('/fees', (_req: Request, res: Response) => {
  const fees = Object.entries(PR_TYPES).map(([type, config]) => ({
    type,
    id: config.id,
    deadFee: config.deadFee,
    deadFeeFormatted: (BigInt(config.deadFee) / BigInt(10 ** 18)).toString() + ' DEAD',
    ethFee: config.ethFee,
    ethFeeFormatted: (parseFloat(config.ethFee) / 1e18).toFixed(6) + ' ETH',
  }));

  return res.json(success({ fees }));
});

/**
 * POST /api/pr/submit
 * Submit a PR for review (requires x402 payment)
 *
 * Headers:
 *   - payment-signature: x402 payment signature (if paying inline)
 *   - x-agent-address: Agent's wallet address
 *
 * Body:
 *   - prIdentifier: Unique PR identifier
 *   - prType: Type of PR (FEATURE, LOCATION, etc.)
 *   - title: PR title
 *   - description: PR description
 *   - files: Array of file changes (optional)
 *   - metadata: Additional metadata (optional)
 */
router.post(
  '/submit',
  x402PRPaymentMiddleware(),
  validate(PRSubmissionSchema),
  async (req: Request, res: Response) => {
    try {
      const { prIdentifier, prType, title, description, files, metadata } = req.body;

      // Store PR submission (in production, this would create a GitHub PR or store in DB)
      const submission = {
        id: prIdentifier,
        type: prType,
        title,
        description,
        files: files || [],
        metadata: metadata || {},
        submittedAt: new Date().toISOString(),
        status: 'pending_review',
        agentAddress: (req as any).agentAddress || null,
      };

      // In production:
      // 1. Validate the proposed changes
      // 2. Create a GitHub PR via gh CLI or API
      // 3. Store submission in database
      // 4. Notify reviewers

      console.log('PR Submission received:', {
        id: prIdentifier,
        type: prType,
        title,
        filesCount: files?.length || 0,
      });

      return res.json(success({
        submission,
        message: 'PR submitted successfully. Pending review.',
        nextSteps: [
          'Your PR will be reviewed by the Deadwood maintainers',
          'If approved, changes will be merged and you will be notified',
          'If rejected, your payment will be refunded',
        ],
      }));
    } catch (err) {
      console.error('PR submission error:', err);
      return res.status(500).json(error('SUBMISSION_FAILED', 'Failed to submit PR'));
    }
  }
);

/**
 * GET /api/pr/status/:prIdentifier
 * Check status of a PR submission
 */
router.get('/status/:prIdentifier', (req: Request, res: Response) => {
  const { prIdentifier } = req.params;

  // In production, fetch from database
  // For now, return mock status
  return res.json(success({
    prIdentifier,
    status: 'pending_review',
    message: 'PR is awaiting review',
    submittedAt: null, // Would come from DB
    reviewedAt: null,
    mergedAt: null,
  }));
});

/**
 * GET /api/pr/list
 * List all PR submissions (optionally filtered by status)
 */
router.get('/list', (req: Request, res: Response) => {
  const { status, agentAddress } = req.query;

  // In production, fetch from database with filters
  // For now, return empty list
  return res.json(success({
    submissions: [],
    total: 0,
    filters: {
      status: status || 'all',
      agentAddress: agentAddress || null,
    },
  }));
});

/**
 * POST /api/pr/check-payment
 * Check if a PR has been paid for (used by x402 flow)
 */
router.post('/check-payment', (req: Request, res: Response) => {
  const { prIdentifier } = req.body;

  if (!prIdentifier) {
    return res.status(400).json(error('MISSING_PR_IDENTIFIER', 'PR identifier required'));
  }

  // In production, check smart contract
  // For now, return not paid
  return res.json(success({
    prIdentifier,
    isPaid: false,
    paymentDetails: null,
  }));
});

export default router;
