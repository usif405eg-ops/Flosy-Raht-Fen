// ============================================
// db.js — IndexedDB Database Layer
// فلوسي راحت فين؟ — Personal Expense Tracker
// ============================================

const DB_NAME = 'FlosyRahtFenDB';
const DB_VERSION = 1;

let db = null;

// Default expense categories
const DEFAULT_EXPENSE_CATEGORIES = [
  { name: 'أكل وشرب', type: 'expense', icon: '🍔', isDefault: true },
  { name: 'ترفيه', type: 'expense', icon: '🎮', isDefault: true },
  { name: 'مواصلات', type: 'expense', icon: '🚌', isDefault: true },
  { name: 'مشتريات شخصية', type: 'expense', icon: '🛍️', isDefault: true },
  { name: 'فواتير والتزامات', type: 'expense', icon: '📄', isDefault: true },
  { name: 'صحة', type: 'expense', icon: '🏥', isDefault: true },
  { name: 'تعليم', type: 'expense', icon: '📚', isDefault: true },
  { name: 'مصاريف البيت', type: 'expense', icon: '🏠', isDefault: true },
  { name: 'أخرى', type: 'expense', icon: '📦', isDefault: true },
];

// Default income categories
const DEFAULT_INCOME_CATEGORIES = [
  { name: 'المرتب', type: 'income', icon: '💰', isDefault: true },
  { name: 'دخل إضافي', type: 'income', icon: '💵', isDefault: true },
  { name: 'مكافآت', type: 'income', icon: '🎁', isDefault: true },
  { name: 'أخرى', type: 'income', icon: '📦', isDefault: true },
];

/**
 * Initialize the database
 * @returns {Promise<IDBDatabase>}
 */
function initDB() {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error('خطأ في فتح قاعدة البيانات:', event.target.error);
      reject(new Error('تعذر فتح قاعدة البيانات. تأكد من أن المتصفح يدعم IndexedDB.'));
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;

      // Transactions store
      if (!database.objectStoreNames.contains('transactions')) {
        const txStore = database.createObjectStore('transactions', { keyPath: 'id', autoIncrement: true });
        txStore.createIndex('type', 'type', { unique: false });
        txStore.createIndex('category', 'category', { unique: false });
        txStore.createIndex('date', 'date', { unique: false });
        txStore.createIndex('monthYear', 'monthYear', { unique: false });
      }

      // Categories store
      if (!database.objectStoreNames.contains('categories')) {
        const catStore = database.createObjectStore('categories', { keyPath: 'id', autoIncrement: true });
        catStore.createIndex('type', 'type', { unique: false });
        catStore.createIndex('name', 'name', { unique: false });
      }

      // Budgets store
      if (!database.objectStoreNames.contains('budgets')) {
        const budgetStore = database.createObjectStore('budgets', { keyPath: 'id', autoIncrement: true });
        budgetStore.createIndex('monthYear', 'monthYear', { unique: false });
        budgetStore.createIndex('category', 'category', { unique: false });
      }

      // Settings store
      if (!database.objectStoreNames.contains('settings')) {
        database.createObjectStore('settings', { keyPath: 'key' });
      }
    };

    request.onsuccess = async (event) => {
      db = event.target.result;
      
      db.onerror = (event) => {
        console.error('خطأ في قاعدة البيانات:', event.target.error);
      };

      // Seed default categories if empty
      try {
        await seedDefaultCategories();
      } catch (e) {
        console.error('خطأ في إنشاء التصنيفات الافتراضية:', e);
      }

      resolve(db);
    };
  });
}

/**
 * Seed default categories if none exist
 */
async function seedDefaultCategories() {
  const existing = await getAllCategories();
  if (existing.length === 0) {
    const allDefaults = [...DEFAULT_EXPENSE_CATEGORIES, ...DEFAULT_INCOME_CATEGORIES];
    for (const cat of allDefaults) {
      await addCategory(cat);
    }
  }
}

// ============================================
// Generic DB helpers
// ============================================

function dbTransaction(storeName, mode) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('قاعدة البيانات غير متصلة'));
      return;
    }
    try {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      resolve({ tx, store });
    } catch (e) {
      reject(e);
    }
  });
}

function dbAdd(storeName, data) {
  return new Promise(async (resolve, reject) => {
    try {
      const { store } = await dbTransaction(storeName, 'readwrite');
      const request = store.add(data);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    } catch (e) {
      reject(e);
    }
  });
}

function dbPut(storeName, data) {
  return new Promise(async (resolve, reject) => {
    try {
      const { store } = await dbTransaction(storeName, 'readwrite');
      const request = store.put(data);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    } catch (e) {
      reject(e);
    }
  });
}

function dbGet(storeName, id) {
  return new Promise(async (resolve, reject) => {
    try {
      const { store } = await dbTransaction(storeName, 'readonly');
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    } catch (e) {
      reject(e);
    }
  });
}

