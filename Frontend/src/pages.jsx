// pages.jsx
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { 
  getDashboard, 
  getTransactions, 
  getCategories, 
  getSmartSpendingSummary,
  smartSpendingSummaryQueryKey,
  deleteTransaction, 
  getJars, 
  createJar, 
  moveJar, 
  addBudget,
  addCategory,
  deleteCategory,
  setMonthlyIncome
} from './api'
import { shiftSelectedDate } from './spendingSummary'

const vnd = (n) => (n || 0).toLocaleString('vi-VN') + ' đ'
const colorMap = { ok: 'bg-sage', warning: 'bg-amber', exceeded: 'bg-alert' }

const Bar = ({ pct, cls }) => (
  <div className="h-2.5 rounded-full bg-mist dark:bg-gray-800 overflow-hidden">
    <div className={`h-full transition-all duration-300 ${cls}`} style={{ width: `${Math.min(pct, 100)}%` }} />
  </div>
)

// Cập nhật Card tự động đổi màu theo chế độ tối
const Card = ({ children, className = '' }) => (
  <div className={`bg-white dark:bg-gray-900 text-ink dark:text-gray-100 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800 transition-colors ${className}`}>
    {children}
  </div>
)

// Thành phần Biểu đồ Phân tích Chi tiêu dạng Visual Bars
function CategorySpendingChart({ data }) {
  if (!data || !data.length) return <p className="text-sm text-gray-400">Chưa có dữ liệu chi tiêu tháng này.</p>

  const colors = ['bg-sage', 'bg-amber', 'bg-sky-500', 'bg-indigo-500', 'bg-rose-400']

  return (
    <div className="space-y-3">
      {data.map((item, idx) => (
        <div key={item.name} className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="font-medium flex items-center gap-1.5">
              <span>{item.icon}</span> {item.name}
            </span>
            <span className="font-semibold text-gray-600 dark:text-gray-300">{vnd(item.amount)} ({item.percentage}%)</span>
          </div>
          <Bar pct={item.percentage} cls={colors[idx % colors.length]} />
        </div>
      ))}
    </div>
  )
}

