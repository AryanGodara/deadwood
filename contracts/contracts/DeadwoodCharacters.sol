// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title DeadwoodCharacters
 * @notice ERC1155 multi-token for Deadwood characters and roles
 * @dev Token ID structure:
 *      - IDs 1-100: Role types (fungible, multiple characters can be same role)
 *      - IDs 1001+: Unique character NFTs (non-fungible, 1 supply each)
 */
contract DeadwoodCharacters is ERC1155, ERC1155Supply, Ownable {
    using Strings for uint256;

    // === Role Token IDs (1-100) ===
    uint256 public constant ROLE_STRANGER = 1;
    uint256 public constant ROLE_GUNSLINGER = 2;
    uint256 public constant ROLE_BOUNTY_HUNTER = 3;
    uint256 public constant ROLE_OUTLAW = 4;
    uint256 public constant ROLE_BUSINESSMAN = 5;
    uint256 public constant ROLE_TOWN_FOLK = 6;
    uint256 public constant ROLE_DOCTOR = 7;
    uint256 public constant ROLE_PREACHER = 8;
    uint256 public constant ROLE_SHERIFF = 9;
    uint256 public constant ROLE_BARTENDER = 10;
    uint256 public constant ROLE_PIANO_MAN = 11;
    uint256 public constant ROLE_MADAM = 12;

    // === Character NFT IDs start at 1001 ===
    uint256 public constant CHARACTER_ID_START = 1001;
    uint256 public nextCharacterId = CHARACTER_ID_START;

    // === Character Data ===
    struct Character {
        string name;
        uint256 roleId;
        address owner;
        bool isAlive;
        uint256 createdAt;
        uint256 diedAt;
        string metadataURI; // IPFS or custom URI for character-specific metadata
    }

    mapping(uint256 => Character) public characters;
    mapping(string => uint256) public characterNameToId; // Ensure unique names
    mapping(address => uint256[]) public ownerCharacters;

    // === Role metadata ===
    mapping(uint256 => string) public roleNames;
    mapping(uint256 => string) public roleDescriptions;

    // World contract that can update character state
    address public worldContract;

    // === Events ===
    event CharacterCreated(
        uint256 indexed tokenId,
        string name,
        uint256 roleId,
        address indexed owner
    );
    event CharacterDied(uint256 indexed tokenId, string causeOfDeath);
    event WorldContractUpdated(address indexed newWorld);

    constructor(string memory baseUri) ERC1155(baseUri) Ownable(msg.sender) {
        // Initialize role names
        roleNames[ROLE_STRANGER] = "Stranger";
        roleNames[ROLE_GUNSLINGER] = "Gunslinger";
        roleNames[ROLE_BOUNTY_HUNTER] = "Bounty Hunter";
        roleNames[ROLE_OUTLAW] = "Outlaw";
        roleNames[ROLE_BUSINESSMAN] = "Businessman";
        roleNames[ROLE_TOWN_FOLK] = "Town Folk";
        roleNames[ROLE_DOCTOR] = "Doctor";
        roleNames[ROLE_PREACHER] = "Preacher";
        roleNames[ROLE_SHERIFF] = "Sheriff";
        roleNames[ROLE_BARTENDER] = "Bartender";
        roleNames[ROLE_PIANO_MAN] = "Piano Man";
        roleNames[ROLE_MADAM] = "Madam";
    }

    // === Character Creation ===

    /**
     * @notice Create a new character NFT
     * @param name Unique character name
     * @param roleId Role type (1-12)
     * @param metadataURI Optional custom metadata URI
     */
    function createCharacter(
        string calldata name,
        uint256 roleId,
        string calldata metadataURI
    ) external returns (uint256) {
        require(bytes(name).length > 0 && bytes(name).length <= 32, "Invalid name length");
        require(roleId >= 1 && roleId <= 12, "Invalid role");
        require(characterNameToId[name] == 0, "Name taken");

        uint256 characterId = nextCharacterId++;

        characters[characterId] = Character({
            name: name,
            roleId: roleId,
            owner: msg.sender,
            isAlive: true,
            createdAt: block.timestamp,
            diedAt: 0,
            metadataURI: metadataURI
        });

        characterNameToId[name] = characterId;
        ownerCharacters[msg.sender].push(characterId);

        // Mint the character NFT (supply of 1)
        _mint(msg.sender, characterId, 1, "");

        // Also mint the role token (fungible)
        _mint(msg.sender, roleId, 1, "");

        emit CharacterCreated(characterId, name, roleId, msg.sender);
        return characterId;
    }

    /**
     * @notice Mark a character as dead (only world contract or owner)
     */
    function killCharacter(uint256 characterId, string calldata causeOfDeath) external {
        require(
            msg.sender == worldContract || msg.sender == owner(),
            "Not authorized"
        );
        require(characters[characterId].isAlive, "Already dead");

        characters[characterId].isAlive = false;
        characters[characterId].diedAt = block.timestamp;

        emit CharacterDied(characterId, causeOfDeath);
    }

    // === View Functions ===

    function getCharacter(uint256 characterId) external view returns (Character memory) {
        return characters[characterId];
    }

    function getCharacterByName(string calldata name) external view returns (uint256, Character memory) {
        uint256 id = characterNameToId[name];
        require(id != 0, "Character not found");
        return (id, characters[id]);
    }

    function getOwnerCharacters(address owner_) external view returns (uint256[] memory) {
        return ownerCharacters[owner_];
    }

    function isRoleToken(uint256 tokenId) public pure returns (bool) {
        return tokenId >= 1 && tokenId <= 100;
    }

    function isCharacterToken(uint256 tokenId) public pure returns (bool) {
        return tokenId >= CHARACTER_ID_START;
    }

    /**
     * @notice Get metadata URI for a token
     */
    function uri(uint256 tokenId) public view override returns (string memory) {
        if (isCharacterToken(tokenId)) {
            // Character-specific metadata
            string memory customUri = characters[tokenId].metadataURI;
            if (bytes(customUri).length > 0) {
                return customUri;
            }
        }
        // Fall back to base URI + token ID
        return string(abi.encodePacked(super.uri(tokenId), tokenId.toString(), ".json"));
    }

    // === Admin Functions ===

    function setWorldContract(address world_) external onlyOwner {
        worldContract = world_;
        emit WorldContractUpdated(world_);
    }

    function setURI(string memory newuri) external onlyOwner {
        _setURI(newuri);
    }

    function setRoleMetadata(uint256 roleId, string calldata name, string calldata description) external onlyOwner {
        require(roleId >= 1 && roleId <= 100, "Invalid role ID");
        roleNames[roleId] = name;
        roleDescriptions[roleId] = description;
    }

    // === Overrides ===

    function _update(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values
    ) internal override(ERC1155, ERC1155Supply) {
        super._update(from, to, ids, values);
    }
}
