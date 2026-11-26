// api.js
import { getSmartSpendingSummary as buildSmartSpendingSummary } from './spendingSummary.js'

const STORAGE_KEY = 'fintrack_local_db_v1'
const DB_KEY = 'PERSONAL_FINANCE_DB_V1'
const todayStr = () => new Date().toISOString().slice(0, 10)
const localTodayStr = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}
const currentMonthStr = () => new Date().toISOString().slice(0, 7) // "YYYY-MM"

const defaultDb = {
  categories: [
    { id: 1, name: 'Ăn uống', type: 'expense', icon: '🍜' },
    { id: 2, name: 'Đi lại', type: 'expense', icon: '🛵' },
    { id: 3, name: 'Mua sắm', type: 'expense', icon: '🛍️' },
    { id: 4, name: 'Giải trí', type: 'expense', icon: '🎮' },
    { id: 5, name: 'Lương', type: 'income', icon: '💼' },
    { id: 6, name: 'Thưởng / Thêm', type: 'income', icon: '🎁' }
  ],
  budgets: [
    { id: 1, category_id: 1, limit_amount: 150000, period_type: 'daily' },
    { id: 2, category_id: 2, limit_amount: 50000, period_type: 'daily' },
    { id: 3, category_id: 3, limit_amount: 2000000, period_type: 'monthly' },
    { id: 4, category_id: 4, limit_amount: 500000, period_type: 'monthly' }
  ],
  transactions: [
    { id: 1, category_id: 1, amount: 45000, type: 'expense', note: 'Phở bò sáng', date: todayStr() },
    { id: 2, category_id: 1, amount: 35000, type: 'expense', note: 'Cơm tấm trưa', date: todayStr() },
    { id: 3, category_id: 2, amount: 30000, type: 'expense', note: 'Đổ xăng', date: todayStr() },
    { id: 4, category_id: 5, amount: 12000000, type: 'income', note: 'Lương tháng này', date: todayStr() }
  ],
  jars: [
    { id: 1, name: 'Du lịch Đà Lạt', target_amount: 10000000, current_amount: 2500000, allocation_percentage: 10, deadline: '2027-03-01' },
    { id: 2, name: 'Quỹ khẩn cấp', target_amount: 15000000, current_amount: 5000000, allocation_percentage: 15, deadline: '2026-12-31' }
  ],
  nid: 100
}

// Lấy dữ liệu từ LocalStorage
const loadDb = () => {
  const raw = localStorage.getItem(DB_KEY)
  if (!raw) {
    localStorage.setItem(DB_KEY, JSON.stringify(defaultDb))
    return defaultDb
  }
  try {
    return JSON.parse(raw)
  } catch (e) {
    return defaultDb
  }
}

// Lưu dữ liệu vào LocalStorage
const saveDb = (db) => {
  localStorage.setItem(DB_KEY, JSON.stringify(db))
}

const wait = (v) => new Promise((r) => setTimeout(() => r(structuredClone(v)), 80))

export const getCategories = () => {
  const db = loadDb()
  return wait(db.categories)
}

export const getTransactions = () => {
  const db = loadDb()
  return wait([...db.transactions].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id))
}

export const smartSpendingSummaryQueryKey = (period, selectedDate) => [
  'smart-spending-summary',
  period,
  selectedDate
]

export const getSmartSpendingSummary = ({ period = 'month', selectedDate = localTodayStr(), todayDate = localTodayStr() } = {}) => {
  const db = loadDb()
  return wait(buildSmartSpendingSummary({
    transactions: db.transactions,
    categories: db.categories,
    period,
    selectedDate,
    todayDate
  }))
}

export const addTransaction = (t) => {
  const db = loadDb()
  const tx = { ...t, id: db.nid++ }
  db.transactions.push(tx)

  // Phân bổ tự động vào hũ nếu là thu nhập
  if (t.type === 'income') {
    db.jars.forEach((j) => {
      if (j.allocation_percentage > 0) {
        j.current_amount += Math.round((t.amount * j.allocation_percentage) / 100)
      }
    })
  }

  saveDb(db)
  return wait(tx)
}

export const deleteTransaction = (id) => {
  const db = loadDb()
  db.transactions = db.transactions.filter((t) => t.id !== id)
  saveDb(db)
  return wait(true)
}

