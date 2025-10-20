import { useState } from 'react'
import PoolVisualization from './components/PoolVisualization'
import LeverageCalculator from './components/LeverageCalculator'
import YieldDistribution from './components/YieldDistribution'
import BondingCurve from './components/BondingCurve'

function App() {
  const [collateral, setCollateral] = useState(10000) // USD value
  const [marketPrice, setMarketPrice] = useState(1.0) // Price multiplier
  const [interestRate, setInterestRate] = useState(5) // Annual %

  const LEV_RATIO = 4 / 9 // For 2x leverage
  const leverage = 2

  // Calculate debt using the YieldBasis formula
  const calculateDebt = (collateralValue: number) => {
    const cv = collateralValue
    const x0 = (cv + Math.sqrt(cv * cv - 4 * cv * LEV_RATIO * 0)) / (2 * LEV_RATIO)
    return cv - x0
  }

  const debt = calculateDebt(collateral * marketPrice)
  const position = collateral * marketPrice - debt
  const exposure = position * leverage
  const annualYield = (exposure * interestRate) / 100

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900">
            YieldBasis Pool Visualization
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Interactive visualization of 2x leveraged Curve LP positions with automatic AMM rebalancing
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Controls */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Market Controls</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Collateral Slider */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Collateral Value (Curve LP)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="1000"
                  max="100000"
                  step="1000"
                  value={collateral}
                  onChange={(e) => setCollateral(Number(e.target.value))}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-sm font-mono text-gray-900 w-24 text-right">
                  ${collateral.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Market Price Slider */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Market Price Change
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0.5"
                  max="1.5"
                  step="0.01"
                  value={marketPrice}
                  onChange={(e) => setMarketPrice(Number(e.target.value))}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-sm font-mono text-gray-900 w-24 text-right">
                  {((marketPrice - 1) * 100).toFixed(0)}%
                </span>
              </div>
            </div>

            {/* Interest Rate Slider */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Annual Interest Rate
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="20"
                  step="0.5"
                  value={interestRate}
                  onChange={(e) => setInterestRate(Number(e.target.value))}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-sm font-mono text-gray-900 w-24 text-right">
                  {interestRate.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Visualizations Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Pool Composition */}
          <PoolVisualization
            collateral={collateral * marketPrice}
            debt={debt}
            position={position}
            exposure={exposure}
          />

          {/* Leverage Calculator */}
          <LeverageCalculator
            collateral={collateral * marketPrice}
            debt={debt}
            leverage={leverage}
            levRatio={LEV_RATIO}
          />

          {/* Yield Distribution */}
          <YieldDistribution
            exposure={exposure}
            interestRate={interestRate}
            annualYield={annualYield}
          />

          {/* Bonding Curve */}
          <BondingCurve
            currentCollateral={collateral}
            levRatio={LEV_RATIO}
          />
        </div>

        {/* Formula Explanation */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Mathematical Formula</h2>
          <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm">
            <div className="mb-2">
              x₀ = (collateral_value + √(collateral_value² - 4 × collateral_value × LEV_RATIO × debt)) / (2 × LEV_RATIO)
            </div>
            <div className="text-gray-600 text-xs mt-3">
              Where LEV_RATIO = leverage² / (leverage² + 1) = 4/9 for 2x leverage
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="text-xs text-gray-600">Collateral Value</div>
              <div className="text-lg font-semibold text-blue-900">
                ${(collateral * marketPrice).toLocaleString()}
              </div>
            </div>
            <div className="bg-red-50 rounded-lg p-3">
              <div className="text-xs text-gray-600">Debt</div>
              <div className="text-lg font-semibold text-red-900">
                ${debt.toLocaleString()}
              </div>
            </div>
            <div className="bg-green-50 rounded-lg p-3">
              <div className="text-xs text-gray-600">Position</div>
              <div className="text-lg font-semibold text-green-900">
                ${position.toLocaleString()}
              </div>
            </div>
            <div className="bg-purple-50 rounded-lg p-3">
              <div className="text-xs text-gray-600">2x Exposure</div>
              <div className="text-lg font-semibold text-purple-900">
                ${exposure.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
