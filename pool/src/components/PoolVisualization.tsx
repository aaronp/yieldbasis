import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

interface PoolVisualizationProps {
  collateral: number
  debt: number
  position: number
  exposure: number
}

export default function PoolVisualization({
  collateral,
  debt,
  position,
  exposure,
}: PoolVisualizationProps) {
  const data = [
    { name: 'Your Position', value: position, color: '#10b981' },
    { name: 'Borrowed (Debt)', value: debt, color: '#ef4444' },
  ]

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Pool Composition</h2>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
              label={(entry) => `$${entry.value.toLocaleString()}`}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-6 space-y-3">
        <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
          <span className="text-sm font-medium text-gray-700">Collateral (Curve LP)</span>
          <span className="text-sm font-mono font-semibold text-blue-900">
            ${collateral.toLocaleString()}
          </span>
        </div>

        <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
          <span className="text-sm font-medium text-gray-700">Borrowed Amount</span>
          <span className="text-sm font-mono font-semibold text-red-900">
            ${debt.toLocaleString()}
          </span>
        </div>

        <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
          <span className="text-sm font-medium text-gray-700">Net Position</span>
          <span className="text-sm font-mono font-semibold text-green-900">
            ${position.toLocaleString()}
          </span>
        </div>

        <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg border-2 border-purple-300">
          <span className="text-sm font-medium text-gray-700">Total Exposure (2x)</span>
          <span className="text-sm font-mono font-semibold text-purple-900">
            ${exposure.toLocaleString()}
          </span>
        </div>
      </div>

      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-600">
          💡 Your collateral is used to borrow additional funds, giving you 2x exposure to the Curve LP position.
          The AMM automatically rebalances to maintain this leverage ratio.
        </p>
      </div>
    </div>
  )
}
