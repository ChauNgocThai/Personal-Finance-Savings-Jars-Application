import test from 'node:test'
import assert from 'node:assert/strict'
import { getComparableRanges, getSmartSpendingSummary, shiftSelectedDate } from './spendingSummary.js'

const categories = [
  { id: 1, name: 'Ăn uống', icon: '🍜' },
  { id: 2, name: 'Đi lại', icon: '🛵' },
  { id: 3, name: 'Mua sắm', icon: '🛍️' }
]

const transactions = [
  { date: '2026-11-26', category_id: 1, amount: 100000, type: 'expense' },
  { date: '2026-11-26', category_id: 2, amount: 20000, type: 'expense' },
  { date: '2026-11-26', category_id: 1, amount: 12000000, type: 'income' },
  { date: '2026-11-25', category_id: 1, amount: 50000, type: 'expense' },
  { date: '2026-11-25', category_id: 3, amount: 30000, type: 'expense' },
  { date: '2026-11-24', category_id: 2, amount: 40000, type: 'expense' },
  { date: '2026-11-23', category_id: 1, amount: 10000, type: 'expense' },
  { date: '2026-11-19', category_id: 2, amount: 10000, type: 'expense' },
  { date: '2026-11-18', category_id: 1, amount: 60000, type: 'expense' },
  { date: '2026-10-05', category_id: 1, amount: 200000, type: 'expense' },
  { date: '2026-10-19', category_id: 2, amount: 100000, type: 'expense' },
  { date: '2026-10-26', category_id: 3, amount: 50000, type: 'expense' },
  { date: '2025-01-03', category_id: 1, amount: 400000, type: 'expense' },
  { date: '2025-11-26', category_id: 2, amount: 100000, type: 'expense' }
]

const dateKey = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const rangeKeys = (ranges) => ({
  current: { start: dateKey(ranges.current.start), end: dateKey(ranges.current.end) },
  previous: { start: dateKey(ranges.previous.start), end: dateKey(ranges.previous.end) }
})

test('creates day ranges for selected day and preceding day', () => {
  const result = getComparableRanges({ period: 'day', selectedDate: '2026-11-26', todayDate: '2026-11-26' })
  assert.deepEqual(rangeKeys(result), {
    current: { start: '2026-11-26', end: '2026-11-26' },
    previous: { start: '2026-11-25', end: '2026-11-25' }
  })
})

test('creates same-weekday-to-date ranges for the current week', () => {
  const result = getComparableRanges({ period: 'week', selectedDate: '2026-11-26', todayDate: '2026-11-26' })
  assert.deepEqual(rangeKeys(result), {
    current: { start: '2026-11-23', end: '2026-11-26' },
    previous: { start: '2026-11-16', end: '2026-11-19' }
  })
})

test('handles comparison weeks crossing a year boundary', () => {
  const result = getComparableRanges({ period: 'week', selectedDate: '2027-01-07', todayDate: '2027-01-07' })
  assert.deepEqual(rangeKeys(result), {
    current: { start: '2027-01-04', end: '2027-01-07' },
    previous: { start: '2026-12-28', end: '2026-12-31' }
  })
})

test('creates month-to-date comparison ranges', () => {
  const result = getComparableRanges({ period: 'month', selectedDate: '2026-11-26', todayDate: '2026-11-26' })
  assert.deepEqual(rangeKeys(result), {
    current: { start: '2026-11-01', end: '2026-11-26' },
    previous: { start: '2026-10-01', end: '2026-10-26' }
  })
})

test('clamps comparison dates to the previous month end, including leap February', () => {
  const commonYear = getComparableRanges({ period: 'month', selectedDate: '2025-03-31', todayDate: '2025-04-15' })
  const leapYear = getComparableRanges({ period: 'month', selectedDate: '2024-03-31', todayDate: '2024-04-15' })
  assert.equal(dateKey(commonYear.previous.end), '2025-02-28')
  assert.equal(dateKey(leapYear.previous.end), '2024-02-29')
})

