// Simple DEX Frontend with TypeScript and modern libraries

import { ethers } from 'ethers';
import { useState, useEffect } from 'react';
import { Contract, BigNumber, utils } from 'ethers';
import Web3Modal from 'web3modal';

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
  reserveA: BigNumber;
  reserveB: BigNumber;
  userBalanceA: BigNumber;
  userBalanceB: BigNumber;
  userLiquidity: BigNumber;
  totalLiquidity: BigNumber;
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
  // Using underscore prefix to indicate intentionally unused variable
  const [_provider, setProvider] = useState<ethers.providers.Web3Provider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [userAddress, setUserAddress] = useState<string>('');
  const [dexContract, setDexContract] = useState<Contract | null>(null);
  const [state, setState] = useState<DEXState>({
    tokenA: null,
    tokenB: null,
    reserveA: BigNumber.from(0),
    reserveB: BigNumber.from(0),
    userBalanceA: BigNumber.from(0),
    userBalanceB: BigNumber.from(0),
    userLiquidity: BigNumber.from(0),
    totalLiquidity: BigNumber.from(0),
  });
  
  // Connect to wallet and initialize contracts
  const connect = async () => {
    try {
      const web3Modal = new Web3Modal({
        cacheProvider: true,
        providerOptions: {}, // Add providers like WalletConnect here
      });
      
      const connection = await web3Modal.connect();
      const ethersProvider = new ethers.providers.Web3Provider(connection);
      const ethersSigner = ethersProvider.getSigner();
      const address = await ethersSigner.getAddress();
      
      setProvider(ethersProvider);
      setSigner(ethersSigner);
      setUserAddress(address);
      
      // Create DEX contract instance
      const dex = new ethers.Contract(dexAddress, DEX_ABI, ethersSigner);
      setDexContract(dex);
      
      // Initialize token contracts and state
      await refreshDexState(dex, address);
      
      // Setup event listeners for wallet changes
      connection.on('accountsChanged', () => window.location.reload());
      connection.on('chainChanged', () => window.location.reload());
    } catch (error) {
      console.error('Connection error:', error);
    }
  };
  
  // Initialize token contracts and get state data
  const refreshDexState = async (dexContract: Contract, address: string) => {
    try {
      // Get token addresses
      const tokenAAddress = await dexContract.tokenA();
      const tokenBAddress = await dexContract.tokenB();
      
      // Create token contracts - use the same provider/signer as the dexContract
      const tokenAContract = new ethers.Contract(tokenAAddress, ERC20_ABI, dexContract.signer || dexContract.provider);
      const tokenBContract = new ethers.Contract(tokenBAddress, ERC20_ABI, dexContract.signer || dexContract.provider);
      
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
  
  // Refresh balances and reserves
  const refreshBalances = async () => {
    if (!dexContract || !signer || !state.tokenA || !state.tokenB) return;
    
    const address = await signer.getAddress();
    
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
  };
  
  // Get swap quote
  const getSwapQuote = async (
    isAToB: boolean,
    amountIn: string
  ): Promise<string> => {
    if (!dexContract || !state.tokenA || !state.tokenB) return '0';
    
    try {
      const token = isAToB ? state.tokenA : state.tokenB;
      const parsedAmount = utils.parseUnits(amountIn, token.decimals);
      
      const quote = isAToB
        ? await dexContract.getQuoteAToB(parsedAmount)
        : await dexContract.getQuoteBToA(parsedAmount);
      
      const outputToken = isAToB ? state.tokenB : state.tokenA;
      return utils.formatUnits(quote, outputToken.decimals);
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
      const parsedAmount = utils.parseUnits(amount, token.decimals);
      const tx = await token.contract.approve(dexContract.address, parsedAmount);
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
      const amountADesired = utils.parseUnits(amountA, state.tokenA.decimals);
      const amountBDesired = utils.parseUnits(amountB, state.tokenB.decimals);
      
      // Calculate minimum amounts based on slippage
      const slippageFactor = 100 - slippagePercent;
      const amountAMin = amountADesired.mul(slippageFactor).div(100);
      const amountBMin = amountBDesired.mul(slippageFactor).div(100);
      
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
      const parsedLiquidity = utils.parseEther(liquidityAmount);
      
      // Calculate expected amounts
      const expectedA = reserveA.mul(parsedLiquidity).div(totalLiquidity);
      const expectedB = reserveB.mul(parsedLiquidity).div(totalLiquidity);
      
      // Calculate minimum amounts based on slippage
      const slippageFactor = 100 - slippagePercent;
      const amountAMin = expectedA.mul(slippageFactor).div(100);
      const amountBMin = expectedB.mul(slippageFactor).div(100);
      
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
      const parsedAmountIn = utils.parseUnits(amountIn, tokenIn.decimals);
      
      // Get expected output
      const quote = isAToB
        ? await dexContract.getQuoteAToB(parsedAmountIn)
        : await dexContract.getQuoteBToA(parsedAmountIn);
      
      // Calculate minimum output with slippage
      const slippageFactor = 100 - slippagePercent;
      const amountOutMin = quote.mul(slippageFactor).div(100);
      
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
  const formatTokenAmount = (token: Token | null, amount: BigNumber): string => {
    if (!token) return '0';
    return utils.formatUnits(amount, token.decimals);
  };
  
  // Initialize on first load
  useEffect(() => {
    if (typeof window !== 'undefined') {
      connect();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Return the hook's interface
  return {
    // Connection state
    isConnected: !!signer,
    userAddress,
    connect,
    
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
      userLiquidity: utils.formatEther(state.userLiquidity),
    },
    
    // Actions
    refreshBalances,
    getSwapQuote,
    addLiquidity,
    removeLiquidity,
    swap,
  };
}