function BudgetList({ items, filterPeriod = 'all' }) {
  const filtered = filterPeriod === 'all' ? items : items.filter((b) => b.period_type === filterPeriod)

  if (!filtered.length) return <p className="text-sm text-gray-400">Chưa có hạn mức nào trong mục này.</p>

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {filtered.map((b) => (
        <Card key={`${b.category_id}-${b.period_type}`}>
          <div className="flex justify-between items-center mb-1">
            <span className="font-bold flex items-center gap-2">
              <span className="text-xl">{b.category?.icon}</span> {b.category?.name}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
              b.period_type === 'daily' ? 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400' : 'bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400'
            }`}>
              {b.period_type === 'daily' ? 'Hàng ngày' : 'Hàng tháng'}
            </span>
          </div>
          <div className="flex justify-between text-xs text-gray-500 font-medium">
            <span>Đã dùng: {vnd(b.spent)}</span>
            <span>Hạn mức: {vnd(b.limit_amount)}</span>
          </div>
          <Bar pct={b.percent_used} cls={colorMap[b.warning_level]} />
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-gray-600 dark:text-gray-400">{b.percent_used}% hạn mức</span>
            {b.is_exceeded && (
              <span className="text-alert font-bold">Vượt {vnd(b.spent - b.limit_amount)}</span>
            )}
          </div>
        </Card>
      ))}
    </div>
  )
}

function JarCard({ j }) {
  const qc = useQueryClient()
  const pct = Math.round((j.current_amount / j.target_amount) * 100)
  const m = useMutation({ mutationFn: moveJar, onSuccess: () => qc.invalidateQueries() })

  const ask = (sign) => {
    const action = sign > 0 ? 'Nạp' : 'Rút'
    const input = prompt(`[${j.name}]\nNhập số tiền muốn ${action.toLowerCase()} (VNĐ):`)
    if (!input) return
    const val = Number(input.replace(/\D/g, ''))
    if (val > 0) m.mutate({ id: j.id, amount: sign * val })
  }

  return (
    <Card className="flex flex-col justify-between space-y-3">
      <div className="space-y-2">
        <div className="flex justify-between items-start">
          <h4 className="font-bold text-ink text-base">{j.name}</h4>
          <span className="text-xs font-bold bg-sage/10 text-sage px-2 py-1 rounded-lg">{pct}%</span>
        </div>
        <Bar pct={pct} cls="bg-sage" />
        <div className="text-xs text-gray-500 space-y-0.5">
          <div>Đã tích lũy: <b className="text-ink">{vnd(j.current_amount)}</b> / {vnd(j.target_amount)}</div>
          {j.deadline && <div>Hạn hoàn thành: {j.deadline}</div>}
          {j.allocation_percentage > 0 && (
            <div className="text-sage font-medium">⚡ Tự động trích {j.allocation_percentage}% khi có thu nhập</div>
          )}
        </div>
      </div>
      <div className="flex gap-2 pt-2 border-t border-gray-50 dark:border-gray-800">
        <button onClick={() => ask(1)} className="flex-1 py-1.5 rounded-xl bg-sage hover:bg-sage/90 text-white font-medium text-xs transition-all">
          + Nạp tiền
        </button>
        <button onClick={() => ask(-1)} className="flex-1 py-1.5 rounded-xl bg-mist dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-ink font-medium text-xs transition-all">
          - Rút tiền
        </button>
      </div>
      {m.error && <p className="text-alert text-xs font-medium">{m.error.message}</p>}
    </Card>
  )
}

const summaryPeriods = [
  { value: 'day', label: 'Ngày' },
  { value: 'week', label: 'Tuần' },
  { value: 'month', label: 'Tháng' },
  { value: 'year', label: 'Năm' }
]

const localDateKey = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function SmartSpendingSummary() {
  const [period, setPeriod] = useState('month')
  const [selectedDate, setSelectedDate] = useState(localDateKey)
  const [navigationAnchorDate, setNavigationAnchorDate] = useState(localDateKey)
  const todayDate = localDateKey()
  const nextDate = shiftSelectedDate(selectedDate, period, 1, navigationAnchorDate)
  const { data, isLoading, error } = useQuery({
    queryKey: smartSpendingSummaryQueryKey(period, selectedDate),
    queryFn: () => getSmartSpendingSummary({ period, selectedDate, todayDate })
  })

  const changeDate = (direction) => setSelectedDate((current) => shiftSelectedDate(current, period, direction, navigationAnchorDate))
  const selectPeriod = (nextPeriod) => {
    setPeriod(nextPeriod)
    setNavigationAnchorDate(selectedDate)
  }
  const changeClass = (change) => change > 0
    ? 'text-alert'
    : change < 0
      ? 'text-sage'
      : 'text-gray-500 dark:text-gray-400'
  const changeLabel = (change, percent) => {
    if (change === 0) return 'Không đổi'
    const sign = change > 0 ? '+' : '−'
    const percentage = percent === null ? '' : ` (${Math.abs(percent)}%)`
    return `${sign}${vnd(Math.abs(change))}${percentage}`
  }

  return (
    <Card>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 font-bold text-ink dark:text-gray-100">
            <span aria-hidden="true">✨</span> Tóm tắt thông minh
          </h3>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Kỳ này: {data?.currentRange.label || selectedDate} · So sánh: {data?.previousRange.label || 'kỳ liền trước'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 rounded-xl bg-mist p-1 dark:bg-gray-800" aria-label="Chọn khoảng thời gian">
            {summaryPeriods.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={period === option.value}
                onClick={() => selectPeriod(option.value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                  period === option.value
                    ? 'bg-white text-ink shadow-sm dark:bg-gray-900 dark:text-gray-100'
                    : 'text-gray-500 hover:text-ink dark:text-gray-400 dark:hover:text-white'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => changeDate(-1)}
              aria-label="Xem kỳ trước"
              className="rounded-lg bg-mist px-3 py-1.5 text-sm font-bold text-ink hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedDate(todayDate)
                setNavigationAnchorDate(todayDate)
              }}
              disabled={selectedDate === todayDate}
              className="rounded-lg bg-mist px-3 py-1.5 text-xs font-semibold text-ink hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
            >
              Hôm nay
            </button>
            <button
              type="button"
              onClick={() => changeDate(1)}
              disabled={nextDate > todayDate}
              aria-label="Xem kỳ sau"
              className="rounded-lg bg-mist px-3 py-1.5 text-sm font-bold text-ink hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
            >
              ›
            </button>
          </div>
        </div>
      </div>

      {period === 'day' && selectedDate === todayDate && (
        <p className="mt-3 rounded-xl bg-amber/10 px-3 py-2 text-xs text-gray-600 dark:text-gray-300">
          So sánh tổng chi cả ngày; giao dịch hiện chưa lưu giờ nên chưa thể so cùng thời điểm trong ngày.
        </p>
      )}

      {isLoading ? (
        <p className="mt-5 text-sm text-gray-500 dark:text-gray-400" role="status">Đang tổng hợp chi tiêu…</p>
      ) : error ? (
        <p className="mt-5 text-sm font-medium text-alert" role="alert">Không thể tải tóm tắt chi tiêu. Vui lòng thử lại.</p>
      ) : data ? (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-mist/70 p-3 dark:bg-gray-800/70">
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">Chi tiêu kỳ này</div>
              <div className="mt-1 font-bold text-ink dark:text-gray-100">{vnd(data.currentTotal)}</div>
              <div className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">{data.currentRange.label}</div>
            </div>
            <div className="rounded-xl bg-mist/70 p-3 dark:bg-gray-800/70">
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">Kỳ so sánh</div>
              <div className="mt-1 font-bold text-ink dark:text-gray-100">{vnd(data.previousTotal)}</div>
              <div className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">{data.previousRange.label}</div>
            </div>
            <div className="rounded-xl bg-mist/70 p-3 dark:bg-gray-800/70">
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">Chênh lệch</div>
              <div className={`mt-1 font-bold ${changeClass(data.change)}`}>
                {changeLabel(data.change, data.changePercent)}
              </div>
              <div className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
                {data.change > 0 ? 'Chi tiêu tăng' : data.change < 0 ? 'Chi tiêu giảm' : 'Không thay đổi'}
              </div>
            </div>
          </div>

          <p className="mt-4 rounded-xl border border-sage/20 bg-sage/5 px-3 py-2.5 text-sm font-medium text-ink dark:text-gray-100">
            {data.insight}
          </p>

          {data.categories.length > 0 ? (
            <div className="mt-4 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Chi tiết theo danh mục</h4>
              {data.categories.map((category) => (
                <div key={category.key} className="rounded-xl border border-gray-100 p-3 dark:border-gray-800">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-ink dark:text-gray-100">
                        <span className="mr-1.5" aria-hidden="true">{category.icon}</span>{category.name}
                        {category.status === 'new' && <span className="ml-2 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600 dark:bg-blue-950 dark:text-blue-400">Mới phát sinh</span>}
                        {category.status === 'stopped' && <span className="ml-2 rounded-full bg-mist px-2 py-0.5 text-[10px] font-bold text-gray-600 dark:bg-gray-800 dark:text-gray-300">Không phát sinh kỳ này</span>}
                      </div>
                      <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Kỳ này {vnd(category.amount)} · Kỳ trước {vnd(category.previousAmount)}
                      </div>
                    </div>
                    <span className={`shrink-0 text-xs font-bold ${changeClass(category.change)}`}>
                      {changeLabel(category.change, category.changePercent)}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-mist dark:bg-gray-800" aria-label={`Tỷ trọng chi tiêu ${category.share}%`}>
                      <div className="h-full rounded-full bg-sage" style={{ width: `${Math.min(category.share, 100)}%` }} />
                    </div>
                    <span className="w-9 text-right text-[11px] font-semibold text-gray-500 dark:text-gray-400">{category.share}%</span>
                  </div>
                  {(data.largestIncrease?.key === category.key || data.largestDecrease?.key === category.key) && (
                    <div className="mt-1 text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                      {data.largestIncrease?.key === category.key ? 'Danh mục tăng nhiều nhất theo số tiền' : 'Danh mục giảm nhiều nhất theo số tiền'}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Không có khoản chi nào trong hai kỳ so sánh.</p>
          )}
        </>
      ) : null}
    </Card>
  )
}

// DASHBOARD PAGE
export function Dashboard() {
  const { data } = useQuery({ queryKey: ['dashboard'], queryFn: getDashboard })
  
  const [viewMode, setViewMode] = useState('month') // 'today' | 'month' | 'year'
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()))
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth() + 1).padStart(2, '0'))

  if (!data) return <div className="p-8 text-center text-gray-400">Đang tải dữ liệu tài chính...</div>

  const { summary = {}, budgets = [], jars = [], spendingToday = [], structuredYears = [] } = data

  // Lấy dữ liệu của năm đang chọn
  const currentYearData = structuredYears.find(y => y.year === selectedYear) || { totalYear: 0, months: [] }

  let currentChartData = []
  let currentTotalHeading = 0

  if (viewMode === 'today') {
    currentChartData = spendingToday
    currentTotalHeading = spendingToday.reduce((s, i) => s + i.amount, 0)
  } else if (viewMode === 'month') {
    const foundMonth = currentYearData.months.find(m => m.monthKey === selectedMonth)
    currentChartData = foundMonth ? foundMonth.categories : []
    currentTotalHeading = foundMonth ? foundMonth.total : 0
  } else {
    // Tổng cả năm: gộp tất cả danh mục trong năm đó lại
    const yearCatsMap = {}
    currentYearData.months.forEach(m => {
      m.categories.forEach(c => {
        if (!yearCatsMap[c.name]) yearCatsMap[c.name] = { name: c.name, icon: c.icon, amount: 0 }
        yearCatsMap[c.name].amount += c.amount
      })
    })
    currentChartData = Object.values(yearCatsMap).map(c => ({
      ...c,
      percentage: currentYearData.totalYear > 0 ? Math.round((c.amount / currentYearData.totalYear) * 100) : 0
    }))
    currentTotalHeading = currentYearData.totalYear
  }

  return (
    <div className="space-y-6">
      {/* Overview Metric Cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 text-center">
          <div className="text-xs font-semibold text-gray-400 uppercase">Thu nhập tháng</div>
          <div className="text-sm sm:text-lg font-bold text-sage mt-1">+{vnd(summary.totalIncome)}</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-xs font-semibold text-gray-400 uppercase">Chi tiêu năm {selectedYear}</div>
          <div className="text-sm sm:text-lg font-bold text-alert mt-1">-{vnd(currentYearData.totalYear)}</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-xs font-semibold text-gray-400 uppercase">Thặng dư</div>
          <div className={`text-sm sm:text-lg font-bold mt-1 ${summary.netSavings >= 0 ? 'text-ink' : 'text-alert'}`}>
            {vnd(summary.netSavings)}
          </div>
        </Card>
      </div>

      <SmartSpendingSummary />

      {/* Spending Analytics Chart */}
      <Card>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
        <div>
          <h3 className="font-bold text-ink flex items-center gap-2">
            <span>📊</span> Phân tích chi tiêu ({viewMode === 'today' ? 'Hôm nay' : viewMode === 'month' ? `Tháng ${Number(selectedMonth)}/${selectedYear}` : `Cả năm ${selectedYear}`})
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Tổng chi kỳ này: <b className="text-alert">{vnd(currentTotalHeading)}</b>
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Chỉ hiện thị bộ chọn Năm khi KHÔNG ở chế độ Hôm nay */}
          {viewMode !== 'today' && (
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-mist dark:bg-gray-800 text-ink dark:text-white text-xs font-bold px-3 py-1.5 rounded-xl outline-none border border-gray-200 dark:border-gray-700"
            >
              {structuredYears.map(y => (
                <option key={y.year} value={y.year}>Năm {y.year}</option>
              ))}
            </select>
          )}

          {/* Các nút chế độ xem: Hôm nay / Theo tháng / Cả năm */}
          <div className="flex gap-1 p-1 bg-mist dark:bg-gray-800 rounded-xl">
            <button
              onClick={() => setViewMode('today')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                viewMode === 'today' ? 'bg-white dark:bg-gray-900 text-ink shadow-sm' : 'text-gray-400 hover:text-ink'
              }`}
            >
              Hôm nay
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                viewMode === 'month' ? 'bg-white dark:bg-gray-900 text-ink shadow-sm' : 'text-gray-400 hover:text-ink'
              }`}
            >
              Theo tháng
            </button>
            <button
              onClick={() => setViewMode('year')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                viewMode === 'year' ? 'bg-white dark:bg-gray-900 text-ink shadow-sm' : 'text-gray-400 hover:text-ink'
              }`}
            >
              Cả năm
            </button>
          </div>
        </div>
      </div>

        {/* Thanh chọn Tháng chuẩn thứ tự từ Tháng 1 -> Tháng 12 */}
        {viewMode === 'month' && (
          <div className="flex gap-1 overflow-x-auto pb-3 mb-3 border-b border-gray-100 dark:border-gray-800">
            {currentYearData.months.map(m => (
              <button
                key={m.monthKey}
                onClick={() => setSelectedMonth(m.monthKey)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg whitespace-nowrap transition-all ${
                  selectedMonth === m.monthKey
                    ? 'bg-sage text-white'
                    : 'bg-mist dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                Tháng {m.monthNumber}
              </button>
            ))}
          </div>
        )}

        <CategorySpendingChart data={currentChartData} />
      </Card>

      {/* Daily/Monthly Budgets */}
      <section>
        <h3 className="font-bold text-ink mb-3 flex items-center gap-2">
          <span>⚡</span> Hạn mức ngân sách
        </h3>
        <BudgetList items={budgets} />
      </section>

      {/* Savings Jars */}
      <section>
        <h3 className="font-bold text-ink mb-3 flex items-center gap-2">
          <span>🏺</span> Các hũ tiết kiệm
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {jars.map((j) => (
            <JarCard key={j.id} j={j} />
          ))}
        </div>
      </section>
    </div>
  )
}