test('creates year-to-date comparison ranges and clamps leap day', () => {
  const currentYear = getComparableRanges({ period: 'year', selectedDate: '2026-11-26', todayDate: '2026-11-26' })
  const leapDay = getComparableRanges({ period: 'year', selectedDate: '2028-02-29', todayDate: '2028-03-02' })
  assert.deepEqual(rangeKeys(currentYear), {
    current: { start: '2026-01-01', end: '2026-11-26' },
    previous: { start: '2025-01-01', end: '2025-11-26' }
  })
  assert.equal(dateKey(leapDay.previous.end), '2027-02-28')
})

test('uses full calendar month and year for completed historical periods', () => {
  const month = getComparableRanges({ period: 'month', selectedDate: '2026-10-15', todayDate: '2026-11-26' })
  const year = getComparableRanges({ period: 'year', selectedDate: '2025-06-10', todayDate: '2026-11-26' })
  assert.deepEqual(rangeKeys(month), {
    current: { start: '2026-10-01', end: '2026-10-31' },
    previous: { start: '2026-09-01', end: '2026-09-30' }
  })
  assert.deepEqual(rangeKeys(year), {
    current: { start: '2025-01-01', end: '2025-12-31' },
    previous: { start: '2024-01-01', end: '2024-12-31' }
  })
})

test('aggregates fixture totals and ignores income', () => {
  const expected = [
    { period: 'day', current: 120000, previous: 80000, change: 40000, percent: 50 },
    { period: 'week', current: 250000, previous: 70000, change: 180000, percent: 257 },
    { period: 'month', current: 320000, previous: 350000, change: -30000, percent: -9 },
    { period: 'year', current: 670000, previous: 500000, change: 170000, percent: 34 }
  ]

  for (const item of expected) {
    const summary = getSmartSpendingSummary({
      transactions,
      categories,
      period: item.period,
      selectedDate: '2026-11-26',
      todayDate: '2026-11-26'
    })
    assert.equal(summary.currentTotal, item.current, `${item.period} current total`)
    assert.equal(summary.previousTotal, item.previous, `${item.period} previous total`)
    assert.equal(summary.change, item.change, `${item.period} change`)
    assert.equal(summary.changePercent, item.percent, `${item.period} percent`)
  }
})

test('category deltas add up to the total delta and retain current categories first', () => {
  const summary = getSmartSpendingSummary({
    transactions,
    categories,
    period: 'month',
    selectedDate: '2026-11-26',
    todayDate: '2026-11-26'
  })
  const byName = new Map(summary.categories.map((category) => [category.name, category]))
  assert.equal(byName.get('Ăn uống').amount, 220000)
  assert.equal(byName.get('Ăn uống').previousAmount, 200000)
  assert.equal(byName.get('Đi lại').amount, 70000)
  assert.equal(byName.get('Đi lại').previousAmount, 100000)
  assert.equal(byName.get('Mua sắm').amount, 30000)
  assert.equal(byName.get('Mua sắm').previousAmount, 50000)
  assert.equal(summary.categories.reduce((total, category) => total + category.change, 0), summary.change)
  assert.equal(summary.leadingCategory.name, 'Ăn uống')
})

test('groups missing/unknown categories as Khác', () => {
  const summary = getSmartSpendingSummary({
    transactions: [
      { date: '2026-11-26', category_id: 99, amount: 12000, type: 'expense' },
      { date: '2026-11-26', amount: 8000, type: 'expense' }
    ],
    categories,
    period: 'day',
    selectedDate: '2026-11-26',
    todayDate: '2026-11-26'
  })
  assert.equal(summary.categories.length, 1)
  assert.equal(summary.categories[0].name, 'Khác')
  assert.equal(summary.currentTotal, 20000)
})