export const getDashboard = () => {
  const db = loadDb()
  const todayStr = new Date().toISOString().slice(0, 10) // 'YYYY-MM-DD'
  const expenseTxs = db.transactions.filter(t => t.type === 'expense')

  // 1. Phân tích hôm nay
  const todayMap = {}
  let totalToday = 0

  // 2. Gom nhóm theo Năm -> Tháng (Đảm bảo cấu trúc rõ ràng theo năm)
  // Cấu trúc: { '2026': { '01': {total: 0, categories: {}}, '02': {...}, ... } }
  const yearsMap = {}

  expenseTxs.forEach(t => {
    const cat = db.categories.find(c => c.id === t.category_id)
    const catName = cat ? cat.name : 'Khác'
    const catIcon = cat ? cat.icon : '💸'

    // Xử lý hôm nay
    if (t.date === todayStr) {
      totalToday += t.amount
      if (!todayMap[catName]) todayMap[catName] = { name: catName, icon: catIcon, amount: 0 }
      todayMap[catName].amount += t.amount
    }

    // Tách lấy năm và tháng từ t.date (giả định định dạng 'YYYY-MM-DD')
    if (t.date && t.date.length >= 7) {
      const yearStr = t.date.slice(0, 4)
      const monthStr = t.date.slice(5, 7)

      if (!yearsMap[yearStr]) {
        yearsMap[yearStr] = {}
        for (let i = 1; i <= 12; i++) {
          const mKey = String(i).padStart(2, '0')
          yearsMap[yearStr][mKey] = { monthNumber: i, monthKey: mKey, total: 0, categories: {} }
        }
      }

      const mData = yearsMap[yearStr][monthStr]
      if (mData) {
        mData.total += t.amount
        if (!mData.categories[catName]) {
          mData.categories[catName] = { name: catName, icon: catIcon, amount: 0 }
        }
        mData.categories[catName].amount += t.amount
      }
    }
  })

  // Nếu chưa có dữ liệu năm nào, ít nhất đưa năm hiện tại vào để giao diện không bị trống
  const currentYearStr = String(new Date().getFullYear())
    if (!yearsMap[currentYearStr]) {
    yearsMap[currentYearStr] = {}
    for (let i = 1; i <= 12; i++) {
      const mKey = String(i).padStart(2, '0')
      yearsMap[currentYearStr][mKey] = { monthNumber: i, monthKey: mKey, total: 0, categories: {} }
    }
  } 

  // Format dữ liệu trả về cho chuẩn chỉnh
  const spendingToday = Object.values(todayMap).map(item => ({
    ...item,
    percentage: totalToday > 0 ? Math.round((item.amount / totalToday) * 100) : 0
  }))

  const structuredYears = Object.keys(yearsMap).sort().reverse().map(yearStr => {
    const monthsObj = yearsMap[yearStr]
    // Sắp xếp các tháng chuẩn từ 01 -> 12
    const sortedMonths = Object.keys(monthsObj).sort().map(mKey => {
      const mData = monthsObj[mKey]
      const catsFormatted = Object.values(mData.categories).map(c => ({
        ...c,
        percentage: mData.total > 0 ? Math.round((c.amount / mData.total) * 100) : 0
      }))
      return {
        ...mData,
        categories: catsFormatted
      }
    })

    // Tính tổng chi tiêu cả năm đó
    const totalYearExpense = sortedMonths.reduce((sum, m) => sum + m.total, 0)

    return {
      year: yearStr,
      totalYear: totalYearExpense,
      months: sortedMonths
    }
  })

  const totalIncome = db.monthlyIncome !== undefined ? db.monthlyIncome : 0

  return wait({
    summary: {
      totalIncome,
      netSavings: totalIncome - (structuredYears[0]?.totalYear || 0)
    },
    budgets: db.budgets.map(b => {
      const cat = db.categories.find(c => c.id === b.category_id)
      const spent = expenseTxs.filter(t => t.category_id === b.category_id).reduce((s, t) => s + t.amount, 0)
      const pct = Math.round((spent / b.limit_amount) * 100)
      let warning = 'ok'
      if (pct >= 100) warning = 'exceeded'
      else if (pct >= 80) warning = 'warning'
      return { ...b, category: cat, spent, percent_used: pct, warning_level: warning, is_exceeded: spent > b.limit_amount }
    }),
    jars: db.jars,
    spendingToday,
    structuredYears
  })
}

export const addBudget = (b) => {
  const db = loadDb()
  const existingIndex = db.budgets.findIndex(x => x.category_id === b.category_id && x.period_type === b.period_type)
  if (existingIndex >= 0) {
    db.budgets[existingIndex].limit_amount = b.limit_amount
  } else {
    db.budgets.push({ ...b, id: db.nid++ })
  }
  saveDb(db)
  return wait(true)
}

export const getJars = () => {
  const db = loadDb()
  return wait(db.jars)
}

export const createJar = (j) => {
  const db = loadDb()
  db.jars.push({ ...j, id: db.nid++, current_amount: 0 })
  saveDb(db)
  return wait(true)
}

export const moveJar = ({ id, amount }) => {
  const db = loadDb()
  const j = db.jars.find((x) => x.id === id)
  if (!j) return Promise.reject(new Error('Hũ không tồn tại'))
  if (j.current_amount + amount < 0) return Promise.reject(new Error('Số dư hũ không đủ để rút'))
  j.current_amount += amount
  saveDb(db)
  return wait(j)
}

export const addCategory = (cat) => {
  const db = loadDb()
  const newCat = { ...cat, id: db.nid++ }
  db.categories.push(newCat)
  saveDb(db)
  return wait(newCat)
}

export const deleteCategory = (id) => {
  const db = loadDb()
  const hasTx = db.transactions.some(t => t.category_id === id)
  if (hasTx) {
    return Promise.reject(new Error('Không thể xóa danh mục đang có giao dịch liên quan!'))
  }
  db.categories = db.categories.filter(c => c.id !== id)
  db.budgets = db.budgets.filter(b => b.category_id !== id)
  saveDb(db)
  return wait(true)
}

export const setMonthlyIncome = (amount) => {
  const db = loadDb()
  db.monthlyIncome = amount // Lưu vào cấu trúc db
  saveDb(db)
  return wait(amount)
}