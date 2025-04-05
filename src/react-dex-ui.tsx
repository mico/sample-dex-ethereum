import React, { useState, useEffect } from 'react';
import { useDEX } from './dexHook'; // Import the hook we created earlier

// DEX_ADDRESS should come from environment variable in a real app
const DEX_ADDRESS = import.meta.env.VITE_DEX_ADDRESS || '0x123...'; // Replace with your deployed contract address

const SimpleDEXUI = () => {
  // Initialize the DEX hook
  const dex = useDEX(DEX_ADDRESS);
  
  // UI state
  const [tab, setTab] = useState('swap'); // 'swap' or 'liquidity'
  const [inputAmount, setInputAmount] = useState('');
  const [expectedOutput, setExpectedOutput] = useState('0');
  const [isAToB, setIsAToB] = useState(true);
  const [slippage, setSlippage] = useState(0.5);
  
  // Liquidity state
  const [amountA, setAmountA] = useState('');
  const [amountB, setAmountB] = useState('');
  
  // Update quote when input changes or direction changes
  useEffect(() => {
    async function updateQuote() {
      if (inputAmount && !isNaN(parseFloat(inputAmount)) && dex.isConnected) {
        try {
          const quote = await dex.getSwapQuote(isAToB, inputAmount);
          setExpectedOutput(quote);
        } catch (error) {
          console.error("Error getting quote:", error);
          setExpectedOutput('0');
        }
      } else {
        setExpectedOutput('0');
      }
    }
    
    updateQuote();
  }, [inputAmount, isAToB, dex.isConnected, dex]);
  
  // Toggle swap direction
  const switchTokens = () => {
    setIsAToB(!isAToB);
    setInputAmount('');
    setExpectedOutput('0');
  };
  
  // Execute swap with contract
  const executeSwap = async () => {
    if (!inputAmount || isNaN(parseFloat(inputAmount))) return;
    
    try {
      // Call the swap function from our hook
      const success = await dex.swap(isAToB, inputAmount, slippage);
      
      if (success) {
        alert(`Swap executed successfully!`);
        setInputAmount('');
        setExpectedOutput('0');
      }
    } catch (error) {
      console.error("Error during swap:", error);
      alert(`Swap failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };
  
  // Add liquidity with contract
  const addLiquidity = async () => {
    if (!amountA || !amountB || isNaN(parseFloat(amountA)) || isNaN(parseFloat(amountB))) return;
    
    try {
      // Call the addLiquidity function from our hook
      const success = await dex.addLiquidity(amountA, amountB, slippage);
      
      if (success) {
        alert("Liquidity added successfully!");
        setAmountA('');
        setAmountB('');
      }
    } catch (error) {
      console.error("Error adding liquidity:", error);
      alert(`Failed to add liquidity: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };
  
  // Get formatted token symbols
  const tokenASymbol = dex.formattedState?.tokenASymbol || 'TokenA';
  const tokenBSymbol = dex.formattedState?.tokenBSymbol || 'TokenB';
  
  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden">
      <div className="p-5">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-bold text-gray-800">Simple DEX</h1>
          {!dex.isConnected ? (
            <button 
              onClick={dex.connect}
              className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              Connect Wallet
            </button>
          ) : (
            <div className="flex flex-col items-end">
              <span className="bg-green-100 text-green-800 text-sm font-medium px-2.5 py-0.5 rounded-lg flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                Connected
              </span>
              <span className="text-xs text-gray-500 mt-1">
                {dex.userAddress?.substring(0, 6)}...{dex.userAddress?.substring(38)}
              </span>
            </div>
          )}
        </div>
        
        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-4">
          <button 
            className={`py-2 px-4 font-medium ${tab === 'swap' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500'}`}
            onClick={() => setTab('swap')}
          >
            Swap
          </button>
          <button 
            className={`py-2 px-4 font-medium ${tab === 'liquidity' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500'}`}
            onClick={() => setTab('liquidity')}
          >
            Liquidity
          </button>
        </div>
        
        {/* Swap Interface */}
        {tab === 'swap' && (
          <div className="space-y-4">
            {/* Input token */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between mb-2">
                <span className="text-gray-500">From</span>
                <span className="text-gray-500">
                  Balance: {isAToB ? dex.formattedState?.balanceA : dex.formattedState?.balanceB} {isAToB ? tokenASymbol : tokenBSymbol}
                </span>
              </div>
              <div className="flex items-center">
                <input
                  type="number"
                  placeholder="0.0"
                  value={inputAmount}
                  onChange={(e) => setInputAmount(e.target.value)}
                  className="w-full bg-transparent text-xl outline-none"
                  disabled={!dex.isConnected}
                />
                <div className="bg-gray-200 py-1 px-3 rounded-lg font-medium">
                  {isAToB ? tokenASymbol : tokenBSymbol}
                </div>
              </div>
            </div>
            
            {/* Switch button */}
            <div className="flex justify-center">
              <button 
                onClick={switchTokens}
                className="bg-gray-100 p-2 rounded-full hover:bg-gray-200 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 00-1 1v4H5a1 1 0 100 2h4v4a1 1 0 102 0v-4h4a1 1 0 100-2h-4V4a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            
            {/* Output token */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between mb-2">
                <span className="text-gray-500">To (estimated)</span>
                <span className="text-gray-500">
                  Balance: {isAToB ? dex.formattedState?.balanceB : dex.formattedState?.balanceA} {isAToB ? tokenBSymbol : tokenASymbol}
                </span>
              </div>
              <div className="flex items-center">
                <input
                  type="text"
                  placeholder="0.0"
                  value={expectedOutput}
                  className="w-full bg-transparent text-xl outline-none"
                  disabled
                />
                <div className="bg-gray-200 py-1 px-3 rounded-lg font-medium">
                  {isAToB ? tokenBSymbol : tokenASymbol}
                </div>
              </div>
            </div>
            
            {/* Slippage settings */}
            <div className="flex justify-between text-sm text-gray-500 px-1">
              <span>Slippage Tolerance</span>
              <div className="flex space-x-2">
                {[0.1, 0.5, 1.0].map((value) => (
                  <button
                    key={value}
                    onClick={() => setSlippage(value)}
                    className={`px-2 py-1 rounded text-xs ${slippage === value ? 'bg-blue-100 text-blue-500' : 'bg-gray-100'}`}
                  >
                    {value}%
                  </button>
                ))}
              </div>
            </div>
            
            {/* Price info */}
            {inputAmount && expectedOutput !== '0' && (
              <div className="text-sm text-gray-500 px-1">
                <div className="flex justify-between">
                  <span>Rate:</span>
                  <span>
                    1 {isAToB ? tokenASymbol : tokenBSymbol} ≈ {(parseFloat(expectedOutput) / parseFloat(inputAmount)).toFixed(6)} {isAToB ? tokenBSymbol : tokenASymbol}
                  </span>
                </div>
              </div>
            )}
            
            {/* Swap button */}
            <button
              onClick={executeSwap}
              disabled={!dex.isConnected || !inputAmount || inputAmount === '0'}
              className={`w-full py-3 px-4 rounded-lg font-medium text-white text-center ${
                dex.isConnected && inputAmount && inputAmount !== '0'
                  ? 'bg-blue-500 hover:bg-blue-600'
                  : 'bg-gray-300 cursor-not-allowed'
              }`}
            >
              {!dex.isConnected
                ? 'Connect Wallet'
                : !inputAmount || inputAmount === '0'
                ? 'Enter an amount'
                : 'Swap'
              }
            </button>
          </div>
        )}
        
        {/* Liquidity Interface */}
        {tab === 'liquidity' && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <h3 className="font-medium mb-2">Pool Information</h3>
              <div className="flex justify-between mb-1">
                <span>{tokenASymbol} Locked:</span>
                <span>{dex.formattedState?.reserveA || '0'}</span>
              </div>
              <div className="flex justify-between mb-1">
                <span>{tokenBSymbol} Locked:</span>
                <span>{dex.formattedState?.reserveB || '0'}</span>
              </div>
              <div className="flex justify-between">
                <span>Your Liquidity:</span>
                <span>{dex.formattedState?.userLiquidity || '0'}</span>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-500">{tokenASymbol} Amount</span>
                  <span className="text-gray-500">Balance: {dex.formattedState?.balanceA || '0'}</span>
                </div>
                <div className="flex items-center">
                  <input
                    type="number"
                    placeholder="0.0"
                    value={amountA}
                    onChange={(e) => setAmountA(e.target.value)}
                    className="w-full bg-transparent text-xl outline-none"
                    disabled={!dex.isConnected}
                  />
                  <div className="bg-gray-200 py-1 px-3 rounded-lg font-medium">
                    {tokenASymbol}
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-500">{tokenBSymbol} Amount</span>
                  <span className="text-gray-500">Balance: {dex.formattedState?.balanceB || '0'}</span>
                </div>
                <div className="flex items-center">
                  <input
                    type="number"
                    placeholder="0.0"
                    value={amountB}
                    onChange={(e) => setAmountB(e.target.value)}
                    className="w-full bg-transparent text-xl outline-none"
                    disabled={!dex.isConnected}
                  />
                  <div className="bg-gray-200 py-1 px-3 rounded-lg font-medium">
                    {tokenBSymbol}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Add liquidity button */}
            <button
              onClick={addLiquidity}
              disabled={!dex.isConnected || !amountA || !amountB}
              className={`w-full py-3 px-4 rounded-lg font-medium text-white text-center ${
                dex.isConnected && amountA && amountB 
                  ? 'bg-blue-500 hover:bg-blue-600' 
                  : 'bg-gray-300 cursor-not-allowed'
              }`}
            >
              {!dex.isConnected 
                ? 'Connect Wallet' 
                : !amountA || !amountB 
                ? 'Enter amounts' 
                : 'Add Liquidity'
              }
            </button>
            
            {/* Remove liquidity section (if user has liquidity) */}
            {dex.isConnected && parseFloat(dex.formattedState?.userLiquidity || '0') > 0 && (
              <div className="mt-6">
                <h3 className="font-medium mb-2">Remove Liquidity</h3>
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="flex justify-between mb-2">
                    <span>Your liquidity:</span>
                    <span>{dex.formattedState?.userLiquidity || '0'} LP Tokens</span>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        // Remove all liquidity
                        const success = await dex.removeLiquidity(dex.formattedState?.userLiquidity || '0', slippage);
                        if (success) {
                          alert("Liquidity removed successfully!");
                        }
                      } catch (error) {
                        console.error("Error removing liquidity:", error);
                        alert(`Failed to remove liquidity: ${error instanceof Error ? error.message : "Unknown error"}`);
                      }
                    }}
                    className="w-full py-2 px-4 rounded-lg font-medium text-white bg-red-500 hover:bg-red-600"
                  >
                    Remove All Liquidity
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SimpleDEXUI;