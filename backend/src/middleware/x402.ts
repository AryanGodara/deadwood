import { Request, Response, NextFunction } from 'express';

/**
 * x402 Payment Middleware
 *
 * Implements the x402 protocol for HTTP-native payments.
 * When a protected resource is accessed without payment, returns 402 Payment Required
 * with payment instructions in the PAYMENT-REQUIRED header.
 *
 * Flow:
 * 1. Client requests resource
 * 2. Server checks if payment exists (via smart contract or header)
 * 3. If no payment: return 402 with payment instructions
 * 4. If payment verified: proceed to resource
 *
 * @see https://x402.org
 * @see https://github.com/coinbase/x402
 */

export interface X402Config {
  // Contract address for DeadwoodPRGate on Base
  prGateAddress: string;
  // Chain ID (8453 for Base mainnet, 84532 for Base Sepolia)
  chainId: number;
  // RPC URL for verification
  rpcUrl: string;
  // DEAD token address
  deadTokenAddress: string;
  // Accepted payment schemes
  schemes: ('evm' | 'svm')[];
}

export interface PaymentRequired {
  // Resource being accessed
  resource: string;
  // Payment amount in wei (DEAD tokens)
  amount: string;
  // Payment recipient (treasury)
  recipient: string;
  // Contract to call for payment
  contract: string;
  // Chain ID
  chainId: number;
  // Function to call (ABI encoded)
  method: string;
  // Additional payment options
  options: {
    // Alternative ETH payment amount
    ethAmount?: string;
    // PR type for fee calculation
    prType?: string;
    // Expiry timestamp
    expires?: number;
  };
}

// Default config for Base mainnet (update after deployment)
const defaultConfig: X402Config = {
  prGateAddress: process.env.PR_GATE_ADDRESS || '0x0000000000000000000000000000000000000000',
  chainId: parseInt(process.env.CHAIN_ID || '8453'),
  rpcUrl: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
  deadTokenAddress: process.env.DEAD_TOKEN_ADDRESS || '0x0000000000000000000000000000000000000000',
  schemes: ['evm'],
};

/**
 * PR Types and their fees (must match smart contract)
 */
export const PR_TYPES = {
  FEATURE: { id: 0, deadFee: '100000000000000000000', ethFee: '1000000000000000' }, // 100 DEAD, 0.001 ETH
  LOCATION: { id: 1, deadFee: '50000000000000000000', ethFee: '500000000000000' },  // 50 DEAD, 0.0005 ETH
  CHARACTER: { id: 2, deadFee: '75000000000000000000', ethFee: '750000000000000' }, // 75 DEAD, 0.00075 ETH
  ITEM: { id: 3, deadFee: '25000000000000000000', ethFee: '250000000000000' },      // 25 DEAD, 0.00025 ETH
  RULE_CHANGE: { id: 4, deadFee: '200000000000000000000', ethFee: '2000000000000000' }, // 200 DEAD, 0.002 ETH
  BUGFIX: { id: 5, deadFee: '0', ethFee: '0' }, // Free
} as const;

/**
 * Create x402 payment middleware for PR submissions
 */
export function x402PRPaymentMiddleware(config: Partial<X402Config> = {}) {
  const cfg = { ...defaultConfig, ...config };

  return async (req: Request, res: Response, next: NextFunction) => {
    // Check for payment signature in header
    const paymentSignature = req.headers['payment-signature'] as string;
    const prIdentifier = req.body?.prIdentifier || req.query?.prIdentifier;
    const prType = (req.body?.prType || req.query?.prType || 'FEATURE') as keyof typeof PR_TYPES;

    if (!prIdentifier) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'MISSING_PR_IDENTIFIER',
          message: 'PR identifier required',
        },
      });
    }

    // If payment signature provided, verify it
    if (paymentSignature) {
      try {
        const isValid = await verifyPayment(cfg, prIdentifier, paymentSignature);
        if (isValid) {
          return next();
        }
      } catch (error) {
        console.error('Payment verification failed:', error);
      }
    }

    // Check if PR is already paid (via smart contract)
    try {
      const isPaid = await checkPRPaid(cfg, prIdentifier);
      if (isPaid) {
        return next();
      }
    } catch (error) {
      console.error('PR payment check failed:', error);
    }

    // Return 402 Payment Required
    const prTypeConfig = PR_TYPES[prType] || PR_TYPES.FEATURE;

    const paymentRequired: PaymentRequired = {
      resource: req.originalUrl,
      amount: prTypeConfig.deadFee,
      recipient: cfg.prGateAddress,
      contract: cfg.prGateAddress,
      chainId: cfg.chainId,
      method: 'payForPRWithDEAD(uint8,string,string)',
      options: {
        ethAmount: prTypeConfig.ethFee,
        prType: prType,
        expires: Math.floor(Date.now() / 1000) + 3600, // 1 hour
      },
    };

    res.setHeader('PAYMENT-REQUIRED', JSON.stringify(paymentRequired));
    res.setHeader('X-Payment-Schemes', cfg.schemes.join(','));
    res.setHeader('X-Payment-Chain-Id', cfg.chainId.toString());
    res.setHeader('X-Payment-Contract', cfg.prGateAddress);

    return res.status(402).json({
      ok: false,
      error: {
        code: 'PAYMENT_REQUIRED',
        message: 'Payment required to submit PR',
        payment: paymentRequired,
      },
    });
  };
}

/**
 * Verify payment signature (x402 standard)
 */
async function verifyPayment(
  config: X402Config,
  prIdentifier: string,
  paymentSignature: string
): Promise<boolean> {
  // In production, this would:
  // 1. Decode the payment signature
  // 2. Verify it against the smart contract
  // 3. Check that the payment covers the required amount
  // 4. Optionally call a facilitator's /verify endpoint

  // For now, we check the smart contract directly
  return checkPRPaid(config, prIdentifier);
}

/**
 * Check if PR has been paid via smart contract
 */
async function checkPRPaid(config: X402Config, prIdentifier: string): Promise<boolean> {
  // Skip check if contract not deployed
  if (config.prGateAddress === '0x0000000000000000000000000000000000000000') {
    console.warn('PR Gate contract not configured, skipping payment check');
    return true; // Allow through in development
  }

  try {
    // In production, use ethers to call the contract
    // const provider = new ethers.JsonRpcProvider(config.rpcUrl);
    // const contract = new ethers.Contract(config.prGateAddress, PR_GATE_ABI, provider);
    // return await contract.isPRPaid(prIdentifier);

    // Suppress unused variable warning
    void prIdentifier;

    // For now, return false to require payment
    return false;
  } catch (err) {
    console.error('Failed to check PR payment:', err);
    return false;
  }
}

/**
 * Middleware to verify agent wallet for x402 payments
 */
export function x402AgentVerification() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const agentAddress = req.headers['x-agent-address'] as string;

    if (!agentAddress) {
      res.status(401).json({
        ok: false,
        error: {
          code: 'AGENT_ADDRESS_REQUIRED',
          message: 'Agent wallet address required for x402 payments',
        },
      });
      return;
    }

    // Attach agent address to request for downstream use
    (req as any).agentAddress = agentAddress;
    next();
  };
}

export default x402PRPaymentMiddleware;