test('handles new, stopped, and zero-baseline categories without infinite percentages', () => {
  const result = getSmartSpendingSummary({
    transactions: [
      { date: '2026-11-26', category_id: 1, amount: 30000, type: 'expense' },
      { date: '2026-11-25', category_id: 2, amount: 20000, type: 'expense' }
    ],
    categories,
    period: 'day',
    selectedDate: '2026-11-26',
    todayDate: '2026-11-26'
  })
  const byName = new Map(result.categories.map((category) => [category.name, category]))
  assert.equal(byName.get('Ăn uống').status, 'new')
  assert.equal(byName.get('Ăn uống').changePercent, null)
  assert.equal(byName.get('Đi lại').status, 'stopped')
  assert.equal(byName.get('Đi lại').changePercent, -100)
  assert.equal(result.changePercent, 50)
})

test('does not report percentage growth when the previous total is zero', () => {
  const result = getSmartSpendingSummary({
    transactions: [{ date: '2026-11-26', category_id: 1, amount: 25000, type: 'expense' }],
    categories,
    period: 'day',
    selectedDate: '2026-11-26',
    todayDate: '2026-11-26'
  })
  assert.equal(result.changePercent, null)
  assert.match(result.insight, /Kỳ trước chưa có chi tiêu/)
})

test('returns an explicit empty state when neither period has expenses', () => {
  const result = getSmartSpendingSummary({
    transactions: [],
    categories,
    period: 'month',
    selectedDate: '2026-11-26',
    todayDate: '2026-11-26'
  })
  assert.equal(result.currentTotal, 0)
  assert.equal(result.previousTotal, 0)
  assert.equal(result.changePercent, null)
  assert.equal(result.categories.length, 0)
  assert.match(result.insight, /Chưa có chi tiêu/)
})

test('ignores malformed dates, non-finite amounts, and non-positive expenses', () => {
  const result = getSmartSpendingSummary({
    transactions: [
      { date: '2026-11-26', category_id: 1, amount: 10, type: 'expense' },
      { date: '2026-02-30', category_id: 1, amount: 500, type: 'expense' },
      { date: '2026-11-26x', category_id: 1, amount: 500, type: 'expense' },
      { date: '2026-11-26', category_id: 1, amount: Number.NaN, type: 'expense' },
      { date: '2026-11-26', category_id: 1, amount: Number.POSITIVE_INFINITY, type: 'expense' },
      { date: '2026-11-26', category_id: 1, amount: 0, type: 'expense' },
      { date: '2026-11-26', category_id: 1, amount: -1, type: 'expense' }
    ],
    categories,
    period: 'day',
    selectedDate: '2026-11-26',
    todayDate: '2026-11-26'
  })
  assert.equal(result.currentTotal, 10)
})

test('rejects invalid periods, invalid calendar dates, and future selections', () => {
  assert.throws(() => getComparableRanges({ period: 'quarter', selectedDate: '2026-11-26', todayDate: '2026-11-26' }), RangeError)
  assert.throws(() => getComparableRanges({ period: 'day', selectedDate: '2026-02-30', todayDate: '2026-11-26' }), RangeError)
  assert.throws(() => getComparableRanges({ period: 'day', selectedDate: '2026-11-27', todayDate: '2026-11-26' }), RangeError)
})

test('shifts dashboard selections by period and clamps month/year navigation', () => {
  assert.equal(shiftSelectedDate('2026-11-26', 'day', 1), '2026-11-27')
  assert.equal(shiftSelectedDate('2026-11-26', 'week', -1), '2026-11-19')
  assert.equal(shiftSelectedDate('2025-01-31', 'month', 1), '2025-02-28')
  assert.equal(shiftSelectedDate('2024-01-31', 'month', 1), '2024-02-29')
  assert.equal(shiftSelectedDate('2028-02-29', 'year', -1), '2027-02-28')
  assert.equal(shiftSelectedDate('2025-02-28', 'month', 1, '2025-01-31'), '2025-03-31')
  assert.equal(shiftSelectedDate('2027-02-28', 'year', 1, '2028-02-29'), '2028-02-29')
  assert.throws(() => shiftSelectedDate('2026-11-26', 'month', 0), RangeError)
})