function dbGetAll(storeName) {
  return new Promise(async (resolve, reject) => {
    try {
      const { store } = await dbTransaction(storeName, 'readonly');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    } catch (e) {
      reject(e);
    }
  });
}

function dbDelete(storeName, id) {
  return new Promise(async (resolve, reject) => {
    try {
      const { store } = await dbTransaction(storeName, 'readwrite');
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    } catch (e) {
      reject(e);
    }
  });
}

function dbClear(storeName) {
  return new Promise(async (resolve, reject) => {
    try {
      const { store } = await dbTransaction(storeName, 'readwrite');
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    } catch (e) {
      reject(e);
    }
  });
}

function dbGetByIndex(storeName, indexName, value) {
  return new Promise(async (resolve, reject) => {
    try {
      const { store } = await dbTransaction(storeName, 'readonly');
      const index = store.index(indexName);
      const request = index.getAll(value);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    } catch (e) {
      reject(e);
    }
  });
}

// ============================================
// Transactions API
// ============================================

async function addTransaction(tx) {
  // Compute monthYear index from date
  const d = new Date(tx.date);
  tx.monthYear = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  tx.createdAt = new Date().toISOString();
  return await dbAdd('transactions', tx);
}

async function updateTransaction(tx) {
  const d = new Date(tx.date);
  tx.monthYear = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  tx.updatedAt = new Date().toISOString();
  return await dbPut('transactions', tx);
}

async function deleteTransaction(id) {
  return await dbDelete('transactions', id);
}

async function getTransaction(id) {
  return await dbGet('transactions', id);
}

async function getAllTransactions() {
  return await dbGetAll('transactions');
}

async function getTransactionsByMonth(monthYear) {
  return await dbGetByIndex('transactions', 'monthYear', monthYear);
}

async function getTransactionsByType(type) {
  return await dbGetByIndex('transactions', 'type', type);
}

// ============================================
// Categories API
// ============================================

async function addCategory(cat) {
  return await dbAdd('categories', cat);
}

async function updateCategory(cat) {
  return await dbPut('categories', cat);
}

async function deleteCategory(id) {
  return await dbDelete('categories', id);
}

async function getCategory(id) {
  return await dbGet('categories', id);
}

async function getAllCategories() {
  return await dbGetAll('categories');
}

async function getCategoriesByType(type) {
  return await dbGetByIndex('categories', 'type', type);
}

/**
 * Check if a category is used by any transactions
 */
async function isCategoryUsed(categoryName) {
  const all = await getAllTransactions();
  return all.some(t => t.category === categoryName);
}

/**
 * Reassign transactions from one category to another
 */
async function reassignCategory(oldName, newName) {
  const all = await getAllTransactions();
  const toUpdate = all.filter(t => t.category === oldName);
  for (const t of toUpdate) {
    t.category = newName;
    await updateTransaction(t);
  }
  return toUpdate.length;
}

// ============================================
// Budgets API
// ============================================

async function addBudget(budget) {
  return await dbAdd('budgets', budget);
}

async function updateBudget(budget) {
  return await dbPut('budgets', budget);
}

async function deleteBudget(id) {
  return await dbDelete('budgets', id);
}

async function getAllBudgets() {
  return await dbGetAll('budgets');
}

async function getBudgetsByMonth(monthYear) {
  return await dbGetByIndex('budgets', 'monthYear', monthYear);
}

// ============================================
// Settings API
// ============================================

async function getSetting(key) {
  const result = await dbGet('settings', key);
  return result ? result.value : null;
}

async function setSetting(key, value) {
  return await dbPut('settings', { key, value });
}

// ============================================
// Backup & Restore API
// ============================================

async function exportAllData() {
  const transactions = await getAllTransactions();
  const categories = await getAllCategories();
  const budgets = await getAllBudgets();
  const settings = await dbGetAll('settings');

  return {
    appName: 'فلوسي راحت فين؟',
    version: '1.0.0',
    exportDate: new Date().toISOString(),
    data: {
      transactions,
      categories,
      budgets,
      settings,
    }
  };
}

function validateBackupData(data) {
  if (!data || typeof data !== 'object') return { valid: false, error: 'ملف غير صالح' };
  if (data.appName !== 'فلوسي راحت فين؟') return { valid: false, error: 'هذا الملف ليس نسخة احتياطية من التطبيق' };
  if (!data.data) return { valid: false, error: 'الملف لا يحتوي على بيانات' };
  
  const d = data.data;
  if (!Array.isArray(d.transactions)) return { valid: false, error: 'بيانات العمليات غير صالحة' };
  if (!Array.isArray(d.categories)) return { valid: false, error: 'بيانات التصنيفات غير صالحة' };

  return {
    valid: true,
    stats: {
      transactions: d.transactions.length,
      categories: d.categories.length,
      budgets: d.budgets ? d.budgets.length : 0,
      settings: d.settings ? d.settings.length : 0,
    }
  };
}

