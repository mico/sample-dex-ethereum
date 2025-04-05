// tasks/transfer-weth.js
const fs = require("fs");

task("send-eth", "Sending ETH to a wallet")
  .addParam("address", "The recipient wallet address")
  .addOptionalParam("amount", "Amount to transfer (in ETH units)", "100")
  .setAction(async (taskArgs, hre) => {
    console.log(`Transferring ${taskArgs.amount} tokens to ${taskArgs.address}...`);
    // XXX: to update
    const [sender] = await hre.ethers.getSigners();
      
    // Amount to send (10 ETH)
    const amount = hre.ethers.parseEther(taskArgs.amount);
    
    console.log(`Sending ${hre.ethers.formatEther(amount)} ETH from ${sender.address} to ${taskArgs.address}`);
    
    const tx = await sender.sendTransaction({
      to: taskArgs.address,
      value: amount
    });
    
    console.log(`Transaction hash: ${tx.hash}`);
    await tx.wait();
    
    console.log("ETH transfer successful!");
  });