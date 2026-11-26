const VALID_PERIODS = new Set(['day', 'week', 'month', 'year'])

function parseLocalDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '')
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null
  return date
}

function toDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function addDays(date, amount) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount)
}

function addMonthsClamped(date, amount) {
  const firstOfTargetMonth = new Date(date.getFullYear(), date.getMonth() + amount, 1)
  const lastDay = new Date(firstOfTargetMonth.getFullYear(), firstOfTargetMonth.getMonth() + 1, 0).getDate()
  return new Date(firstOfTargetMonth.getFullYear(), firstOfTargetMonth.getMonth(), Math.min(date.getDate(), lastDay))
}

function addYearsClamped(date, amount) {
  const targetYear = date.getFullYear() + amount
  const lastDay = new Date(targetYear, date.getMonth() + 1, 0).getDate()
  return new Date(targetYear, date.getMonth(), Math.min(date.getDate(), lastDay))
}

export function shiftSelectedDate(selectedDate, period, direction, preferredDate = selectedDate) {
  if (!VALID_PERIODS.has(period)) throw new RangeError(`Unsupported period: ${period}`)
  if (direction !== -1 && direction !== 1) throw new RangeError('Direction must be -1 or 1.')
  const selected = parseLocalDate(selectedDate)
  const preferred = parseLocalDate(preferredDate)
  if (!selected || !preferred) throw new RangeError('Dates must be valid YYYY-MM-DD calendar dates.')

  if (period === 'day' || period === 'week') {
    return toDateKey(addDays(selected, direction * (period === 'day' ? 1 : 7)))
  }
  if (period === 'month') {
    const targetMonth = new Date(selected.getFullYear(), selected.getMonth() + direction, 1)
    const lastDay = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0).getDate()
    return toDateKey(new Date(targetMonth.getFullYear(), targetMonth.getMonth(), Math.min(preferred.getDate(), lastDay)))
  }

  const targetYear = selected.getFullYear() + direction
  const lastDay = new Date(targetYear, preferred.getMonth() + 1, 0).getDate()
  return toDateKey(new Date(targetYear, preferred.getMonth(), Math.min(preferred.getDate(), lastDay)))
}

function isSameWeek(first, second) {
  const firstMonday = addDays(first, -((first.getDay() + 6) % 7))
  const secondMonday = addDays(second, -((second.getDay() + 6) % 7))
  return toDateKey(firstMonday) === toDateKey(secondMonday)
}

function formatRange(range) {
  const format = (date) => `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`
  return toDateKey(range.start) === toDateKey(range.end)
    ? format(range.start)
    : `${format(range.start)} – ${format(range.end)}`
}

export function getComparableRanges({ period, selectedDate, todayDate }) {
  if (!VALID_PERIODS.has(period)) throw new RangeError(`Unsupported period: ${period}`)
  const selected = parseLocalDate(selectedDate)
  const today = parseLocalDate(todayDate)
  if (!selected || !today) throw new RangeError('Dates must be valid YYYY-MM-DD calendar dates.')
  if (selected > today) throw new RangeError('A future date cannot be selected.')

  if (period === 'day') {
    const previous = addDays(selected, -1)
    return { current: { start: selected, end: selected }, previous: { start: previous, end: previous } }
  }

  if (period === 'week') {
    const monday = addDays(selected, -((selected.getDay() + 6) % 7))
    const isCurrentWeek = isSameWeek(selected, today)
    const currentEnd = isCurrentWeek ? selected : addDays(monday, 6)
    const previousStart = addDays(monday, -7)
    const previousEnd = isCurrentWeek ? addDays(selected, -7) : addDays(previousStart, 6)
    return {
      current: { start: monday, end: currentEnd },
      previous: { start: previousStart, end: previousEnd }
    }
  }

  if (period === 'month') {
    const currentMonthStart = new Date(selected.getFullYear(), selected.getMonth(), 1)
    const isCurrentMonth = selected.getFullYear() === today.getFullYear() && selected.getMonth() === today.getMonth()
    const currentEnd = isCurrentMonth ? selected : new Date(selected.getFullYear(), selected.getMonth() + 1, 0)
    const previousAnchor = addMonthsClamped(selected, -1)
    const previousStart = new Date(previousAnchor.getFullYear(), previousAnchor.getMonth(), 1)
    const previousEnd = isCurrentMonth
      ? previousAnchor
      : new Date(previousAnchor.getFullYear(), previousAnchor.getMonth() + 1, 0)
    return {
      current: { start: currentMonthStart, end: currentEnd },
      previous: { start: previousStart, end: previousEnd }
    }
  }

  const currentYearStart = new Date(selected.getFullYear(), 0, 1)
  const isCurrentYear = selected.getFullYear() === today.getFullYear()
  const currentEnd = isCurrentYear ? selected : new Date(selected.getFullYear(), 11, 31)
  const previousAnchor = addYearsClamped(selected, -1)
  const previousStart = new Date(previousAnchor.getFullYear(), 0, 1)
  const previousEnd = isCurrentYear ? previousAnchor : new Date(previousAnchor.getFullYear(), 11, 31)
  return {
    current: { start: currentYearStart, end: currentEnd },
    previous: { start: previousStart, end: previousEnd }
  }
}

