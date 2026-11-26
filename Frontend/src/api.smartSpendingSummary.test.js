import test from 'node:test'
import assert from 'node:assert/strict'
import { getSmartSpendingSummary, smartSpendingSummaryQueryKey } from './api.js'

const DB_KEY = 'PERSONAL_FINANCE_DB_V1'

test('loads the smart summary from local storage and scopes cache keys by period and date', async () => {
  const originalLocalStorage = globalThis.localStorage
  const db = {
    categories: [
      { id: 1, name: 'Ăn uống', icon: '🍜' },
      { id: 2, name: 'Đi lại', icon: '🛵' }
    ],
    transactions: [
      { id: 1, date: '2026-11-26', category_id: 1, amount: 100000, type: 'expense' },
      { id: 2, date: '2026-11-25', category_id: 2, amount: 40000, type: 'expense' },
      { id: 3, date: '2026-11-26', category_id: 1, amount: 9000000, type: 'income' }
    ]
  }
  const storage = new Map([[DB_KEY, JSON.stringify(db)]])
  globalThis.localStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value)
  }

  try {
    const summary = await getSmartSpendingSummary({
      period: 'day',
      selectedDate: '2026-11-26',
      todayDate: '2026-11-26'
    })

    assert.equal(summary.currentTotal, 100000)
    assert.equal(summary.previousTotal, 40000)
    assert.equal(summary.change, 60000)
    assert.deepEqual(smartSpendingSummaryQueryKey('day', '2026-11-26'), [
      'smart-spending-summary',
      'day',
      '2026-11-26'
    ])
    assert.notDeepEqual(
      smartSpendingSummaryQueryKey('day', '2026-11-26'),
      smartSpendingSummaryQueryKey('month', '2026-11-26')
    )
  } finally {
    if (originalLocalStorage === undefined) delete globalThis.localStorage
    else globalThis.localStorage = originalLocalStorage
  }
})
