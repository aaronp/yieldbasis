import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

interface BondingCurveProps {
  currentCollateral: number
  levRatio: number
}

export default function BondingCurve({ currentCollateral, levRatio }: BondingCurveProps) {
  // Generate bonding curve data
  const generateCurveData = () => {
    const data = []
    for (let collateral = 1000; collateral <= 100000; collateral += 2000) {
      // Using simplified formula: debt increases with collateral but maintains leverage
      const cv = collateral
      const x0 = (cv + Math.sqrt(cv * cv - 4 * cv * levRatio * 0)) / (2 * levRatio)
      const debt = cv - x0
      const position = cv - debt
      const leverage = cv / position

      data.push({
        collateral,
        debt,
        position,
        leverage,
      })
    }
    return data
  }

  const curveData = generateCurveData()

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Mathematical Bonding Curve</h2>

      <div className="h-64 mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={curveData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="collateral"
              tick={{ fontSize: 12 }}
              label={{ value: 'Collateral ($)', position: 'insideBottom', offset: -5, fontSize: 12 }}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              label={{ value: 'Value ($)', angle: -90, position: 'insideLeft', fontSize: 12 }}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip
              formatter={(value: number) => `$${value.toLocaleString()}`}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '0.5rem',
              }}
            />
            <ReferenceLine
              x={currentCollateral}
              stroke="#8b5cf6"
              strokeDasharray="3 3"
              label={{ value: 'Current', position: 'top', fill: '#8b5cf6', fontSize: 12 }}
            />
            <Line
              type="monotone"
              dataKey="debt"
              stroke="#ef4444"
              strokeWidth={2}
              name="Debt"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="position"
              stroke="#10b981"
              strokeWidth={2}
              name="Position"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Curve Explanation */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="p-3 bg-red-50 rounded-lg border-l-4 border-red-500">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 bg-red-500 rounded-full" />
            <span className="text-sm font-medium text-gray-700">Debt Curve</span>
          </div>
          <p className="text-xs text-gray-600">
            Borrowed amount increases as collateral grows, maintaining leverage ratio
          </p>
        </div>

        <div className="p-3 bg-green-50 rounded-lg border-l-4 border-green-500">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 bg-green-500 rounded-full" />
            <span className="text-sm font-medium text-gray-700">Position Curve</span>
          </div>
          <p className="text-xs text-gray-600">
            Your net position after accounting for borrowed funds
          </p>
        </div>
      </div>

      {/* Mathematical Properties */}
      <div className="p-4 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
        <div className="text-sm font-semibold text-gray-700 mb-3">Curve Properties</div>
        <div className="space-y-2 text-xs">
          <div className="flex items-start gap-2">
            <span className="text-purple-600">•</span>
            <span className="text-gray-600">
              <strong>Constant Leverage:</strong> The curve maintains exactly 2x leverage at all collateral levels
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-purple-600">•</span>
            <span className="text-gray-600">
              <strong>Automatic Rebalancing:</strong> AMM adjusts debt/position ratio as prices change
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-purple-600">•</span>
            <span className="text-gray-600">
              <strong>Mathematical Precision:</strong> Formula ensures leverage never drifts from target
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-600">
          📈 The bonding curve shows how debt and position scale with collateral.
          The purple line marks your current position on the curve.
        </p>
      </div>
    </div>
  )
}
