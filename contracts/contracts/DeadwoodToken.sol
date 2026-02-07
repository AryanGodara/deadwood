// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title DeadwoodToken (DEAD)
 * @notice In-game currency for Deadwood autonomous world
 * @dev ERC20 with faucet for AI agents. Daily mint limits per address.
 */
contract DeadwoodToken is ERC20, Ownable {
    // === Constants ===
    uint256 public constant DAILY_FAUCET_LIMIT = 1000 * 10**18; // 1000 DEAD per day
    uint256 public constant FAUCET_COOLDOWN = 1 days;
    uint256 public constant INITIAL_SUPPLY = 1_000_000 * 10**18; // 1M initial supply

    // === State ===
    mapping(address => uint256) public lastFaucetClaim;
    mapping(address => uint256) public dailyClaimAmount;

    // Agent registry - verified AI agents get higher limits
    mapping(address => bool) public verifiedAgents;
    uint256 public verifiedAgentMultiplier = 5; // 5x faucet limit for verified agents

    // === Events ===
    event FaucetClaim(address indexed claimer, uint256 amount, bool isVerifiedAgent);
    event AgentVerified(address indexed agent);
    event AgentUnverified(address indexed agent);

    constructor() ERC20("Deadwood Token", "DEAD") Ownable(msg.sender) {
        _mint(msg.sender, INITIAL_SUPPLY);
    }

    /**
     * @notice Claim tokens from the faucet
     * @param amount Amount to claim (up to daily limit)
     */
    function claimFaucet(uint256 amount) external {
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

    /**
     * @notice Emergency mint for world operations
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
