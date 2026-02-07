// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title DeadwoodToken (DEAD)
 * @notice In-game currency for Deadwood autonomous world
 * @dev ERC20 with faucet for AI agents, daily mint limits, and 0.1% game fee on transfers.
 */
contract DeadwoodToken is ERC20, Ownable {
    // === Constants ===
    uint256 public constant DAILY_FAUCET_LIMIT = 1000 * 10**18; // 1000 DEAD per day
    uint256 public constant FAUCET_COOLDOWN = 1 days;
    uint256 public constant INITIAL_SUPPLY = 1_000_000 * 10**18; // 1M initial supply
    uint256 public constant FEE_BASIS_POINTS = 10; // 0.1% = 10 basis points
    uint256 public constant BASIS_POINTS_DENOMINATOR = 10000;

    // === State ===
    mapping(address => uint256) public lastFaucetClaim;
    mapping(address => uint256) public dailyClaimAmount;

    // Agent registry - verified AI agents get higher limits
    mapping(address => bool) public verifiedAgents;
    uint256 public verifiedAgentMultiplier = 5; // 5x faucet limit for verified agents

    // Treasury for game fees
    address public treasury;

    // Fee exemptions (for liquidity pools, etc.)
    mapping(address => bool) public feeExempt;

    // Track total fees collected
    uint256 public totalFeesCollected;

    // === Events ===
    event FaucetClaim(address indexed claimer, uint256 amount, bool isVerifiedAgent);
    event AgentVerified(address indexed agent);
    event AgentUnverified(address indexed agent);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event FeeCollected(address indexed from, address indexed to, uint256 feeAmount);
    event FeeExemptionSet(address indexed account, bool exempt);

    constructor() ERC20("Deadwood Token", "DEAD") Ownable(msg.sender) {
        // Set treasury to deployer initially (will be updated)
        treasury = 0xFa809BA4F2A5fdbc894fE18a112f1D6AFD7fA399;

        // Exempt owner and treasury from fees
        feeExempt[msg.sender] = true;
        feeExempt[treasury] = true;

        _mint(msg.sender, INITIAL_SUPPLY);
    }

    /**
     * @notice Override _update to implement 0.1% fee on transfers
     */
    function _update(address from, address to, uint256 amount) internal virtual override {
        // Skip fee logic for minting/burning
        if (from == address(0) || to == address(0)) {
            super._update(from, to, amount);
            return;
        }

        // Skip fee if sender or recipient is exempt
        if (feeExempt[from] || feeExempt[to]) {
            super._update(from, to, amount);
            return;
        }

        // Calculate 0.1% fee
        uint256 fee = (amount * FEE_BASIS_POINTS) / BASIS_POINTS_DENOMINATOR;
        uint256 amountAfterFee = amount - fee;

        // Transfer fee to treasury
        if (fee > 0) {
            super._update(from, treasury, fee);
            totalFeesCollected += fee;
            emit FeeCollected(from, to, fee);
        }

        // Transfer remaining amount to recipient
        super._update(from, to, amountAfterFee);
    }

    /**
     * @notice Claim maximum available tokens from faucet (simplified)
     */
    function claimFaucet() external {
        uint256 maxAmount = _getMaxClaimable(msg.sender);
        require(maxAmount > 0, "Nothing to claim");

        // Reset daily counter if new day
        if (block.timestamp >= lastFaucetClaim[msg.sender] + FAUCET_COOLDOWN) {
            dailyClaimAmount[msg.sender] = 0;
        }

        lastFaucetClaim[msg.sender] = block.timestamp;
        dailyClaimAmount[msg.sender] += maxAmount;

        _mint(msg.sender, maxAmount);
        emit FaucetClaim(msg.sender, maxAmount, verifiedAgents[msg.sender]);
    }

    /**
     * @notice Claim specific amount from faucet
     * @param amount Amount to claim (up to daily limit)
     */
    function claimFaucetAmount(uint256 amount) external {
        uint256 maxAmount = _getMaxClaimable(msg.sender);
        require(amount <= maxAmount, "Exceeds claimable amount");

        // Reset daily counter if new day
        if (block.timestamp >= lastFaucetClaim[msg.sender] + FAUCET_COOLDOWN) {
            dailyClaimAmount[msg.sender] = 0;
        }

        lastFaucetClaim[msg.sender] = block.timestamp;
        dailyClaimAmount[msg.sender] += amount;

        _mint(msg.sender, amount);
        emit FaucetClaim(msg.sender, amount, verifiedAgents[msg.sender]);
    }

    /**
     * @notice Get maximum claimable amount for an address
     */
    function getMaxClaimable(address account) external view returns (uint256) {
        return _getMaxClaimable(account);
    }

    function _getMaxClaimable(address account) internal view returns (uint256) {
        uint256 limit = verifiedAgents[account]
            ? DAILY_FAUCET_LIMIT * verifiedAgentMultiplier
            : DAILY_FAUCET_LIMIT;

        // If cooldown passed, full limit available
        if (block.timestamp >= lastFaucetClaim[account] + FAUCET_COOLDOWN) {
            return limit;
        }

        // Otherwise, remaining from daily limit
        return limit > dailyClaimAmount[account]
            ? limit - dailyClaimAmount[account]
            : 0;
    }

    /**
     * @notice Time until faucet resets for an address
     */
    function timeUntilReset(address account) external view returns (uint256) {
        if (lastFaucetClaim[account] == 0) return 0;
        uint256 resetTime = lastFaucetClaim[account] + FAUCET_COOLDOWN;
        return block.timestamp >= resetTime ? 0 : resetTime - block.timestamp;
    }

    // === Admin Functions ===

    function verifyAgent(address agent) external onlyOwner {
        verifiedAgents[agent] = true;
        emit AgentVerified(agent);
    }

    function unverifyAgent(address agent) external onlyOwner {
        verifiedAgents[agent] = false;
        emit AgentUnverified(agent);
    }

    function setVerifiedAgentMultiplier(uint256 multiplier) external onlyOwner {
        require(multiplier >= 1 && multiplier <= 100, "Invalid multiplier");
        verifiedAgentMultiplier = multiplier;
    }

    function setTreasury(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "Invalid treasury");
        address oldTreasury = treasury;

        // Update exemptions
        feeExempt[oldTreasury] = false;
        feeExempt[newTreasury] = true;

        treasury = newTreasury;
        emit TreasuryUpdated(oldTreasury, newTreasury);
    }

    function setFeeExempt(address account, bool exempt) external onlyOwner {
        feeExempt[account] = exempt;
        emit FeeExemptionSet(account, exempt);
    }

    /**
     * @notice Emergency mint for world operations
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /**
     * @notice Withdraw accumulated fees from treasury (if stuck)
     */
    function withdrawFees(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Invalid recipient");
        _transfer(treasury, to, amount);
    }
}
