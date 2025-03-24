// tasks/transfer-weth.js
const fs = require("fs");

task("transfer-weth", "Transfers WETH and test tokens to a wallet")
  .addParam("address", "The recipient wallet address")
  .addOptionalParam("amount", "Amount to transfer (in ETH units)", "100")
  .setAction(async (taskArgs, hre) => {
    console.log(`Transferring ${taskArgs.amount} tokens to ${taskArgs.address}...`);
    
    // Read contract addresses
    let addresses;
    try {
      addresses = JSON.parse(fs.readFileSync("./contract-addresses.json"));
    } catch (error) {
      console.error("Failed to read contract addresses:", error);
      return;
    }
    
    // Get signers
    const [deployer] = await hre.ethers.getSigners();
    
    // Connect to tokens
    const WETH = await hre.ethers.getContractAt("WETH9", addresses.weth, deployer);
    const TestToken = await hre.ethers.getContractAt("TestToken", addresses.tokenB, deployer);
    
    // Parse amount
    const parseEther = hre.ethers.utils?.parseEther || hre.ethers.parseEther;
    const amountWei = parseEther(taskArgs.amount);
    
    // Transfer Test Token
    console.log(`Minting ${taskArgs.amount} Test Tokens...`);
    try {
      let tx = await TestToken.mint(taskArgs.address, amountWei);
      await tx.wait();
      console.log("Test Token minting successful");
    } catch (error) {
      console.error("Error minting Test Token:", error.message);
    }
    
    // For WETH, we need to deposit ETH first and then transfer
    console.log(`Depositing ${taskArgs.amount} ETH to get WETH...`);
    try {
      let tx = await WETH.deposit({ value: amountWei });
      await tx.wait();
      console.log("ETH deposit successful");
      
      console.log(`Transferring ${taskArgs.amount} WETH to ${taskArgs.address}...`);
      tx = await WETH.transfer(taskArgs.address, amountWei);
      await tx.wait();
      console.log("WETH transfer successful");
    } catch (error) {
      console.error("Error with WETH operations:", error.message);
    }
    
    // Get updated balances
    try {
      const formatEther = hre.ethers.utils?.formatEther || hre.ethers.formatEther;
      const wethBalance = await WETH.balanceOf(taskArgs.address);
      const tokenBalance = await TestToken.balanceOf(taskArgs.address);
      
      console.log(`\nToken balances for ${taskArgs.address}:`);
      console.log(`WETH: ${formatEther(wethBalance)}`);
      console.log(`Test Token: ${formatEther(tokenBalance)}`);
    } catch (error) {
      console.error("Error checking balances:", error.message);
    }
  });