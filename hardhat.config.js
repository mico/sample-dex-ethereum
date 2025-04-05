require("@nomicfoundation/hardhat-toolbox");
require("./tasks/transfer-weth");
require("./tasks/send-eth");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.28",
};