// TRANSACTIONS PAGE
export function Transactions() {
  const qc = useQueryClient()
  const { data: txs = [] } = useQuery({ queryKey: ['transactions'], queryFn: getTransactions })
  const { data: cats = [] } = useQuery({ queryKey: ['categories'], queryFn: getCategories })
  const del = useMutation({ mutationFn: deleteTransaction, onSuccess: () => qc.invalidateQueries() })

  if (!txs.length) return <Card className="text-center py-8 text-gray-400">Chưa có giao dịch nào được ghi chép.</Card>

  return (
    <Card className="p-2 divide-y divide-gray-100 dark:divide-gray-800">
      {txs.map((t) => {
        const c = cats.find((x) => x.id === t.category_id)
        const isIncome = t.type === 'income'

        return (
          <div key={t.id} className="flex items-center justify-between p-3 hover:bg-mist/50 dark:hover:bg-gray-800/50 rounded-xl transition-all">
            <div className="flex items-center gap-3">
              <span className="text-2xl p-2 bg-mist dark:bg-gray-800 rounded-xl">{c?.icon || '💵'}</span>
              <div>
                <div className="font-bold text-sm text-ink">{t.note || c?.name}</div>
                <div className="text-xs text-gray-400">{t.date} · {c?.name}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`font-bold text-sm ${isIncome ? 'text-sage' : 'text-ink'}`}>
                {isIncome ? '+' : '-'}{vnd(t.amount)}
              </span>
              <button
                aria-label="Xóa giao dịch"
                onClick={() => {
                  if (confirm('Bạn có chắc muốn xóa giao dịch này?')) del.mutate(t.id)
                }}
                className="text-gray-300 hover:text-alert p-1 transition-all"
              >
                ✕
              </button>
            </div>
          </div>
        )
      })}
    </Card>
  )
}

