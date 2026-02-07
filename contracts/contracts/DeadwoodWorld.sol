// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./DeadwoodToken.sol";
import "./DeadwoodCharacters.sol";

/**
 * @title DeadwoodWorld
 * @notice On-chain world state for Deadwood autonomous world
 * @dev Stores locations, events, bounties, and economic state
 */
contract DeadwoodWorld is Ownable, ReentrancyGuard {
    // === Contracts ===
    DeadwoodToken public deadToken;
    DeadwoodCharacters public characters;

    // === World State ===
    uint256 public worldTick;
    uint256 public lastTickTimestamp;
    uint256 public constant TICK_DURATION = 5; // 5 seconds per tick

    // === Locations ===
    struct Location {
        string id;
        string name;
        string description;
        bool exists;
        string[] exits;
    }

    mapping(bytes32 => Location) public locations;
    bytes32[] public locationIds;

    // Character locations (characterId => locationHash)
    mapping(uint256 => bytes32) public characterLocation;

    // === Bounties ===
    struct Bounty {
        uint256 targetCharacterId;
        uint256 reward;
        address poster;
        string reason;
        bool active;
        uint256 createdAt;
        uint256 expiresAt;
    }

    mapping(uint256 => Bounty) public bounties;
    uint256 public nextBountyId = 1;
    uint256[] public activeBountyIds;

    // === World Events (on-chain log) ===
    struct WorldEvent {
        uint256 tick;
        uint256 timestamp;
        string eventType;
        uint256 actorCharacterId;
        bytes32 locationId;
        string data; // JSON or structured data
    }

    WorldEvent[] public worldEvents;
    uint256 public constant MAX_STORED_EVENTS = 1000;

    // === Economics ===
    uint256 public totalGoldInCirculation;
    mapping(uint256 => uint256) public characterGold; // characterId => gold balance

    // === Authorized Backends ===
    mapping(address => bool) public authorizedBackends;

    // === Events ===
    event TickAdvanced(uint256 indexed tick, uint256 timestamp);
    event CharacterMoved(uint256 indexed characterId, bytes32 from, bytes32 to);
    event BountyPosted(uint256 indexed bountyId, uint256 targetCharacterId, uint256 reward);
    event BountyClaimed(uint256 indexed bountyId, uint256 claimerCharacterId);
    event WorldEventLogged(uint256 indexed tick, string eventType, uint256 actorCharacterId);
    event BackendAuthorized(address indexed backend);
    event BackendRevoked(address indexed backend);

    modifier onlyAuthorized() {
        require(authorizedBackends[msg.sender] || msg.sender == owner(), "Not authorized");
        _;
    }

    constructor(address deadToken_, address characters_) Ownable(msg.sender) {
        deadToken = DeadwoodToken(deadToken_);
        characters = DeadwoodCharacters(characters_);
        lastTickTimestamp = block.timestamp;

        // Initialize default locations
        _addLocation("rusty_spur_saloon", "The Rusty Spur Saloon", "A weathered saloon with swinging doors");
        _addLocation("street", "Main Street", "The dusty main thoroughfare of Deadwood");
        _addLocation("jail", "Sheriff's Jail", "A sturdy stone building with iron bars");
    }

    // === Tick Management ===

    /**
     * @notice Advance the world tick (called by authorized backend)
     */
    function advanceTick() external onlyAuthorized {
        require(block.timestamp >= lastTickTimestamp + TICK_DURATION, "Too soon");

        worldTick++;
        lastTickTimestamp = block.timestamp;

        emit TickAdvanced(worldTick, block.timestamp);
    }

    /**
     * @notice Get current tick info
     */
    function getTickInfo() external view returns (
        uint256 currentTick,
        uint256 lastTimestamp,
        uint256 nextTickIn
    ) {
        currentTick = worldTick;
        lastTimestamp = lastTickTimestamp;
        uint256 nextTickTime = lastTickTimestamp + TICK_DURATION;
        nextTickIn = block.timestamp >= nextTickTime ? 0 : nextTickTime - block.timestamp;
    }

    // === Location Management ===

    function _addLocation(
        string memory id,
        string memory name,
        string memory description
    ) internal {
        bytes32 idHash = keccak256(bytes(id));
        require(!locations[idHash].exists, "Location exists");

        locations[idHash] = Location({
            id: id,
            name: name,
            description: description,
            exists: true,
            exits: new string[](0)
        });
        locationIds.push(idHash);
    }

    function addLocation(
        string calldata id,
        string calldata name,
        string calldata description,
        string[] memory exits
    ) external onlyOwner {
        bytes32 idHash = keccak256(bytes(id));
        require(!locations[idHash].exists, "Location exists");

        Location storage loc = locations[idHash];
        loc.id = id;
        loc.name = name;
        loc.description = description;
        loc.exists = true;
        for (uint256 i = 0; i < exits.length; i++) {
            loc.exits.push(exits[i]);
        }
        locationIds.push(idHash);
    }

    function setLocationExits(string calldata id, string[] memory exits) external onlyOwner {
        bytes32 idHash = keccak256(bytes(id));
        require(locations[idHash].exists, "Location not found");
        // Clear existing exits
        delete locations[idHash].exits;
        // Add new exits
        for (uint256 i = 0; i < exits.length; i++) {
            locations[idHash].exits.push(exits[i]);
        }
    }

    // === Character Movement ===

    function moveCharacter(uint256 characterId, string calldata toLocationId) external onlyAuthorized {
        bytes32 toHash = keccak256(bytes(toLocationId));
        require(locations[toHash].exists, "Invalid location");

        bytes32 fromHash = characterLocation[characterId];
        characterLocation[characterId] = toHash;

        emit CharacterMoved(characterId, fromHash, toHash);
    }

    function getCharacterLocation(uint256 characterId) external view returns (string memory) {
        bytes32 locHash = characterLocation[characterId];
        if (locHash == bytes32(0)) return ""; // Not in world yet
        return locations[locHash].id;
    }

    // === Bounty System ===

    /**
     * @notice Post a bounty on a character
     * @param targetCharacterId Character to place bounty on
     * @param reward DEAD tokens as reward
     * @param reason Why the bounty is posted
     * @param durationDays How long the bounty lasts
     */
    function postBounty(
        uint256 targetCharacterId,
        uint256 reward,
        string calldata reason,
        uint256 durationDays
    ) external nonReentrant returns (uint256) {
        require(characters.exists(targetCharacterId), "Character not found");
        require(reward >= 10 * 10**18, "Minimum 10 DEAD");
        require(durationDays >= 1 && durationDays <= 30, "Duration 1-30 days");

        // Transfer reward to contract
        deadToken.transferFrom(msg.sender, address(this), reward);

        uint256 bountyId = nextBountyId++;
        bounties[bountyId] = Bounty({
            targetCharacterId: targetCharacterId,
            reward: reward,
            poster: msg.sender,
            reason: reason,
            active: true,
            createdAt: block.timestamp,
            expiresAt: block.timestamp + (durationDays * 1 days)
        });
        activeBountyIds.push(bountyId);

        emit BountyPosted(bountyId, targetCharacterId, reward);
        return bountyId;
    }

    /**
     * @notice Claim a bounty (called when target is killed)
     */
    function claimBounty(uint256 bountyId, uint256 claimerCharacterId) external onlyAuthorized nonReentrant {
        Bounty storage bounty = bounties[bountyId];
        require(bounty.active, "Bounty not active");
        require(block.timestamp <= bounty.expiresAt, "Bounty expired");

        bounty.active = false;

        // Get claimer's owner address
        DeadwoodCharacters.Character memory claimer = characters.getCharacter(claimerCharacterId);

        // Transfer reward
        deadToken.transfer(claimer.owner, bounty.reward);

        emit BountyClaimed(bountyId, claimerCharacterId);
    }

    function getActiveBounties() external view returns (uint256[] memory) {
        return activeBountyIds;
    }

    // === World Events ===

    function logEvent(
        string calldata eventType,
        uint256 actorCharacterId,
        string calldata locationId,
        string calldata data
    ) external onlyAuthorized {
        bytes32 locHash = keccak256(bytes(locationId));

        // Circular buffer for events
        if (worldEvents.length >= MAX_STORED_EVENTS) {
            // Shift array (expensive but simple)
            for (uint i = 0; i < worldEvents.length - 1; i++) {
                worldEvents[i] = worldEvents[i + 1];
            }
            worldEvents.pop();
        }

        worldEvents.push(WorldEvent({
            tick: worldTick,
            timestamp: block.timestamp,
            eventType: eventType,
            actorCharacterId: actorCharacterId,
            locationId: locHash,
            data: data
        }));

        emit WorldEventLogged(worldTick, eventType, actorCharacterId);
    }

    function getRecentEvents(uint256 count) external view returns (WorldEvent[] memory) {
        uint256 len = worldEvents.length;
        if (count > len) count = len;

        WorldEvent[] memory result = new WorldEvent[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = worldEvents[len - count + i];
        }
        return result;
    }

    // === Economics ===

    function setCharacterGold(uint256 characterId, uint256 amount) external onlyAuthorized {
        uint256 oldAmount = characterGold[characterId];
        characterGold[characterId] = amount;

        // Update circulation tracking
        if (amount > oldAmount) {
            totalGoldInCirculation += (amount - oldAmount);
        } else {
            totalGoldInCirculation -= (oldAmount - amount);
        }
    }

    function transferGold(uint256 fromCharacterId, uint256 toCharacterId, uint256 amount) external onlyAuthorized {
        require(characterGold[fromCharacterId] >= amount, "Insufficient gold");
        characterGold[fromCharacterId] -= amount;
        characterGold[toCharacterId] += amount;
    }

    // === Admin ===

    function authorizeBackend(address backend) external onlyOwner {
        authorizedBackends[backend] = true;
        emit BackendAuthorized(backend);
    }

    function revokeBackend(address backend) external onlyOwner {
        authorizedBackends[backend] = false;
        emit BackendRevoked(backend);
    }

    function setContracts(address deadToken_, address characters_) external onlyOwner {
        deadToken = DeadwoodToken(deadToken_);
        characters = DeadwoodCharacters(characters_);
    }
}
