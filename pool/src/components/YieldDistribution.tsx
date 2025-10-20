import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface YieldDistributionProps {
  exposure: number
  interestRate: number
  annualYield: number
}

export default function YieldDistribution({
  exposure,
  interestRate,
  annualYield,
}: YieldDistributionProps) {
  const monthlyYield = annualYield / 12
  const dailyYield = annualYield / 365

  const timeframeData = [
    { period: 'Daily', yield: dailyYield, color: '#3b82f6' },
    { period: 'Weekly', yield: dailyYield * 7, color: '#8b5cf6' },
    { period: 'Monthly', yield: monthlyYield, color: '#10b981' },
    { period: 'Quarterly', yield: monthlyYield * 3, color: '#f59e0b' },
    { period: 'Annual', yield: annualYield, color: '#ef4444' },
  ]

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Yield Distribution</h2>

      <div className="h-64 mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={timeframeData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="period" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(value: number) => `$${value.toLocaleString()}`}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '0.5rem',
              }}
            />
            <Bar dataKey="yield" radius={[8, 8, 0, 0]}>
              {timeframeData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Yield Breakdown */}
      <div className="space-y-3">
        <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
          <div>
            <div className="text-sm font-medium text-gray-700">Daily Yield</div>
            <div className="text-xs text-gray-500">
              ({interestRate}% APR on ${exposure.toLocaleString()})
            </div>
          </div>
          <span className="text-lg font-mono font-semibold text-blue-900">
            ${dailyYield.toFixed(2)}
          </span>
        </div>

        <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
          <div>
            <div className="text-sm font-medium text-gray-700">Monthly Yield</div>
            <div className="text-xs text-gray-500">Compounded monthly</div>
          </div>
          <span className="text-lg font-mono font-semibold text-green-900">
            ${monthlyYield.toFixed(2)}
          </span>
        </div>

        <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg border-2 border-purple-300">
          <div>
            <div className="text-sm font-medium text-gray-700">Annual Yield</div>
            <div className="text-xs text-gray-500">Total per year</div>
          </div>
          <span className="text-lg font-mono font-semibold text-purple-900">
            ${annualYield.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Yield Components */}
      <div className="mt-6 p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200">
        <div className="text-sm font-semibold text-gray-700 mb-3">Yield Sources</div>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-600">• Interest fees from borrowers</span>
            <span className="font-mono text-green-900">Auto-collected</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">• Curve LP trading fees</span>
            <span className="font-mono text-green-900">Enhanced</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">• AMM rebalancing fees</span>
            <span className="font-mono text-green-900">Distributed</span>
          </div>
        </div>
      </div>

      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-600">
          💰 Yields are automatically collected by the AMM and distributed to your yb-token position.
          Fees are donated back to the Curve pool, enhancing overall liquidity.
        </p>
      </div>
    </div>
  )
}