// BUDGETS PAGE
export function Budgets() {
  const qc = useQueryClient()
  const { data } = useQuery({ queryKey: ['dashboard'], queryFn: getDashboard })
  const { data: cats = [] } = useQuery({ queryKey: ['categories'], queryFn: getCategories })
  
  const [tab, setTab] = useState('all')
  const [f, setF] = useState({ category_id: '', limit_amount: '', period_type: 'daily' })
  
  // State quản lý form thêm danh mục mới
  const [showAddCat, setShowAddCat] = useState(false)
  const [newCat, setNewCat] = useState({ name: '', icon: '📌', type: 'expense' })

  const addM = useMutation({
    mutationFn: addBudget,
    onSuccess: () => {
      qc.invalidateQueries()
      setF({ category_id: '', limit_amount: '', period_type: 'daily' })
    }
  })

  const [monthlyIncomeInput, setMonthlyIncomeInput] = useState('')
  const incomeM = useMutation({
    mutationFn: setMonthlyIncome,
    onSuccess: () => {
      qc.invalidateQueries()
      setMonthlyIncomeInput('')
      alert('Đã cập nhật thu nhập tháng thành công!')
    }
  })

  // Mutation thêm danh mục
  const addCatM = useMutation({
    mutationFn: addCategory,
    onSuccess: () => {
      qc.invalidateQueries()
      setNewCat({ name: '', icon: '📌', type: 'expense' })
      setShowAddCat(false)
    }
  })

  const delCatM = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => qc.invalidateQueries(),
    onError: (err) => alert(err.message)
  })

  const expenseCats = cats.filter(c => c.type === 'expense')

  return ( 
    <div className="space-y-6">
      {/* Form Tạo / Đặt Hạn Mức */}
      <Card>
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold text-ink">Thiết lập hạn mức ngân sách</h3>
          <button 
            onClick={() => setShowAddCat(!showAddCat)} 
            className="text-xs font-semibold text-sage hover:underline"
          >
            {showAddCat ? '✕ Đóng quản lý danh mục' : '⚙️ Quản lý danh mục'}
          </button>
        </div>

        {/* Khu vực Quản lý / Thêm & Xóa danh mục */}
        {showAddCat && (
          <div className="mb-4 p-4 bg-mist dark:bg-gray-800 rounded-xl space-y-4 border border-sage/20">
            <div className="text-xs font-bold text-gray-500 uppercase">Danh sách danh mục hiện tại</div>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1">
              {cats.map(c => (
                <div key={c.id} className="flex items-center gap-1.5 bg-white dark:bg-gray-900 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs">
                  <span>{c.icon}</span>
                  <span>{c.name}</span>
                  <span className="text-[10px] opacity-50">({c.type === 'expense' ? 'Chi' : 'Thu'})</span>
                  <button 
                    onClick={() => {
                      if (confirm(`Xóa danh mục "${c.name}"?`)) delCatM.mutate(c.id)
                    }}
                    className="ml-1 text-gray-400 hover:text-alert font-bold"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <div className="text-xs font-bold text-gray-500 uppercase pt-2 border-t border-gray-200 dark:border-gray-700">Tạo danh mục mới</div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <input
                placeholder="Icon (Emoji)"
                value={newCat.icon}
                onChange={(e) => setNewCat({ ...newCat, icon: e.target.value })}
                className="border border-gray-200 dark:border-gray-700 rounded-xl p-2 text-sm bg-white dark:bg-gray-900 outline-none"
              />
              <input
                placeholder="Tên danh mục..."
                value={newCat.name}
                onChange={(e) => setNewCat({ ...newCat, name: e.target.value })}
                className="border border-gray-200 dark:border-gray-700 rounded-xl p-2 text-sm bg-white dark:bg-gray-900 outline-none"
              />
              <select
                value={newCat.type}
                onChange={(e) => setNewCat({ ...newCat, type: e.target.value })}
                className="border border-gray-200 dark:border-gray-700 rounded-xl p-2 text-sm bg-white dark:bg-gray-900 outline-none"
              >
                <option value="expense">Chi tiêu</option>
                <option value="income">Thu nhập</option>
              </select>
              <button
                disabled={!newCat.name}
                onClick={() => addCatM.mutate(newCat)}
                className="bg-sage text-white rounded-xl py-2 font-bold text-xs disabled:opacity-40"
              >
                + Thêm danh mục
              </button>
            </div>
          </div>
        )}

        {/* Form thiết lập hạn mức */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <select
            value={f.category_id}
            onChange={(e) => setF({ ...f, category_id: Number(e.target.value) })}
            className="border border-gray-200 dark:border-gray-700 rounded-xl p-2.5 text-sm bg-white dark:bg-gray-800 dark:text-white outline-none"
          >
            <option value="">-- Chọn danh mục --</option>
            {expenseCats.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>

          <select
            value={f.period_type}
            onChange={(e) => setF({ ...f, period_type: e.target.value })}
            className="border border-gray-200 dark:border-gray-700 rounded-xl p-2.5 text-sm bg-white dark:bg-gray-800 dark:text-white outline-none"
          >
            <option value="daily">Theo ngày</option>
            <option value="monthly">Theo tháng</option>
          </select>

          <input
            placeholder="Hạn mức (VNĐ)"
            inputMode="numeric"
            value={f.limit_amount ? Number(f.limit_amount).toLocaleString('vi-VN') : ''}
            onChange={(e) => setF({ ...f, limit_amount: e.target.value.replace(/\D/g, '') })}
            className="border border-gray-200 dark:border-gray-700 rounded-xl p-2.5 text-sm bg-white dark:bg-gray-800 dark:text-white outline-none"
          />

          <button
            disabled={!f.category_id || !f.limit_amount}
            onClick={() => addM.mutate({ ...f, limit_amount: Number(f.limit_amount) })}
            className="bg-ink text-white rounded-xl py-2.5 font-medium text-sm disabled:opacity-40 hover:bg-ink/90 transition-all"
          >
            Lưu hạn mức
          </button>
        </div>
      </Card>

      {/* Filter Tabs & List */}
      <div className="space-y-4">
        <div className="flex gap-2">
          {[['all', 'Tất cả'], ['daily', 'Hàng ngày'], ['monthly', 'Hàng tháng']].map(([v, l]) => (
            <button
              key={v}
              onClick={() => setTab(v)}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                tab === v ? 'bg-ink text-white' : 'bg-white dark:bg-gray-900 text-gray-500 hover:bg-mist dark:hover:bg-gray-800'
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        {data ? <BudgetList items={data.budgets} filterPeriod={tab} /> : <p className="text-gray-400">Đang tải...</p>}
      </div>
      <Card className="mb-6">
        <h3 className="font-bold text-ink mb-2">💰 Cài đặt thu nhập dự kiến tháng này</h3>
        <div className="flex gap-2">
          <input
            placeholder="Nhập tổng thu nhập (VNĐ)..."
            inputMode="numeric"
            value={monthlyIncomeInput ? Number(monthlyIncomeInput).toLocaleString('vi-VN') : ''}
            onChange={(e) => setMonthlyIncomeInput(e.target.value.replace(/\D/g, ''))}
            className="flex-1 border border-gray-200 dark:border-gray-700 rounded-xl p-2.5 text-sm bg-white dark:bg-gray-800 dark:text-white outline-none"
          />
          <button
            disabled={!monthlyIncomeInput}
            onClick={() => incomeM.mutate(Number(monthlyIncomeInput))}
            className="bg-sage text-white px-5 rounded-xl font-bold text-sm disabled:opacity-40 hover:bg-sage/90 transition-all"
          >
            Cập nhật
          </button>
        </div>
      </Card>
      
    </div>
  )
}

// JARS PAGE
export function Jars() {
  const qc = useQueryClient()
  const { data: jars = [] } = useQuery({ queryKey: ['jars'], queryFn: getJars })
  
  const [f, setF] = useState({ name: '', target_amount: '', allocation_percentage: 0, deadline: '' })

  const m = useMutation({
    mutationFn: createJar,
    onSuccess: () => {
      qc.invalidateQueries()
      setF({ name: '', target_amount: '', allocation_percentage: 0, deadline: '' })
    }
  })

  return (
    <div className="space-y-6">
      {/* Form Tạo Hũ mới */}
      <Card>
        <h3 className="font-bold text-ink mb-3">Tạo Hũ tiết kiệm mới</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <input
            placeholder="Tên hũ (Ví dụ: Mua Laptop, Đi du lịch...)"
            value={f.name}
            onChange={(e) => setF({ ...f, name: e.target.value })}
            className="border border-gray-200 dark:border-gray-700 rounded-xl p-2.5 text-sm bg-white dark:bg-gray-800 dark:text-white outline-none"
          />
          <input
            placeholder="Mục tiêu tích lũy (VNĐ)"
            inputMode="numeric"
            value={f.target_amount ? Number(f.target_amount).toLocaleString('vi-VN') : ''}
            onChange={(e) => setF({ ...f, target_amount: e.target.value.replace(/\D/g, '') })}
            className="border border-gray-200 dark:border-gray-700 rounded-xl p-2.5 text-sm bg-white dark:bg-gray-800 dark:text-white outline-none"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Tự động trích từ Thu Nhập (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              value={f.allocation_percentage}
              onChange={(e) => setF({ ...f, allocation_percentage: Number(e.target.value) })}
              className="w-full border border-gray-200 dark:border-gray-700 rounded-xl p-2.5 text-sm bg-white dark:bg-gray-800 dark:text-white outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Hạn dự kiến (nếu có)</label>
            <input
              type="date"
              value={f.deadline}
              onChange={(e) => setF({ ...f, deadline: e.target.value })}
              className="w-full border border-gray-200 dark:border-gray-700 rounded-xl p-2.5 text-sm bg-white dark:bg-gray-800 dark:text-white outline-none"
            />
          </div>
          <div className="flex items-end">
            <button
              disabled={!f.name || !f.target_amount}
              onClick={() => m.mutate({ ...f, target_amount: Number(f.target_amount) })}
              className="w-full bg-sage text-white rounded-xl py-2.5 font-bold text-sm disabled:opacity-40 hover:bg-sage/90 transition-all shadow-sm"
            >
              Tạo hũ ngay
            </button>
          </div>
        </div>
      </Card>

      {/* Danh sách các Hũ */}
      <div className="grid gap-4 sm:grid-cols-2">
        {jars.map((j) => (
          <JarCard key={j.id} j={j} />
        ))}
      </div>
    </div>
  )
}

