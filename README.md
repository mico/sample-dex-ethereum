# Ethereum DEX Example

A simple DEX on Ethereum with token swapping functionality.

## Local Setup

### Backend (Hardhat)

1. **Start local blockchain**:
   ```
   npm run node
   ```

2. **Deploy contracts**:
   ```
   npm run deploy:local
   ```
   This deploys WETH, test token, and DEX contracts, saving addresses to `contract-addresses.json`.

3. **Add network to MetaMask**:
   - Network Name: `Hardhat Local`
   - RPC URL: `http://127.0.0.1:8545`
   - Chain ID: `31337`
   - Currency Symbol: `ETH`

4. **Send tokens to your wallet**:
   ```
   npx hardhat send-eth --network local --address YOUR_METAMASK_WALLET_ADDRESS --amount 100
   npx hardhat transfer-weth --network local --address YOUR_METAMASK_WALLET_ADDRESS --amount 100
   ```

### Frontend

1. **Create .env file**:
   ```
   REACT_APP_DEX_ADDRESS=<dex-address-from-contract-addresses.json>
   ```

2. **Install dependencies**:
   ```
   npm install
   ```

3. **Start frontend**:
   ```
   npm start
   ```

4. Visit `http://localhost:3000` to use the DEX.
