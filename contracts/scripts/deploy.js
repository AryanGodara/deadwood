const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

  // 1. Deploy DeadwoodToken
  console.log("\n1. Deploying DeadwoodToken...");
  const DeadwoodToken = await ethers.getContractFactory("DeadwoodToken");
  const deadToken = await DeadwoodToken.deploy();
  await deadToken.waitForDeployment();
  const deadTokenAddress = await deadToken.getAddress();
  console.log("   DeadwoodToken deployed to:", deadTokenAddress);

  // 2. Deploy DeadwoodCharacters
  console.log("\n2. Deploying DeadwoodCharacters...");
  const baseUri = "https://deadwood.vercel.app/api/metadata/";
  const DeadwoodCharacters = await ethers.getContractFactory("DeadwoodCharacters");
  const characters = await DeadwoodCharacters.deploy(baseUri);
  await characters.waitForDeployment();
  const charactersAddress = await characters.getAddress();
  console.log("   DeadwoodCharacters deployed to:", charactersAddress);

  // 3. Deploy DeadwoodWorld
  console.log("\n3. Deploying DeadwoodWorld...");
  const DeadwoodWorld = await ethers.getContractFactory("DeadwoodWorld");
  const world = await DeadwoodWorld.deploy(deadTokenAddress, charactersAddress);
  await world.waitForDeployment();
  const worldAddress = await world.getAddress();
  console.log("   DeadwoodWorld deployed to:", worldAddress);

  // 4. Deploy DeadwoodPRGate
  console.log("\n4. Deploying DeadwoodPRGate...");
  const treasury = deployer.address; // Use deployer as treasury initially
  const DeadwoodPRGate = await ethers.getContractFactory("DeadwoodPRGate");
  const prGate = await DeadwoodPRGate.deploy(deadTokenAddress, treasury);
  await prGate.waitForDeployment();
  const prGateAddress = await prGate.getAddress();
  console.log("   DeadwoodPRGate deployed to:", prGateAddress);

  // 5. Configure contracts
  console.log("\n5. Configuring contracts...");

  // Set world contract in characters
  console.log("   Setting world contract in characters...");
  await characters.setWorldContract(worldAddress);

  // Authorize deployer as backend (for testing)
  console.log("   Authorizing deployer as backend...");
  await world.authorizeBackend(deployer.address);

  // Set up location exits
  console.log("   Configuring location exits...");
  await world.setLocationExits("rusty_spur_saloon", ["street"]);
  await world.setLocationExits("street", ["rusty_spur_saloon", "jail"]);
  await world.setLocationExits("jail", ["street"]);

  const networkInfo = await ethers.provider.getNetwork();

  console.log("\n=== Deployment Complete ===");
  console.log({
    network: networkInfo.name,
    chainId: Number(networkInfo.chainId),
    deployer: deployer.address,
    contracts: {
      DeadwoodToken: deadTokenAddress,
      DeadwoodCharacters: charactersAddress,
      DeadwoodWorld: worldAddress,
      DeadwoodPRGate: prGateAddress,
    },
  });

  // Save deployment info
  const deploymentInfo = {
    network: networkInfo.name,
    chainId: Number(networkInfo.chainId),
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    contracts: {
      DeadwoodToken: deadTokenAddress,
      DeadwoodCharacters: charactersAddress,
      DeadwoodWorld: worldAddress,
      DeadwoodPRGate: prGateAddress,
    },
  };

  fs.writeFileSync(
    `deployments-${deploymentInfo.chainId}.json`,
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log(`\nDeployment info saved to deployments-${deploymentInfo.chainId}.json`);

  // Verification commands
  console.log("\n=== Verification Commands ===");
  console.log(`npx hardhat verify --network base ${deadTokenAddress}`);
  console.log(`npx hardhat verify --network base ${charactersAddress} "${baseUri}"`);
  console.log(`npx hardhat verify --network base ${worldAddress} ${deadTokenAddress} ${charactersAddress}`);
  console.log(`npx hardhat verify --network base ${prGateAddress} ${deadTokenAddress} ${treasury}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
