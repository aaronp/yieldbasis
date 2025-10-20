# YieldBasis Pool Visualization

An interactive React visualization demonstrating the mechanics of YieldBasis's 2x leveraged Curve LP positions.

## Overview

YieldBasis provides leveraged exposure to Curve LP positions through an automated market maker (AMM) that maintains constant 2x leverage using mathematical bonding curves.

## Features

### Quick Scenarios
Pre-configured market scenarios that instantly set realistic values:
- **Balanced Bull Market**: Healthy collateral with rising prices and moderate yields
- **Over-collateralized Bear Market**: Conservative position with falling prices but stable yields
- **High Yield Bull Run**: Rising prices with exceptional interest rates
- **Conservative Entry**: Small position at market price with low risk
- **Market Crash**: Significant price drop testing liquidation thresholds
- **Aggressive Growth**: Large position in strong bull market with high yields

### Interactive Controls (Sticky)
Controls stay visible while scrolling for easy adjustment:
- **Collateral Slider**: Adjust your Curve LP token deposit ($1k - $100k)
- **Market Price**: Simulate price changes (-50% to +50%)
- **Interest Rate**: Adjust annual yield rate (0% - 20%)
- Manual adjustments automatically switch to "Custom Configuration"

### Visual Components

**1. Pool Composition**
- Pie chart showing collateral vs debt breakdown
- Real-time position calculations
- Total exposure visualization

**2. Leverage Mechanics**
- Visual leverage bar (1x to 3x range)
- Breakdown of capital vs borrowed funds
- LEV_RATIO constant explanation
- Actual vs target leverage comparison

**3. Yield Distribution**
- Bar chart showing yields across different timeframes
- Daily, weekly, monthly, quarterly, and annual projections
- Yield source breakdown (interest fees, LP fees, rebalancing fees)

**4. Mathematical Bonding Curve**
- Line chart showing debt and position curves
- Demonstrates constant leverage maintenance
- Current position marker
- Curve properties explanation

## Technology Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Recharts** - Data visualization
- **Tailwind CSS** - Styling
- **Vite** - Build tool and dev server

## Running

```bash
make dev
```

This will install dependencies with Bun and start the development server on http://localhost:3003

## Mathematical Formula

The core formula maintaining 2x leverage:

```
x₀ = (collateral_value + √(collateral_value² - 4 × collateral_value × LEV_RATIO × debt)) / (2 × LEV_RATIO)
```

Where:
- `LEV_RATIO = 4/9` for 2x leverage
- `LEV_RATIO = leverage² / (leverage² + 1)`

## Key Concepts Visualized

### Leverage Ratio
The system maintains exactly 2x leverage through the bonding curve. As market prices change, the AMM automatically rebalances debt and position to preserve this ratio.

### Yield Generation
Yields come from three sources:
1. **Interest Fees**: Automatically collected from borrowers
2. **Curve LP Fees**: Trading fees from the underlying Curve pool
3. **Rebalancing Fees**: Fees from AMM operations

### Market Isolation
Each market (WBTC, cbBTC, etc.) operates independently with isolated contracts, preventing cross-market contagion.

## Responsive Design

The visualization adapts to screen size:
- **Mobile/Tablet**: Single column layout
- **Desktop (1280px+)**: 2-column grid
- **Ultra-wide (1536px+)**: 4-column grid for maximum information density
- **Sticky Controls**: Always visible at top when scrolling
- **Wide Layout**: Reduced horizontal padding on large screens (up to 1920px)

## Educational Purpose

This visualization helps understand:
- How leveraged positions work in DeFi
- The relationship between collateral, debt, and leverage
- How bonding curves maintain constant leverage
- Yield distribution across different timeframes
- The impact of market price changes on positions
- Real-world scenarios through pre-configured examples

## Customization

The visualization uses realistic defaults but can be modified:
- Leverage ratio (currently fixed at 2x)
- Collateral ranges
- Interest rate ranges
- Chart colors and styling

All components are in `src/components/` and can be customized independently.