async function importData(data, mode = 'replace') {
  const validation = validateBackupData(data);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  if (mode === 'replace') {
    // Clear all stores
    await dbClear('transactions');
    await dbClear('categories');
    await dbClear('budgets');
    await dbClear('settings');
  }

  const d = data.data;

  // Import categories
  for (const cat of d.categories) {
    const catCopy = { ...cat };
    delete catCopy.id; // Let autoIncrement assign new IDs
    if (mode === 'merge') {
      // Skip if category with same name and type exists
      const existing = await getAllCategories();
      const exists = existing.find(c => c.name === catCopy.name && c.type === catCopy.type);
      if (exists) continue;
    }
    await addCategory(catCopy);
  }

  // Build a name-based mapping (categories are referenced by name in transactions)
  // Import transactions
  for (const tx of d.transactions) {
    const txCopy = { ...tx };
    delete txCopy.id;
    await addTransaction(txCopy);
  }

  // Import budgets
  if (d.budgets) {
    for (const budget of d.budgets) {
      const bCopy = { ...budget };
      delete bCopy.id;
      await addBudget(bCopy);
    }
  }

  // Import settings
  if (d.settings) {
    for (const setting of d.settings) {
      await setSetting(setting.key, setting.value);
    }
  }

  return validation.stats;
}

/**
 * Export transactions as CSV with BOM for Arabic support
 */
async function exportTransactionsCSV(monthYear) {
  let transactions;
  if (monthYear) {
    transactions = await getTransactionsByMonth(monthYear);
  } else {
    transactions = await getAllTransactions();
  }

  // Sort by date descending
  transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

  const BOM = '\uFEFF';
  const headers = ['النوع', 'الاسم', 'المبلغ', 'التصنيف', 'التاريخ', 'ملاحظات'];
  const rows = transactions.map(t => [
    t.type === 'income' ? 'دخل' : 'مصروف',
    `"${(t.name || '').replace(/"/g, '""')}"`,
    t.amount,
    `"${(t.category || '').replace(/"/g, '""')}"`,
    t.date,
    `"${(t.note || '').replace(/"/g, '""')}"`
  ]);

  return BOM + headers.join(',') + '\n' + rows.map(r => r.join(',')).join('\n');
}

// ============================================
// Computed Helpers
// ============================================

async function getMonthSummary(monthYear) {
  const transactions = await getTransactionsByMonth(monthYear);
  
  let totalIncome = 0;
  let totalExpense = 0;
  const categoryBreakdown = {};

  for (const t of transactions) {
    const amount = parseFloat(t.amount) || 0;
    if (t.type === 'income') {
      totalIncome += amount;
    } else {
      totalExpense += amount;
      if (!categoryBreakdown[t.category]) {
        categoryBreakdown[t.category] = 0;
      }
      categoryBreakdown[t.category] += amount;
    }
  }

  // Round to avoid floating point issues
  totalIncome = Math.round(totalIncome * 100) / 100;
  totalExpense = Math.round(totalExpense * 100) / 100;
  const remaining = Math.round((totalIncome - totalExpense) * 100) / 100;

  // Category percentages
  const categoryStats = Object.entries(categoryBreakdown)
    .map(([name, amount]) => ({
      name,
      amount: Math.round(amount * 100) / 100,
      percentage: totalExpense > 0 ? Math.round((amount / totalExpense) * 10000) / 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  // Recent transactions (last 5)
  const sorted = [...transactions].sort((a, b) => {
    const dateCompare = new Date(b.date) - new Date(a.date);
    if (dateCompare !== 0) return dateCompare;
    return (b.id || 0) - (a.id || 0);
  });
  const recent = sorted.slice(0, 5);

  // Top 3 categories
  const topCategories = categoryStats.slice(0, 3);

  // Daily average
  const daysInMonth = new Date(
    parseInt(monthYear.split('-')[0]),
    parseInt(monthYear.split('-')[1]),
    0
  ).getDate();
  
  const now = new Date();
  const currentMonthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const daysSoFar = monthYear === currentMonthYear ? now.getDate() : daysInMonth;
  const dailyAverage = daysSoFar > 0 ? Math.round((totalExpense / daysSoFar) * 100) / 100 : 0;

  // Highest expense
  const expenses = transactions.filter(t => t.type === 'expense');
  const highestExpense = expenses.length > 0
    ? expenses.reduce((max, t) => parseFloat(t.amount) > parseFloat(max.amount) ? t : max, expenses[0])
    : null;

  return {
    totalIncome,
    totalExpense,
    remaining,
    categoryStats,
    recent,
    topCategories,
    dailyAverage,
    highestExpense,
    transactionCount: transactions.length,
    expenseCount: expenses.length,
    incomeCount: transactions.filter(t => t.type === 'income').length,
  };
}
