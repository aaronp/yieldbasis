interface LeverageCalculatorProps {
  collateral: number
  debt: number
  leverage: number
  levRatio: number
}

export default function LeverageCalculator({
  collateral,
  debt,
  leverage,
  levRatio,
}: LeverageCalculatorProps) {
  const position = collateral - debt
  const effectiveLeverage = collateral / position

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Leverage Mechanics</h2>

      {/* Visual Leverage Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-xs text-gray-600 mb-2">
          <span>1x (No Leverage)</span>
          <span>Current: {effectiveLeverage.toFixed(2)}x</span>
          <span>3x (High Leverage)</span>
        </div>
        <div className="relative h-8 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="absolute h-full bg-gradient-to-r from-blue-400 to-purple-600 transition-all duration-300"
            style={{ width: `${Math.min((effectiveLeverage / 3) * 100, 100)}%` }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-semibold text-white drop-shadow">
              {effectiveLeverage.toFixed(2)}x Leverage
            </span>
          </div>
        </div>
      </div>

      {/* Leverage Breakdown */}
      <div className="space-y-4">
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">Your Capital</span>
            <span className="text-sm font-mono font-semibold">
              ${position.toLocaleString()}
            </span>
          </div>
          <div className="h-6 bg-green-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500"
              style={{ width: `${(position / collateral) * 100}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">Borrowed</span>
            <span className="text-sm font-mono font-semibold">
              ${debt.toLocaleString()}
            </span>
          </div>
          <div className="h-6 bg-red-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-red-500"
              style={{ width: `${(debt / collateral) * 100}%` }}
            />
          </div>
        </div>

        <div className="pt-3 border-t border-gray-200">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Total Position</span>
            <span className="text-sm font-mono font-semibold">
              ${collateral.toLocaleString()}
            </span>
          </div>
          <div className="h-6 bg-purple-100 rounded-full overflow-hidden">
            <div className="h-full bg-purple-500" style={{ width: '100%' }} />
          </div>
        </div>
      </div>

      {/* Formula Card */}
      <div className="mt-6 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
        <div className="text-xs font-semibold text-gray-700 mb-2">LEV_RATIO Constant</div>
        <div className="font-mono text-sm text-gray-900 mb-1">
          {levRatio.toFixed(4)} = {leverage}² / ({leverage}² + 1)
        </div>
        <div className="text-xs text-gray-600 mt-2">
          This constant ensures the pool maintains exactly {leverage}x leverage through the bonding curve formula.
        </div>
      </div>

      {/* Effective Leverage Display */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="p-3 bg-blue-50 rounded-lg text-center">
          <div className="text-xs text-gray-600">Target Leverage</div>
          <div className="text-2xl font-bold text-blue-900">{leverage}x</div>
        </div>
        <div className="p-3 bg-purple-50 rounded-lg text-center">
          <div className="text-xs text-gray-600">Actual Leverage</div>
          <div className="text-2xl font-bold text-purple-900">
            {effectiveLeverage.toFixed(2)}x
          </div>
        </div>
      </div>
    </div>
  )
}
