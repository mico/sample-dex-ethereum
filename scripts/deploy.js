// scripts/deploy-simple.js - A simplified version that should work with most ethers versions
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  
  console.log("Deploying WETH9...");
  const WETH = await hre.ethers.getContractFactory("WETH9");
  const weth = await WETH.deploy();
  
  // Wait for deployment
  await weth.waitForDeployment();
  var wethAddress = await weth.getAddress();
  console.log("WETH deployed to:", wethAddress);

  
  // Deploy TokenB
  console.log("Deploying Token ABC...");
  const TokenB = await hre.ethers.getContractFactory("TestToken");
  const tokenB = await TokenB.deploy("Token ABC", "ABC", 18);
  
  // Wait for TokenB to be mined
  await tokenB.waitForDeployment();
  const tokenBAddress = tokenB.address || await tokenB.getAddress();
  console.log("Token ABC deployed to:", tokenBAddress);
  
  // Deploy DEX
  console.log("Deploying SimpleDEX...");
  const SimpleDEX = await hre.ethers.getContractFactory("SimpleDEX");
  const dex = await SimpleDEX.deploy(wethAddress, tokenBAddress);
  
  // Wait for DEX to be mined
  await dex.waitForDeployment();
  const dexAddress = dex.address || await dex.getAddress();
  console.log("SimpleDEX deployed to:", dexAddress);
  
  // Mint tokens
  try {
    console.log("Minting test tokens...");
    const mintAmount = hre.ethers.utils?.parseEther 
      ? hre.ethers.utils.parseEther("1000") 
      : hre.ethers.parseEther("1000");
    
    await tokenB.mint(deployer.address, mintAmount);
    console.log("Minted tokens successfully");
  } catch (error) {
    console.error("Error minting tokens:", error.message);
  }
  
  // Save addresses
  const fs = require("fs");
  const contractAddresses = {
    dex: dexAddress,
    weth: wethAddress,
    tokenB: tokenBAddress
  };
  
  fs.writeFileSync(
    "contract-addresses.json",
    JSON.stringify(contractAddresses, null, 2)
  );
  
  console.log("Contract addresses saved to contract-addresses.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });