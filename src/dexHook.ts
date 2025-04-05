// Simple DEX Frontend with TypeScript and modern libraries

import { ethers } from 'ethers';
import { useState, useEffect } from 'react';
import { Contract } from 'ethers';
import { useAppKitAccount, useDisconnect, useAppKit } from "@reown/appkit/react";

// Type definitions
type Token = {
  address: string;
  symbol: string;
  decimals: number;
  contract: Contract;
};

type DEXState = {
  tokenA: Token | null;
  tokenB: Token | null;
  reserveA: bigint;
  reserveB: bigint;
  userBalanceA: bigint;
  userBalanceB: bigint;
  userLiquidity: bigint;
  totalLiquidity: bigint;
};

// DEX ABI - just the functions we need
const DEX_ABI = [
  // Read functions
  'function tokenA() external view returns (address)',
  'function tokenB() external view returns (address)',
  'function reserveA() external view returns (uint256)',
  'function reserveB() external view returns (uint256)',
  'function liquidity(address) external view returns (uint256)',
  'function totalLiquidity() external view returns (uint256)',
  'function getQuoteAToB(uint256) external view returns (uint256)',
  'function getQuoteBToA(uint256) external view returns (uint256)',
  
  // Write functions
  'function addLiquidity(uint256,uint256,uint256,uint256) external returns (uint256)',
  'function removeLiquidity(uint256,uint256,uint256) external returns (uint256,uint256)',
  'function swapAForB(uint256,uint256) external returns (uint256)',
  'function swapBForA(uint256,uint256) external returns (uint256)',
];

// ERC20 ABI
const ERC20_ABI = [
  'function balanceOf(address) external view returns (uint256)',
  'function symbol() external view returns (string)',
  'function decimals() external view returns (uint8)',
  'function approve(address,uint256) external returns (bool)',
];

/**
 * Custom hook for interacting with the DEX
 */
export function useDEX(dexAddress: string) {
  // Web3Modal hooks
  // const { connect, isConnecting } = useReownConnect(); // Use ReownAppKit connect hook
  const { address, isConnected, status } = useAppKitAccount();
  const { disconnect } = useDisconnect();
  const { open: openWalletModal } = useAppKit(); // Get the open function
  const [_signer, setSigner] = useState<ethers.Signer | null>(null);


  // Provider and contract state
  const [_provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  // const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [dexContract, setDexContract] = useState<Contract | null>(null);
  
  // DEX state
  const [state, setState] = useState<DEXState>({
    tokenA: null,
    tokenB: null,
    reserveA: BigInt(0),
    reserveB: BigInt(0),
    userBalanceA: BigInt(0),
    userBalanceB: BigInt(0),
    userLiquidity: BigInt(0),
    totalLiquidity: BigInt(0),
  });
  
  // Connect to wallet
  const connectWallet = async () => {
    try {
      // await connect(); // Use ReownAppKit connect method
      await openWalletModal({ view: 'Connect' });

    } catch (error) {
      console.error('Connection error:', error);
    }
  };

  const isConnecting = status === 'connecting';

  // Initialize provider, signer, and contracts when connected
  useEffect(() => {
    const initializeConnection = async () => {
      if (isConnected && address && (window as any).ethereum) {
        try {
          // Create provider and signer from window.ethereum
          const ethersProvider = new ethers.BrowserProvider((window as any).ethereum);
          
          const ethersSigner = await ethersProvider.getSigner();
          
          // Set state
          setProvider(ethersProvider);
          setSigner(ethersSigner);
          
          // Create DEX contract instance
          const dex = new ethers.Contract(dexAddress, DEX_ABI, ethersSigner);
          setDexContract(dex);
          
          // Initialize token contracts and state
          await refreshDexState(dex, address);
        } catch (error) {
          console.error('Error initializing connection:', error);
        }
      } else {
        // Reset state when disconnected
        setProvider(null);
        setSigner(null);
        setDexContract(null);
      }
    };

    initializeConnection();
  }, [isConnected, address, dexAddress]);
  
  // Initialize token contracts and get state data
  const refreshDexState = async (dexContract: Contract, address: string) => {
    try {
      // Get token addresses
      const tokenAAddress = await dexContract.tokenA();
      const tokenBAddress = await dexContract.tokenB();
      console.log("tokenAAddress", tokenAAddress);
      console.log("tokenBAddress", tokenBAddress);
      
      // Create token contracts - use the same provider/signer as the dexContract
      const tokenAContract = new ethers.Contract(tokenAAddress, ERC20_ABI, dexContract.runner);
      const tokenBContract = new ethers.Contract(tokenBAddress, ERC20_ABI, dexContract.runner);
      
      // Get token info
      const tokenASymbol = await tokenAContract.symbol();
      const tokenBSymbol = await tokenBContract.symbol();
      const tokenADecimals = await tokenAContract.decimals();
      const tokenBDecimals = await tokenBContract.decimals();
      
      // Create token objects
      const tokenA: Token = {
        address: tokenAAddress,
        symbol: tokenASymbol,
        decimals: tokenADecimals,
        contract: tokenAContract,
      };
      
      const tokenB: Token = {
        address: tokenBAddress,
        symbol: tokenBSymbol,
        decimals: tokenBDecimals,
        contract: tokenBContract,
      };
      
      // Get DEX state
      const [
        reserveA,
        reserveB,
        userBalanceA,
        userBalanceB,
        userLiquidity,
        totalLiquidity,
      ] = await Promise.all([
        dexContract.reserveA(),
        dexContract.reserveB(),
        tokenAContract.balanceOf(address),
        tokenBContract.balanceOf(address),
        dexContract.liquidity(address),
        dexContract.totalLiquidity(),
      ]);
      
      // Update state
      setState({
        tokenA,
        tokenB,
        reserveA,
        reserveB,
        userBalanceA,
        userBalanceB,
        userLiquidity,
        totalLiquidity,
      });
      
    } catch (error) {
      console.error('Error refreshing DEX state:', error);
    }
  };
  
  // Other functions remain the same...
  // Refresh balances and reserves
  const refreshBalances = async () => {
    if (!dexContract || !address || !state.tokenA || !state.tokenB) return;
    
    try {
      const [
        reserveA,
        reserveB,
        userBalanceA,
        userBalanceB,
        userLiquidity,
        totalLiquidity,
      ] = await Promise.all([
        dexContract.reserveA(),
        dexContract.reserveB(),
        state.tokenA.contract.balanceOf(address),
        state.tokenB.contract.balanceOf(address),
        dexContract.liquidity(address),
        dexContract.totalLiquidity(),
      ]);
      
      setState(prev => ({
        ...prev,
        reserveA,
        reserveB,
        userBalanceA,
        userBalanceB,
        userLiquidity,
        totalLiquidity,
      }));
    } catch (error) {
      console.error('Error refreshing balances:', error);
    }
  };
  
  // Get swap quote
  const getSwapQuote = async (
    isAToB: boolean,
    amountIn: string
  ): Promise<string> => {
    if (!dexContract || !state.tokenA || !state.tokenB) return '0';
    
    try {
      const token = isAToB ? state.tokenA : state.tokenB;
      const parsedAmount = ethers.parseUnits(amountIn, token.decimals);
      
      const quote = isAToB
        ? await dexContract.getQuoteAToB(parsedAmount)
        : await dexContract.getQuoteBToA(parsedAmount);
      
      const outputToken = isAToB ? state.tokenB : state.tokenA;
      return ethers.formatUnits(quote, outputToken.decimals);
    } catch (error) {
      console.error('Error getting quote:', error);
      return '0';
    }
  };
  
  // Approve tokens
  const approveToken = async (
    token: Token,
    amount: string
  ): Promise<boolean> => {
    if (!dexContract) return false;
    
    try {
      const parsedAmount = ethers.parseUnits(amount, token.decimals);
      const tx = await token.contract.approve(dexContract.target, parsedAmount);
      await tx.wait();
      return true;
    } catch (error) {
      console.error(`Error approving ${token.symbol}:`, error);
      return false;
    }
  };
  
  // Add liquidity
  const addLiquidity = async (
    amountA: string,
    amountB: string,
    slippagePercent: number = 5
  ): Promise<boolean> => {
    if (!dexContract || !state.tokenA || !state.tokenB) return false;
    
    try {
      // Parse amounts
      const amountADesired = ethers.parseUnits(amountA, state.tokenA.decimals);
      const amountBDesired = ethers.parseUnits(amountB, state.tokenB.decimals);
      
      // Calculate minimum amounts based on slippage
      const slippageFactor = BigInt(100) - BigInt(slippagePercent * 10);
      const amountAMin = (amountADesired * slippageFactor) / BigInt(100);
      const amountBMin = (amountBDesired * slippageFactor) / BigInt(100);
      
      // Approve tokens
      await approveToken(state.tokenA, amountA);
      await approveToken(state.tokenB, amountB);
      
      // Add liquidity
      const tx = await dexContract.addLiquidity(
        amountADesired,
        amountBDesired,
        amountAMin,
        amountBMin
      );
      await tx.wait();
      
      // Refresh state
      await refreshBalances();
      return true;
    } catch (error) {
      console.error('Error adding liquidity:', error);
      return false;
    }
  };
  
  // Remove liquidity
  const removeLiquidity = async (
    liquidityAmount: string,
    slippagePercent: number = 5
  ): Promise<boolean> => {
    if (!dexContract || !state.tokenA || !state.tokenB) return false;
    
    try {
      const { reserveA, reserveB, totalLiquidity } = state;
      const parsedLiquidity = ethers.parseEther(liquidityAmount);
      
      // Calculate expected amounts
      const expectedA = (reserveA * parsedLiquidity) / totalLiquidity;
      const expectedB = (reserveB * parsedLiquidity) / totalLiquidity;
      
      // Calculate minimum amounts based on slippage
      const slippageFactor = BigInt(100) - BigInt(slippagePercent * 10);
      const amountAMin = (expectedA * slippageFactor) / BigInt(100);
      const amountBMin = (expectedB * slippageFactor) / BigInt(100);
      
      // Remove liquidity
      const tx = await dexContract.removeLiquidity(
        parsedLiquidity,
        amountAMin,
        amountBMin
      );
      await tx.wait();
      
      // Refresh state
      await refreshBalances();
      return true;
    } catch (error) {
      console.error('Error removing liquidity:', error);
      return false;
    }
  };
  
  // Swap tokens
  const swap = async (
    isAToB: boolean,
    amountIn: string,
    slippagePercent: number = 2
  ): Promise<boolean> => {
    if (!dexContract || !state.tokenA || !state.tokenB) return false;
    
    try {
      const tokenIn = isAToB ? state.tokenA : state.tokenB;
      const parsedAmountIn = ethers.parseUnits(amountIn, tokenIn.decimals);
      
      // Get expected output
      const quote = isAToB
        ? await dexContract.getQuoteAToB(parsedAmountIn)
        : await dexContract.getQuoteBToA(parsedAmountIn);
      
      // Calculate minimum output with slippage
      const slippageFactor = BigInt(100) - BigInt(slippagePercent * 10);
      const amountOutMin = (quote * slippageFactor) / BigInt(100);
      
      // Approve input token
      await approveToken(tokenIn, amountIn);
      
      // Execute swap
      const tx = isAToB
        ? await dexContract.swapAForB(parsedAmountIn, amountOutMin)
        : await dexContract.swapBForA(parsedAmountIn, amountOutMin);
      await tx.wait();
      
      // Refresh state
      await refreshBalances();
      return true;
    } catch (error) {
      console.error('Error swapping tokens:', error);
      return false;
    }
  };
  
  // Format token amount for display
  const formatTokenAmount = (token: Token | null, amount: bigint): string => {
    if (!token) return '0';
    return ethers.formatUnits(amount, token.decimals);
  };
  
  // Return the hook's interface
  return {
    // Connection state
    isConnected,
    isConnecting,
    userAddress: address,
    connect: connectWallet,
    disconnect,
    
    // DEX state
    state,
    
    // Formatted values for UI
    formattedState: {
      reserveA: state.tokenA ? formatTokenAmount(state.tokenA, state.reserveA) : '0',
      reserveB: state.tokenB ? formatTokenAmount(state.tokenB, state.reserveB) : '0',
      balanceA: state.tokenA ? formatTokenAmount(state.tokenA, state.userBalanceA) : '0',
      balanceB: state.tokenB ? formatTokenAmount(state.tokenB, state.userBalanceB) : '0',
      tokenASymbol: state.tokenA?.symbol || 'TokenA',
      tokenBSymbol: state.tokenB?.symbol || 'TokenB',
      userLiquidity: ethers.formatEther(state.userLiquidity),
    },
    
    // Actions
    refreshBalances,
    getSwapQuote,
    addLiquidity,
    removeLiquidity,
    swap,
  };
}