function aggregateRange(transactions, categoryById, range) {
  const start = toDateKey(range.start)
  const end = toDateKey(range.end)
  const grouped = new Map()

  for (const transaction of transactions) {
    if (transaction?.type !== 'expense') continue
    if (!parseLocalDate(transaction.date) || transaction.date < start || transaction.date > end) continue

    const amount = Number(transaction.amount)
    if (!Number.isFinite(amount) || amount <= 0) continue

    const category = categoryById.get(String(transaction.category_id))
    const key = category ? `category:${category.id}` : 'category:uncategorized'
    const item = grouped.get(key) || {
      key,
      name: category?.name || 'Khác',
      icon: category?.icon || '💸',
      amount: 0
    }
    item.amount += amount
    grouped.set(key, item)
  }

  return [...grouped.values()]
}

function describeTrend(currentTotal, previousTotal, change, changePercent) {
  if (currentTotal === 0 && previousTotal === 0) {
    return 'Chưa có chi tiêu trong khoảng thời gian này hoặc kỳ so sánh.'
  }
  if (previousTotal === 0) {
    return `Kỳ trước chưa có chi tiêu; kỳ này phát sinh ${currentTotal.toLocaleString('vi-VN')} đ.`
  }
  if (currentTotal === 0) return `Không phát sinh chi tiêu kỳ này; giảm ${previousTotal.toLocaleString('vi-VN')} đ (100%).`
  if (change === 0) return 'Chi tiêu không đổi so với cùng kỳ trước.'
  const direction = change > 0 ? 'tăng' : 'giảm'
  return `Chi tiêu ${direction} ${Math.abs(change).toLocaleString('vi-VN')} đ (${Math.abs(changePercent)}%) so với cùng kỳ trước.`
}

export function getSmartSpendingSummary({ transactions = [], categories = [], period = 'month', selectedDate, todayDate = selectedDate }) {
  if (!Array.isArray(transactions) || !Array.isArray(categories)) {
    throw new TypeError('Transactions and categories must be arrays.')
  }

  const ranges = getComparableRanges({ period, selectedDate, todayDate })
  const categoryById = new Map(categories.map((category) => [String(category.id), category]))
  const currentCategories = aggregateRange(transactions, categoryById, ranges.current)
  const previousCategories = aggregateRange(transactions, categoryById, ranges.previous)
  const currentByKey = new Map(currentCategories.map((category) => [category.key, category]))
  const previousByKey = new Map(previousCategories.map((category) => [category.key, category]))
  const currentTotal = currentCategories.reduce((total, category) => total + category.amount, 0)
  const previousTotal = previousCategories.reduce((total, category) => total + category.amount, 0)
  const change = currentTotal - previousTotal
  const changePercent = previousTotal > 0 ? Math.round((change / previousTotal) * 100) : null

  const categoryChanges = [...new Set([...currentByKey.keys(), ...previousByKey.keys()])]
    .map((key) => {
      const current = currentByKey.get(key)
      const previous = previousByKey.get(key)
      const amount = current?.amount || 0
      const previousAmount = previous?.amount || 0
      const delta = amount - previousAmount
      return {
        key,
        name: current?.name || previous?.name || 'Khác',
        icon: current?.icon || previous?.icon || '💸',
        amount,
        previousAmount,
        change: delta,
        changePercent: previousAmount > 0 ? Math.round((delta / previousAmount) * 100) : null,
        share: currentTotal > 0 ? Math.round((amount / currentTotal) * 100) : 0,
        status: previousAmount === 0 && amount > 0
          ? 'new'
          : amount === 0 && previousAmount > 0
            ? 'stopped'
            : delta > 0
              ? 'increased'
              : delta < 0
                ? 'decreased'
                : 'unchanged'
      }
    })
    .sort((first, second) => second.amount - first.amount || first.name.localeCompare(second.name, 'vi'))

  const currentRangeLabel = formatRange(ranges.current)
  const previousRangeLabel = formatRange(ranges.previous)

  return {
    period,
    currentRange: { start: toDateKey(ranges.current.start), end: toDateKey(ranges.current.end), label: currentRangeLabel },
    previousRange: { start: toDateKey(ranges.previous.start), end: toDateKey(ranges.previous.end), label: previousRangeLabel },
    currentTotal,
    previousTotal,
    change,
    changePercent,
    insight: describeTrend(currentTotal, previousTotal, change, changePercent),
    categories: categoryChanges,
    leadingCategory: categoryChanges.find((category) => category.amount > 0) || null,
    largestIncrease: categoryChanges.filter((category) => category.change > 0).sort((a, b) => b.change - a.change)[0] || null,
    largestDecrease: categoryChanges.filter((category) => category.change < 0).sort((a, b) => a.change - b.change)[0] || null
  }
}
