// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title SimpleDEX
 * @dev A simple DEX that allows swapping between two tokens using a constant product formula
 */
contract SimpleDEX {
    using SafeERC20 for IERC20;

    // The two tokens in the pool
    IERC20 public tokenA;
    IERC20 public tokenB;

    // Liquidity pool reserves
    uint256 public reserveA;
    uint256 public reserveB;

    // Total liquidity tokens
    uint256 public totalLiquidity;
    
    // Mapping of provider address to their liquidity tokens
    mapping(address => uint256) public liquidity;

    // Fee percentage - 0.3% (3/1000)
    uint256 public constant FEE_NUMERATOR = 3;
    uint256 public constant FEE_DENOMINATOR = 1000;

    // Events
    event AddLiquidity(address indexed provider, uint256 amountA, uint256 amountB, uint256 liquidity);
    event RemoveLiquidity(address indexed provider, uint256 amountA, uint256 amountB, uint256 liquidity);
    event Swap(address indexed user, uint256 amountIn, uint256 amountOut, bool isAtoB);

    /**
     * @dev Constructor to set the token addresses
     * @param _tokenA Address of the first token
     * @param _tokenB Address of the second token
     */
    constructor(address _tokenA, address _tokenB) {
        require(_tokenA != _tokenB, "Tokens must be different");
        tokenA = IERC20(_tokenA);
        tokenB = IERC20(_tokenB);
    }

    /**
     * @dev Add liquidity to the pool
     * @param amountADesired Amount of tokenA to add
     * @param amountBDesired Amount of tokenB to add
     * @param amountAMin Minimum amount of tokenA to add (slippage protection)
     * @param amountBMin Minimum amount of tokenB to add (slippage protection)
     * @return liquidityMinted Amount of liquidity tokens minted
     */
    function addLiquidity(
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin
    ) external returns (uint256 liquidityMinted) {
        // Calculate optimal amounts
        (uint256 amountA, uint256 amountB) = _calculateLiquidityAmounts(
            amountADesired,
            amountBDesired,
            amountAMin,
            amountBMin
        );

        // Transfer tokens from user to contract
        tokenA.safeTransferFrom(msg.sender, address(this), amountA);
        tokenB.safeTransferFrom(msg.sender, address(this), amountB);

        // Calculate liquidity to mint
        if (totalLiquidity == 0) {
            // Initial liquidity is geometric mean of amounts
            liquidityMinted = _sqrt(amountA * amountB);
            totalLiquidity = liquidityMinted;
        } else {
            // Calculate proportional to existing liquidity
            liquidityMinted = _min(
                (amountA * totalLiquidity) / reserveA,
                (amountB * totalLiquidity) / reserveB
            );
        }

        require(liquidityMinted > 0, "Insufficient liquidity minted");

        // Update reserves
        reserveA += amountA;
        reserveB += amountB;

        // Mint liquidity tokens to provider
        liquidity[msg.sender] += liquidityMinted;
        
        emit AddLiquidity(msg.sender, amountA, amountB, liquidityMinted);
        
        return liquidityMinted;
    }

    /**
     * @dev Remove liquidity from the pool
     * @param liquidityAmount Amount of liquidity tokens to burn
     * @param amountAMin Minimum amount of tokenA to receive (slippage protection)
     * @param amountBMin Minimum amount of tokenB to receive (slippage protection)
     * @return amountA Amount of tokenA received
     * @return amountB Amount of tokenB received
     */
    function removeLiquidity(
        uint256 liquidityAmount,
        uint256 amountAMin,
        uint256 amountBMin
    ) external returns (uint256 amountA, uint256 amountB) {
        require(liquidity[msg.sender] >= liquidityAmount, "Insufficient liquidity");

        // Calculate amounts to return
        amountA = (liquidityAmount * reserveA) / totalLiquidity;
        amountB = (liquidityAmount * reserveB) / totalLiquidity;

        require(amountA >= amountAMin, "Insufficient tokenA output");
        require(amountB >= amountBMin, "Insufficient tokenB output");

        // Update state
        liquidity[msg.sender] -= liquidityAmount;
        totalLiquidity -= liquidityAmount;
        reserveA -= amountA;
        reserveB -= amountB;

        // Transfer tokens back to user
        tokenA.safeTransfer(msg.sender, amountA);
        tokenB.safeTransfer(msg.sender, amountB);

        emit RemoveLiquidity(msg.sender, amountA, amountB, liquidityAmount);
        
        return (amountA, amountB);
    }

    /**
     * @dev Swap tokenA for tokenB
     * @param amountIn Amount of tokenA to swap
     * @param amountOutMin Minimum amount of tokenB to receive (slippage protection)
     * @return amountOut Amount of tokenB received
     */
    function swapAForB(uint256 amountIn, uint256 amountOutMin) external returns (uint256 amountOut) {
        require(amountIn > 0, "Insufficient input amount");
        require(reserveA > 0 && reserveB > 0, "Insufficient liquidity");

        // Calculate amount out with fee
        uint256 amountInWithFee = amountIn * (FEE_DENOMINATOR - FEE_NUMERATOR);
        amountOut = (amountInWithFee * reserveB) / (reserveA * FEE_DENOMINATOR + amountInWithFee);
        
        require(amountOut >= amountOutMin, "Insufficient output amount");

        // Transfer tokens
        tokenA.safeTransferFrom(msg.sender, address(this), amountIn);
        tokenB.safeTransfer(msg.sender, amountOut);

        // Update reserves
        reserveA += amountIn;
        reserveB -= amountOut;

        emit Swap(msg.sender, amountIn, amountOut, true);
        
        return amountOut;
    }

    /**
     * @dev Swap tokenB for tokenA
     * @param amountIn Amount of tokenB to swap
     * @param amountOutMin Minimum amount of tokenA to receive (slippage protection)
     * @return amountOut Amount of tokenA received
     */
    function swapBForA(uint256 amountIn, uint256 amountOutMin) external returns (uint256 amountOut) {
        require(amountIn > 0, "Insufficient input amount");
        require(reserveA > 0 && reserveB > 0, "Insufficient liquidity");

        // Calculate amount out with fee
        uint256 amountInWithFee = amountIn * (FEE_DENOMINATOR - FEE_NUMERATOR);
        amountOut = (amountInWithFee * reserveA) / (reserveB * FEE_DENOMINATOR + amountInWithFee);
        
        require(amountOut >= amountOutMin, "Insufficient output amount");

        // Transfer tokens
        tokenB.safeTransferFrom(msg.sender, address(this), amountIn);
        tokenA.safeTransfer(msg.sender, amountOut);

        // Update reserves
        reserveB += amountIn;
        reserveA -= amountOut;

        emit Swap(msg.sender, amountIn, amountOut, false);
        
        return amountOut;
    }

    /**
     * @dev Get quotes for swapping tokenA to tokenB
     * @param amountIn Amount of tokenA to swap
     * @return amountOut Expected amount of tokenB to receive
     */
    function getQuoteAToB(uint256 amountIn) external view returns (uint256 amountOut) {
        if (reserveA == 0 || reserveB == 0 || amountIn == 0) {
            return 0;
        }
        
        uint256 amountInWithFee = amountIn * (FEE_DENOMINATOR - FEE_NUMERATOR);
        return (amountInWithFee * reserveB) / (reserveA * FEE_DENOMINATOR + amountInWithFee);
    }

    /**
     * @dev Get quotes for swapping tokenB to tokenA
     * @param amountIn Amount of tokenB to swap
     * @return amountOut Expected amount of tokenA to receive
     */
    function getQuoteBToA(uint256 amountIn) external view returns (uint256 amountOut) {
        if (reserveA == 0 || reserveB == 0 || amountIn == 0) {
            return 0;
        }
        
        uint256 amountInWithFee = amountIn * (FEE_DENOMINATOR - FEE_NUMERATOR);
        return (amountInWithFee * reserveA) / (reserveB * FEE_DENOMINATOR + amountInWithFee);
    }

    /**
     * @dev Helper to calculate liquidity amounts
     */
    function _calculateLiquidityAmounts(
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin
    ) internal view returns (uint256 amountA, uint256 amountB) {
        if (reserveA == 0 && reserveB == 0) {
            return (amountADesired, amountBDesired);
        }

        uint256 optimalAmountB = (amountADesired * reserveB) / reserveA;
        if (optimalAmountB <= amountBDesired) {
            require(optimalAmountB >= amountBMin, "Insufficient B amount");
            return (amountADesired, optimalAmountB);
        } else {
            uint256 optimalAmountA = (amountBDesired * reserveA) / reserveB;
            require(optimalAmountA <= amountADesired, "Internal error");
            require(optimalAmountA >= amountAMin, "Insufficient A amount");
            return (optimalAmountA, amountBDesired);
        }
    }

    /**
     * @dev Helper to calculate square root (Babylonian method)
     */
    function _sqrt(uint256 y) internal pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }

    /**
     * @dev Helper to return minimum of two values
     */
    function _min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }
}
