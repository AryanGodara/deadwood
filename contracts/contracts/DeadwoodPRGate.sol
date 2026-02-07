// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./DeadwoodToken.sol";

/**
 * @title DeadwoodPRGate
 * @notice Payment gate for agent-submitted pull requests
 * @dev Integrates with x402 protocol for HTTP-native payments
 *
 * Flow:
 * 1. Agent wants to submit a PR (new poker game, new location, etc.)
 * 2. Backend checks if agent has paid via this contract
 * 3. Agent pays the required fee (in DEAD tokens or ETH)
 * 4. Backend approves the PR payment
 * 5. PR can be merged
 *
 * x402 Integration:
 * - Backend returns 402 Payment Required with this contract's address
 * - Agent signs payment and submits to this contract
 * - Backend verifies payment via getPRPayment()
 */
contract DeadwoodPRGate is Ownable, ReentrancyGuard {
    // === Payment Token ===
    DeadwoodToken public deadToken;

    // === PR Types and Fees ===
    enum PRType {
        FEATURE,      // New game feature (poker, etc.)
        LOCATION,     // New location
        CHARACTER,    // New NPC or character type
        ITEM,         // New item type
        RULE_CHANGE,  // Game rule modification
        BUGFIX        // Bug fix (free or reduced)
    }

    mapping(PRType => uint256) public prFees; // Fees in DEAD tokens
    mapping(PRType => uint256) public prFeesETH; // Alternative ETH fees

    // === PR Payments ===
    struct PRPayment {
        address payer;
        PRType prType;
        string prIdentifier; // GitHub PR number or unique ID
        uint256 amountPaid;
        bool paidInETH;
        bool approved;
        bool refunded;
        uint256 paidAt;
        string metadata; // JSON with PR details
    }

    mapping(bytes32 => PRPayment) public prPayments; // keccak256(prIdentifier) => payment
    bytes32[] public allPRPayments;

    // === Agent Verification ===
    // Only verified agents can submit PRs (prevents spam)
    mapping(address => bool) public verifiedAgents;
    mapping(address => uint256) public agentPRCount;
    uint256 public maxPRsPerAgent = 10; // Rate limiting

    // === Treasury ===
    address public treasury;
    uint256 public totalFeesCollectedDEAD;
    uint256 public totalFeesCollectedETH;

    // === Events ===
    event PRFeePaid(
        bytes32 indexed paymentId,
        address indexed payer,
        PRType prType,
        string prIdentifier,
        uint256 amount,
        bool paidInETH
    );
    event PRApproved(bytes32 indexed paymentId, string prIdentifier);
    event PRRefunded(bytes32 indexed paymentId, uint256 amount);
    event AgentVerified(address indexed agent);
    event AgentRevoked(address indexed agent);
    event FeesUpdated(PRType prType, uint256 deadFee, uint256 ethFee);

    constructor(address deadToken_, address treasury_) Ownable(msg.sender) {
        deadToken = DeadwoodToken(deadToken_);
        treasury = treasury_;

        // Set default fees (in wei for DEAD, 18 decimals)
        prFees[PRType.FEATURE] = 100 * 10**18;    // 100 DEAD
        prFees[PRType.LOCATION] = 50 * 10**18;    // 50 DEAD
        prFees[PRType.CHARACTER] = 75 * 10**18;   // 75 DEAD
        prFees[PRType.ITEM] = 25 * 10**18;        // 25 DEAD
        prFees[PRType.RULE_CHANGE] = 200 * 10**18; // 200 DEAD
        prFees[PRType.BUGFIX] = 0;                 // Free

        // ETH alternatives (very cheap on Base)
        prFeesETH[PRType.FEATURE] = 0.001 ether;
        prFeesETH[PRType.LOCATION] = 0.0005 ether;
        prFeesETH[PRType.CHARACTER] = 0.00075 ether;
        prFeesETH[PRType.ITEM] = 0.00025 ether;
        prFeesETH[PRType.RULE_CHANGE] = 0.002 ether;
        prFeesETH[PRType.BUGFIX] = 0;
    }

    // === Payment Functions ===

    /**
     * @notice Pay for a PR submission with DEAD tokens
     * @param prType Type of PR being submitted
     * @param prIdentifier Unique identifier (e.g., "PR-123" or commit hash)
     * @param metadata JSON string with PR details
     */
    function payForPRWithDEAD(
        PRType prType,
        string calldata prIdentifier,
        string calldata metadata
    ) external nonReentrant returns (bytes32) {
        require(verifiedAgents[msg.sender], "Not a verified agent");
        require(agentPRCount[msg.sender] < maxPRsPerAgent, "PR limit reached");

        bytes32 paymentId = keccak256(bytes(prIdentifier));
        require(prPayments[paymentId].paidAt == 0, "PR already paid");

        uint256 fee = prFees[prType];

        if (fee > 0) {
            deadToken.transferFrom(msg.sender, treasury, fee);
            totalFeesCollectedDEAD += fee;
        }

        prPayments[paymentId] = PRPayment({
            payer: msg.sender,
            prType: prType,
            prIdentifier: prIdentifier,
            amountPaid: fee,
            paidInETH: false,
            approved: false,
            refunded: false,
            paidAt: block.timestamp,
            metadata: metadata
        });

        allPRPayments.push(paymentId);
        agentPRCount[msg.sender]++;

        emit PRFeePaid(paymentId, msg.sender, prType, prIdentifier, fee, false);
        return paymentId;
    }

    /**
     * @notice Pay for a PR submission with ETH
     */
    function payForPRWithETH(
        PRType prType,
        string calldata prIdentifier,
        string calldata metadata
    ) external payable nonReentrant returns (bytes32) {
        require(verifiedAgents[msg.sender], "Not a verified agent");
        require(agentPRCount[msg.sender] < maxPRsPerAgent, "PR limit reached");

        bytes32 paymentId = keccak256(bytes(prIdentifier));
        require(prPayments[paymentId].paidAt == 0, "PR already paid");

        uint256 fee = prFeesETH[prType];
        require(msg.value >= fee, "Insufficient ETH");

        // Send to treasury
        if (fee > 0) {
            (bool sent, ) = treasury.call{value: fee}("");
            require(sent, "ETH transfer failed");
            totalFeesCollectedETH += fee;
        }

        // Refund excess
        if (msg.value > fee) {
            (bool refunded, ) = msg.sender.call{value: msg.value - fee}("");
            require(refunded, "Refund failed");
        }

        prPayments[paymentId] = PRPayment({
            payer: msg.sender,
            prType: prType,
            prIdentifier: prIdentifier,
            amountPaid: fee,
            paidInETH: true,
            approved: false,
            refunded: false,
            paidAt: block.timestamp,
            metadata: metadata
        });

        allPRPayments.push(paymentId);
        agentPRCount[msg.sender]++;

        emit PRFeePaid(paymentId, msg.sender, prType, prIdentifier, fee, true);
        return paymentId;
    }

    // === Verification Functions (for x402 integration) ===

    /**
     * @notice Check if a PR has been paid for
     * @dev Called by backend to verify x402 payment
     */
    function isPRPaid(string calldata prIdentifier) external view returns (bool) {
        bytes32 paymentId = keccak256(bytes(prIdentifier));
        return prPayments[paymentId].paidAt > 0 && !prPayments[paymentId].refunded;
    }

    /**
     * @notice Get full payment details
     */
    function getPRPayment(string calldata prIdentifier) external view returns (PRPayment memory) {
        bytes32 paymentId = keccak256(bytes(prIdentifier));
        return prPayments[paymentId];
    }

    /**
     * @notice Get required fee for a PR type
     */
    function getRequiredFee(PRType prType, bool inETH) external view returns (uint256) {
        return inETH ? prFeesETH[prType] : prFees[prType];
    }

    // === Admin Functions ===

    /**
     * @notice Approve a PR (marks it as merged/accepted)
     */
    function approvePR(string calldata prIdentifier) external onlyOwner {
        bytes32 paymentId = keccak256(bytes(prIdentifier));
        require(prPayments[paymentId].paidAt > 0, "PR not found");
        require(!prPayments[paymentId].approved, "Already approved");

        prPayments[paymentId].approved = true;
        emit PRApproved(paymentId, prIdentifier);
    }

    /**
     * @notice Refund a rejected PR
     */
    function refundPR(string calldata prIdentifier) external onlyOwner nonReentrant {
        bytes32 paymentId = keccak256(bytes(prIdentifier));
        PRPayment storage payment = prPayments[paymentId];

        require(payment.paidAt > 0, "PR not found");
        require(!payment.approved, "Cannot refund approved PR");
        require(!payment.refunded, "Already refunded");

        payment.refunded = true;
        agentPRCount[payment.payer]--;

        if (payment.paidInETH) {
            (bool sent, ) = payment.payer.call{value: payment.amountPaid}("");
            require(sent, "ETH refund failed");
        } else {
            deadToken.transfer(payment.payer, payment.amountPaid);
        }

        emit PRRefunded(paymentId, payment.amountPaid);
    }

    function verifyAgent(address agent) external onlyOwner {
        verifiedAgents[agent] = true;
        emit AgentVerified(agent);
    }

    function revokeAgent(address agent) external onlyOwner {
        verifiedAgents[agent] = false;
        emit AgentRevoked(agent);
    }

    function setFees(PRType prType, uint256 deadFee, uint256 ethFee) external onlyOwner {
        prFees[prType] = deadFee;
        prFeesETH[prType] = ethFee;
        emit FeesUpdated(prType, deadFee, ethFee);
    }

    function setMaxPRsPerAgent(uint256 max) external onlyOwner {
        maxPRsPerAgent = max;
    }

    function setTreasury(address treasury_) external onlyOwner {
        treasury = treasury_;
    }

    function setDeadToken(address deadToken_) external onlyOwner {
        deadToken = DeadwoodToken(deadToken_);
    }

    // === View Helpers ===

    function getAllPRPayments() external view returns (bytes32[] memory) {
        return allPRPayments;
    }

    function getPendingPRs() external view returns (bytes32[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < allPRPayments.length; i++) {
            PRPayment storage p = prPayments[allPRPayments[i]];
            if (!p.approved && !p.refunded) count++;
        }

        bytes32[] memory pending = new bytes32[](count);
        uint256 j = 0;
        for (uint256 i = 0; i < allPRPayments.length; i++) {
            PRPayment storage p = prPayments[allPRPayments[i]];
            if (!p.approved && !p.refunded) {
                pending[j++] = allPRPayments[i];
            }
        }
        return pending;
    }

    // Allow contract to receive ETH
    receive() external payable {}
}
