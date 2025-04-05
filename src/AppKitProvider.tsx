import { createAppKit } from '@reown/appkit/react'
import { mainnet, hardhat } from '@reown/appkit/networks'
import { EthersAdapter } from "@reown/appkit-adapter-ethers";


// Get your project ID from environment variables
const projectId = import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID;

const networks = [mainnet, hardhat];

createAppKit({
  adapters: [new EthersAdapter()],
  networks,
  projectId,
  metadata: {
    name: 'Simple DEX',
    description: 'Simple DEX Application',
    url: window.location.origin,
    icons: ['https://your-app-icon-url.com/icon.png']
  },
  features: {
    analytics: true // Optional - defaults to your Cloud configuration
  }
})
