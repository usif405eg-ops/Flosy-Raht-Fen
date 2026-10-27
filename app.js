// ============================================
// app.js — Main Application Logic
// فلوسي راحت فين؟ — Personal Expense Tracker
// ============================================

const APP_VERSION = '1.0.0';

// ============================================
// State
// ============================================
let currentScreen = 'home';
let currentMonth = new Date();
let reportMonth = new Date();
let budgetMonth = new Date();
let categoriesTab = 'expense'; // for categories screen
let editingTransactionId = null;

// Chart colors
const CHART_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#06b6d4', '#f43f5e', '#84cc16', '#64748b'
];

// ============================================
// Utility Functions
// ============================================

function formatMoney(amount) {
  const num = parseFloat(amount) || 0;
  return num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function getMonthYear(date) {
  const d = date instanceof Date ? date : new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getMonthLabel(date) {
  const d = date instanceof Date ? date : new Date(date);
  const months = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getCategoryIcon(categories, catName) {
  const cat = categories.find(c => c.name === catName);
  return cat ? cat.icon || '📦' : '📦';
}

// ============================================
// Toast Notifications
// ============================================

function showToast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toast-container');
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type] || ''}</span> ${message}`;
  
  container.appendChild(toast);
  
  toast.addEventListener('click', () => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-16px)';
    setTimeout(() => toast.remove(), 200);
  });
  
  setTimeout(() => {
    if (toast.parentElement) {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-16px)';
      setTimeout(() => toast.remove(), 200);
    }
  }, duration);
}

// ============================================
// Modal
// ============================================

function showModal(title, message, actions, extraContent = '') {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-message').innerHTML = message;
  document.getElementById('modal-extra-content').innerHTML = extraContent;
  
  const actionsDiv = document.getElementById('modal-actions');
  actionsDiv.innerHTML = '';
  
  actions.forEach(action => {
    const btn = document.createElement('button');
    btn.className = `btn ${action.class || 'btn-secondary'}`;
    btn.textContent = action.text;
    btn.style.flex = '1';
    btn.addEventListener('click', () => {
      closeModal();
      if (action.onClick) action.onClick();
    });
    actionsDiv.appendChild(btn);
  });
  
  document.getElementById('modal-overlay').classList.add('active');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('active');
}

// ============================================
// Navigation
// ============================================

function navigateTo(screen) {
  // Hide all screens
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  
  // Show target screen
  const target = document.getElementById(`screen-${screen}`);
  if (target) {
    target.classList.add('active');
    window.scrollTo(0, 0);
  }
  
  // Update nav
  const navMap = {
    'home': 'home',
    'add-expense': 'add-expense',
    'add-income': 'add-income',
    'transactions': 'transactions',
    'more': 'more',
    'reports': 'more',
    'budgets': 'more',
    'categories': 'more',
    'settings': 'more',
    'edit-transaction': 'transactions',
    'category-detail': 'more',
  };
  
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.nav === navMap[screen]);
  });
  
  currentScreen = screen;
  
  // Trigger screen-specific logic
  switch (screen) {
    case 'home': refreshHome(); break;
    case 'add-expense': initExpenseForm(); break;
    case 'add-income': initIncomeForm(); break;
    case 'transactions': refreshTransactions(); break;
    case 'reports': refreshReports(); break;
    case 'budgets': refreshBudgets(); break;
    case 'categories': refreshCategories(); break;
    case 'settings': refreshSettings(); break;
  }
}

// ============================================
// Home Screen
// ============================================

async function refreshHome() {
  const monthYear = getMonthYear(currentMonth);
  document.getElementById('month-label').textContent = getMonthLabel(currentMonth);
  
  try {
    const summary = await getMonthSummary(monthYear);
    
    // Update summary cards
    document.getElementById('home-total-income').innerHTML = 
      `${formatMoney(summary.totalIncome)} <span class="currency">ج.م</span>`;
    document.getElementById('home-total-expense').innerHTML = 
      `${formatMoney(summary.totalExpense)} <span class="currency">ج.م</span>`;
    
    const remainingEl = document.getElementById('home-remaining');
    remainingEl.innerHTML = `${formatMoney(summary.remaining)} <span class="currency">ج.م</span>`;
    remainingEl.classList.toggle('negative', summary.remaining < 0);
    
    // Top categories
    const topCatEl = document.getElementById('home-top-categories');
    const categories = await getAllCategories();
    
    if (summary.topCategories.length > 0) {
      topCatEl.innerHTML = summary.topCategories.map((cat, i) => `
        <div class="category-bar-item">
          <div class="category-bar-header">
            <span class="category-bar-name">
              <span>${getCategoryIcon(categories, cat.name)}</span> ${cat.name}
            </span>
            <span class="category-bar-amount">${formatMoney(cat.amount)} ج.م</span>
          </div>
          <div class="category-bar-track">
            <div class="category-bar-fill bar-color-${i}" style="width: ${cat.percentage}%"></div>
          </div>
          <div class="category-bar-percentage">${cat.percentage}%</div>
        </div>
      `).join('');
    } else {
      topCatEl.innerHTML = `<div class="empty-state"><div class="empty-icon">📊</div><div class="empty-desc">لا توجد مصروفات بعد</div></div>`;
    }
    
    // Category breakdown
    const breakdownEl = document.getElementById('home-category-breakdown');
    if (summary.categoryStats.length > 0) {
      breakdownEl.innerHTML = summary.categoryStats.map((cat, i) => `
        <div class="category-bar-item">
          <div class="category-bar-header">
            <span class="category-bar-name">
              <span>${getCategoryIcon(categories, cat.name)}</span> ${cat.name}
            </span>
            <span class="category-bar-amount">${formatMoney(cat.amount)} ج.م (${cat.percentage}%)</span>
          </div>
          <div class="category-bar-track">
            <div class="category-bar-fill bar-color-${i % 9}" style="width: ${cat.percentage}%"></div>
          </div>
        </div>
      `).join('');
    } else {
      breakdownEl.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><div class="empty-desc">سجّل أول مصروف لرؤية التوزيع</div></div>`;
    }
    
    // Recent transactions
    const recentEl = document.getElementById('home-recent-transactions');
    if (summary.recent.length > 0) {
      recentEl.innerHTML = summary.recent.map(tx => renderTxItem(tx, categories, false)).join('');
      document.getElementById('home-see-all-btn').style.display = '';
    } else {
      recentEl.innerHTML = `<li class="empty-state"><div class="empty-icon">📝</div><div class="empty-title">لا توجد عمليات بعد</div><div class="empty-desc">ابدأ بتسجيل أول مصروف أو دخل</div></li>`;
      document.getElementById('home-see-all-btn').style.display = 'none';
    }
    
  } catch (e) {
    console.error('خطأ في تحديث الصفحة الرئيسية:', e);
    showToast('حدث خطأ في تحميل البيانات', 'error');
  }
}

function renderTxItem(tx, categories, showActions = true) {
  const icon = getCategoryIcon(categories, tx.category);
  const typeClass = tx.type === 'income' ? 'income' : 'expense';
  const sign = tx.type === 'income' ? '+' : '-';
  
  return `
    <li class="tx-item" data-id="${tx.id}">
      <div class="tx-icon ${typeClass}">${icon}</div>
      <div class="tx-details">
        <div class="tx-name">${tx.name}</div>
        <div class="tx-meta">
          <span>${tx.category}</span>
          <span>•</span>
          <span>${tx.date}</span>
          ${tx.note ? `<span>• ${tx.note}</span>` : ''}
        </div>
      </div>
      <div class="tx-amount ${typeClass}">${sign}${formatMoney(tx.amount)}</div>
      ${showActions ? `
        <div class="tx-actions">
          <button class="tx-action-btn edit" onclick="editTransaction(${tx.id})" title="تعديل">✏️</button>
          <button class="tx-action-btn delete" onclick="confirmDeleteTransaction(${tx.id}, '${tx.name.replace(/'/g, "\\'")}')" title="حذف">🗑️</button>
        </div>
      ` : ''}
    </li>
  `;
}

// Month navigation
function changeMonth(dir) {
  currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + dir, 1);
  refreshHome();
}

function goToCurrentMonth() {
  currentMonth = new Date();
  refreshHome();
}

// ============================================
// Add Expense Form
// ============================================

async function initExpenseForm() {
  // Reset form
  document.getElementById('expense-form').reset();
  document.getElementById('expense-date').value = getTodayStr();
  document.getElementById('expense-submit-btn').textContent = '💾 حفظ المصروف';
  
  // Clear errors
  document.querySelectorAll('#expense-form .form-group').forEach(fg => fg.classList.remove('has-error'));
  
  // Load categories
  const categories = await getCategoriesByType('expense');
  const picker = document.getElementById('expense-category-picker');
  picker.innerHTML = categories.map(cat => `
    <div class="category-option" data-category="${cat.name}">
      <span class="cat-icon">${cat.icon || '📦'}</span>
      <span class="cat-name">${cat.name}</span>
    </div>
  `).join('');
  
  // Category selection
  picker.querySelectorAll('.category-option').forEach(opt => {
    opt.addEventListener('click', () => {
      picker.querySelectorAll('.category-option').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
    });
  });
}

async function submitExpense(e) {
  e.preventDefault();
  
  const name = document.getElementById('expense-name').value.trim();
  const amount = parseFloat(document.getElementById('expense-amount').value);
  const selectedCat = document.querySelector('#expense-category-picker .category-option.selected');
  const category = selectedCat ? selectedCat.dataset.category : '';
  const date = document.getElementById('expense-date').value || getTodayStr();
  const note = document.getElementById('expense-note').value.trim();
  
  // Validation
  let valid = true;
  
  if (!name) {
    document.getElementById('fg-expense-name').classList.add('has-error');
    valid = false;
  } else {
    document.getElementById('fg-expense-name').classList.remove('has-error');
  }
  
  if (!amount || amount <= 0 || isNaN(amount)) {
    document.getElementById('fg-expense-amount').classList.add('has-error');
    valid = false;
  } else {
    document.getElementById('fg-expense-amount').classList.remove('has-error');
  }
  
  if (!category) {
    document.getElementById('fg-expense-category').classList.add('has-error');
    valid = false;
  } else {
    document.getElementById('fg-expense-category').classList.remove('has-error');
  }
  
  if (!valid) {
    showToast('يرجى ملء جميع الحقول المطلوبة', 'warning');
    return;
  }
  
  try {
    await addTransaction({
      type: 'expense',
      name,
      amount: Math.round(amount * 100) / 100,
      category,
      date,
      note,
    });
    
    showToast('تم حفظ المصروف بنجاح ✅', 'success');
    navigateTo('home');
  } catch (e) {
    console.error('خطأ في حفظ المصروف:', e);
    showToast('حدث خطأ في حفظ المصروف', 'error');
  }
}

// ============================================
// Add Income Form
// ============================================

async function initIncomeForm() {
  document.getElementById('income-form').reset();
  document.getElementById('income-date').value = getTodayStr();
  document.getElementById('income-submit-btn').textContent = '💾 حفظ الدخل';
  
  document.querySelectorAll('#income-form .form-group').forEach(fg => fg.classList.remove('has-error'));
  
  const categories = await getCategoriesByType('income');
  const picker = document.getElementById('income-category-picker');
  picker.innerHTML = categories.map(cat => `
    <div class="category-option" data-category="${cat.name}">
      <span class="cat-icon">${cat.icon || '📦'}</span>
      <span class="cat-name">${cat.name}</span>
    </div>
  `).join('');
  
  picker.querySelectorAll('.category-option').forEach(opt => {
    opt.addEventListener('click', () => {
      picker.querySelectorAll('.category-option').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
    });
  });
}

async function submitIncome(e) {
  e.preventDefault();
  
  const name = document.getElementById('income-name').value.trim();
  const amount = parseFloat(document.getElementById('income-amount').value);
  const selectedCat = document.querySelector('#income-category-picker .category-option.selected');
  const category = selectedCat ? selectedCat.dataset.category : '';
  const date = document.getElementById('income-date').value || getTodayStr();
  const note = document.getElementById('income-note').value.trim();
  
  let valid = true;
  
  if (!name) {
    document.getElementById('fg-income-name').classList.add('has-error');
    valid = false;
  } else {
    document.getElementById('fg-income-name').classList.remove('has-error');
  }
  
  if (!amount || amount <= 0 || isNaN(amount)) {
    document.getElementById('fg-income-amount').classList.add('has-error');
    valid = false;
  } else {
    document.getElementById('fg-income-amount').classList.remove('has-error');
  }
  
  if (!category) {
    document.getElementById('fg-income-category').classList.add('has-error');
    valid = false;
  } else {
    document.getElementById('fg-income-category').classList.remove('has-error');
  }
  
  if (!valid) {
    showToast('يرجى ملء جميع الحقول المطلوبة', 'warning');
    return;
  }
  
  try {
    await addTransaction({
      type: 'income',
      name,
      amount: Math.round(amount * 100) / 100,
      category,
      date,
      note,
    });
    
    showToast('تم حفظ الدخل بنجاح ✅', 'success');
    navigateTo('home');
  } catch (e) {
    console.error('خطأ في حفظ الدخل:', e);
    showToast('حدث خطأ في حفظ الدخل', 'error');
  }
}

// ============================================
// Transactions Screen
// ============================================

async function refreshTransactions() {
  try {
    const allTx = await getAllTransactions();
    const categories = await getAllCategories();
    
    // Populate month filter
    const monthFilter = document.getElementById('tx-filter-month');
    const currentFilterMonth = monthFilter.value;
    
    const months = [...new Set(allTx.map(t => t.monthYear))].sort().reverse();
    monthFilter.innerHTML = '<option value="">كل الشهور</option>' +
      months.map(m => {
        const [y, mo] = m.split('-');
        const d = new Date(parseInt(y), parseInt(mo) - 1, 1);
        return `<option value="${m}" ${m === currentFilterMonth ? 'selected' : ''}>${getMonthLabel(d)}</option>`;
      }).join('');
    
    // Populate category filter
    const catFilter = document.getElementById('tx-filter-category');
    const currentFilterCat = catFilter.value;
    catFilter.innerHTML = '<option value="">كل التصنيفات</option>' +
      categories.map(c => `<option value="${c.name}" ${c.name === currentFilterCat ? 'selected' : ''}>${c.icon || ''} ${c.name}</option>`).join('');
    
    applyTransactionFilters(allTx, categories);
  } catch (e) {
    console.error('خطأ في تحميل العمليات:', e);
    showToast('حدث خطأ في تحميل العمليات', 'error');
  }
}

function applyTransactionFilters(allTx, categories) {
  const search = document.getElementById('tx-search').value.trim().toLowerCase();
  const filterMonth = document.getElementById('tx-filter-month').value;
  const filterType = document.getElementById('tx-filter-type').value;
  const filterCat = document.getElementById('tx-filter-category').value;
  
  let filtered = [...allTx];
  
  if (search) {
    filtered = filtered.filter(t => t.name.toLowerCase().includes(search));
  }
  if (filterMonth) {
    filtered = filtered.filter(t => t.monthYear === filterMonth);
  }
  if (filterType) {
    filtered = filtered.filter(t => t.type === filterType);
  }
  if (filterCat) {
    filtered = filtered.filter(t => t.category === filterCat);
  }
  
  // Sort newest first
  filtered.sort((a, b) => {
    const dateCompare = new Date(b.date) - new Date(a.date);
    if (dateCompare !== 0) return dateCompare;
    return (b.id || 0) - (a.id || 0);
  });
  
  // Count info
  document.getElementById('tx-count-info').textContent = 
    `${filtered.length} عملية ${allTx.length !== filtered.length ? `من ${allTx.length}` : ''}`;
  
  const listEl = document.getElementById('transactions-list');
  if (filtered.length > 0) {
    listEl.innerHTML = filtered.map(tx => renderTxItem(tx, categories, true)).join('');
  } else {
    listEl.innerHTML = `
      <li class="empty-state">
        <div class="empty-icon">📝</div>
        <div class="empty-title">لا توجد عمليات</div>
        <div class="empty-desc">${search || filterMonth || filterType || filterCat ? 'لم يتم العثور على عمليات تطابق الفلاتر' : 'ابدأ بتسجيل أول عملية'}</div>
      </li>
    `;
  }
}

// ============================================
// Edit Transaction
// ============================================

async function editTransaction(id) {
  try {
    const tx = await getTransaction(id);
    if (!tx) {
      showToast('العملية غير موجودة', 'error');
      return;
    }
    
    editingTransactionId = id;
    document.getElementById('edit-id').value = tx.id;
    document.getElementById('edit-type').value = tx.type;
    document.getElementById('edit-name').value = tx.name;
    document.getElementById('edit-amount').value = tx.amount;
    document.getElementById('edit-date').value = tx.date;
    document.getElementById('edit-note').value = tx.note || '';
    document.getElementById('edit-name-label').textContent = tx.type === 'income' ? 'مصدر الدخل *' : 'اسم المصروف *';
    
    // Load categories for this type
    const categories = await getCategoriesByType(tx.type);
    const picker = document.getElementById('edit-category-picker');
    picker.innerHTML = categories.map(cat => `
      <div class="category-option ${cat.name === tx.category ? 'selected' : ''}" data-category="${cat.name}">
        <span class="cat-icon">${cat.icon || '📦'}</span>
        <span class="cat-name">${cat.name}</span>
      </div>
    `).join('');
    
    picker.querySelectorAll('.category-option').forEach(opt => {
      opt.addEventListener('click', () => {
        picker.querySelectorAll('.category-option').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
      });
    });
    
    // Clear errors
    document.querySelectorAll('#edit-form .form-group').forEach(fg => fg.classList.remove('has-error'));
    
    navigateTo('edit-transaction');
  } catch (e) {
    console.error('خطأ في تحميل العملية:', e);
    showToast('حدث خطأ في تحميل العملية', 'error');
  }
}

async function submitEdit(e) {
  e.preventDefault();
  
  const id = parseInt(document.getElementById('edit-id').value);
  const type = document.getElementById('edit-type').value;
  const name = document.getElementById('edit-name').value.trim();
  const amount = parseFloat(document.getElementById('edit-amount').value);
  const selectedCat = document.querySelector('#edit-category-picker .category-option.selected');
  const category = selectedCat ? selectedCat.dataset.category : '';
  const date = document.getElementById('edit-date').value;
  const note = document.getElementById('edit-note').value.trim();
  
  let valid = true;
  
  if (!name) {
    document.getElementById('fg-edit-name').classList.add('has-error');
    valid = false;
  } else {
    document.getElementById('fg-edit-name').classList.remove('has-error');
  }
  
  if (!amount || amount <= 0 || isNaN(amount)) {
    document.getElementById('fg-edit-amount').classList.add('has-error');
    valid = false;
  } else {
    document.getElementById('fg-edit-amount').classList.remove('has-error');
  }
  
  if (!category) {
    document.getElementById('fg-edit-category').classList.add('has-error');
    valid = false;
  } else {
    document.getElementById('fg-edit-category').classList.remove('has-error');
  }
  
  if (!valid) {
    showToast('يرجى ملء جميع الحقول المطلوبة', 'warning');
    return;
  }
  
  try {
    const existing = await getTransaction(id);
    await updateTransaction({
      ...existing,
      id,
      type,
      name,
      amount: Math.round(amount * 100) / 100,
      category,
      date,
      note,
    });
    
    showToast('تم تحديث العملية بنجاح ✅', 'success');
    navigateTo('transactions');
  } catch (e) {
    console.error('خطأ في تحديث العملية:', e);
    showToast('حدث خطأ في تحديث العملية', 'error');
  }
}

// ============================================
// Delete Transaction
// ============================================

function confirmDeleteTransaction(id, name) {
  showModal(
    '⚠️ تأكيد الحذف',
    `هل أنت متأكد من حذف "${name}"؟<br>لا يمكن التراجع عن هذا الإجراء.`,
    [
      {
        text: 'حذف',
        class: 'btn-danger',
        onClick: () => doDeleteTransaction(id)
      },
      {
        text: 'إلغاء',
        class: 'btn-secondary'
      }
    ]
  );
}

async function doDeleteTransaction(id) {
  try {
    await deleteTransaction(id);
    showToast('تم حذف العملية ✅', 'success');
    
    if (currentScreen === 'transactions') {
      refreshTransactions();
    } else {
      refreshHome();
    }
  } catch (e) {
    console.error('خطأ في حذف العملية:', e);
    showToast('حدث خطأ في حذف العملية', 'error');
  }
}

// ============================================
// Reports Screen
// ============================================

async function refreshReports() {
  const monthYear = getMonthYear(reportMonth);
  document.getElementById('report-month-label').textContent = getMonthLabel(reportMonth);
  
  try {
    const summary = await getMonthSummary(monthYear);
    
    // Stats
    document.getElementById('report-income').textContent = formatMoney(summary.totalIncome);
    document.getElementById('report-expense').textContent = formatMoney(summary.totalExpense);
    document.getElementById('report-remaining').textContent = formatMoney(summary.remaining);
    document.getElementById('report-tx-count').textContent = summary.transactionCount;
    document.getElementById('report-daily-avg').textContent = formatMoney(summary.dailyAverage);
    document.getElementById('report-highest').textContent = summary.highestExpense 
      ? formatMoney(summary.highestExpense.amount) 
      : '0';
    
    // Donut chart
    const donutContainer = document.getElementById('report-donut-container');
    if (summary.categoryStats.length > 0) {
      donutContainer.innerHTML = renderDonutChart(summary.categoryStats, summary.totalExpense);
    } else {
      donutContainer.innerHTML = `<div class="empty-state"><div class="empty-icon">🍩</div><div class="empty-desc">لا توجد مصروفات لعرض التوزيع</div></div>`;
    }
    
    // Category detail list (clickable)
    const categories = await getAllCategories();
    const catListEl = document.getElementById('report-category-list');
    if (summary.categoryStats.length > 0) {
      catListEl.innerHTML = summary.categoryStats.map((cat, i) => `
        <li class="category-bar-item" style="cursor:pointer;" onclick="showCategoryDetail('${cat.name.replace(/'/g, "\\'")}', '${monthYear}')">
          <div class="category-bar-header">
            <span class="category-bar-name">
              <span>${getCategoryIcon(categories, cat.name)}</span> ${cat.name}
            </span>
            <span class="category-bar-amount">${formatMoney(cat.amount)} ج.م (${cat.percentage}%)</span>
          </div>
          <div class="category-bar-track">
            <div class="category-bar-fill bar-color-${i % 9}" style="width: ${cat.percentage}%"></div>
          </div>
        </li>
      `).join('');
    } else {
      catListEl.innerHTML = `<li class="empty-state"><div class="empty-desc">لا توجد بيانات</div></li>`;
    }
    
    // Month comparison
    await renderMonthComparison(monthYear);
    
  } catch (e) {
    console.error('خطأ في تحميل التقارير:', e);
    showToast('حدث خطأ في تحميل التقارير', 'error');
  }
}

function renderDonutChart(categoryStats, totalExpense) {
  let conicGradient = '';
  let currentAngle = 0;
  
  const slices = categoryStats.map((cat, i) => {
    const angle = (cat.amount / totalExpense) * 360;
    const startAngle = currentAngle;
    currentAngle += angle;
    return {
      ...cat,
      color: CHART_COLORS[i % CHART_COLORS.length],
      startAngle,
      endAngle: currentAngle,
    };
  });
  
  const gradientParts = slices.map(s => `${s.color} ${s.startAngle}deg ${s.endAngle}deg`);
  conicGradient = `conic-gradient(${gradientParts.join(', ')})`;
  
  const donutHTML = `
    <div class="donut-chart" style="background: ${conicGradient};">
      <div class="donut-center">
        <div class="donut-center-label">إجمالي</div>
        <div class="donut-center-value">${formatMoney(totalExpense)}</div>
      </div>
    </div>
    <div class="donut-legend">
      ${slices.map(s => `
        <div class="legend-item" onclick="showCategoryDetail('${s.name.replace(/'/g, "\\'")}', '${getMonthYear(reportMonth)}')">
          <span class="legend-dot" style="background: ${s.color}"></span>
          <span>${s.name} (${s.percentage}%)</span>
        </div>
      `).join('')}
    </div>
  `;
  
  return donutHTML;
}

async function renderMonthComparison(currentMonthYear) {
  const [year, month] = currentMonthYear.split('-').map(Number);
  const prevDate = new Date(year, month - 2, 1);
  const prevMonthYear = getMonthYear(prevDate);
  
  const currentSummary = await getMonthSummary(currentMonthYear);
  const prevSummary = await getMonthSummary(prevMonthYear);
  
  const compEl = document.getElementById('report-comparison');
  
  if (prevSummary.transactionCount === 0 && currentSummary.transactionCount === 0) {
    compEl.innerHTML = `<div class="empty-state"><div class="empty-desc">لا توجد بيانات كافية للمقارنة</div></div>`;
    return;
  }
  
  const maxExpense = Math.max(currentSummary.totalExpense, prevSummary.totalExpense, 1);
  const diff = currentSummary.totalExpense - prevSummary.totalExpense;
  const diffPct = prevSummary.totalExpense > 0 
    ? Math.round((diff / prevSummary.totalExpense) * 100) 
    : (currentSummary.totalExpense > 0 ? 100 : 0);
  
  compEl.innerHTML = `
    <div class="comparison-chart">
      <div class="comparison-bar-group">
        <div class="comparison-bar current" style="height: ${(currentSummary.totalExpense / maxExpense) * 100}px"></div>
        <div class="comparison-bar-label">الحالي</div>
        <div class="comparison-bar-label">${formatMoney(currentSummary.totalExpense)}</div>
      </div>
      <div class="comparison-bar-group">
        <div class="comparison-bar prev" style="height: ${(prevSummary.totalExpense / maxExpense) * 100}px"></div>
        <div class="comparison-bar-label">السابق</div>
        <div class="comparison-bar-label">${formatMoney(prevSummary.totalExpense)}</div>
      </div>
    </div>
    <div style="text-align:center; margin-top:8px;">
      <span class="comparison-diff ${diff > 0 ? 'positive' : 'negative'}">
        ${diff > 0 ? '↑' : diff < 0 ? '↓' : '='} ${Math.abs(diffPct)}% 
        ${diff > 0 ? 'زيادة' : diff < 0 ? 'انخفاض' : 'لا تغيير'}
      </span>
    </div>
    <div class="comparison-row">
      <span class="comparison-label">الدخل</span>
      <div class="comparison-values">
        <span>${formatMoney(currentSummary.totalIncome)}</span>
        <span style="color:var(--text-muted)">←</span>
        <span>${formatMoney(prevSummary.totalIncome)}</span>
      </div>
    </div>
    <div class="comparison-row">
      <span class="comparison-label">المصروفات</span>
      <div class="comparison-values">
        <span>${formatMoney(currentSummary.totalExpense)}</span>
        <span style="color:var(--text-muted)">←</span>
        <span>${formatMoney(prevSummary.totalExpense)}</span>
      </div>
    </div>
    <div class="comparison-row">
      <span class="comparison-label">المتبقي</span>
      <div class="comparison-values">
        <span>${formatMoney(currentSummary.remaining)}</span>
        <span style="color:var(--text-muted)">←</span>
        <span>${formatMoney(prevSummary.remaining)}</span>
      </div>
    </div>
  `;
}

// Category detail screen
async function showCategoryDetail(catName, monthYear) {
  document.getElementById('cat-detail-title').textContent = `📋 ${catName}`;
  
  const transactions = await getTransactionsByMonth(monthYear);
  const catTx = transactions.filter(t => t.category === catName && t.type === 'expense');
  const categories = await getAllCategories();
  
  const total = catTx.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  document.getElementById('cat-detail-total').textContent = formatMoney(total);
  document.getElementById('cat-detail-count').textContent = catTx.length;
  
  const listEl = document.getElementById('cat-detail-list');
  if (catTx.length > 0) {
    catTx.sort((a, b) => new Date(b.date) - new Date(a.date));
    listEl.innerHTML = catTx.map(tx => renderTxItem(tx, categories, false)).join('');
  } else {
    listEl.innerHTML = `<li class="empty-state"><div class="empty-desc">لا توجد عمليات</div></li>`;
  }
  
  navigateTo('category-detail');
}

// Report month navigation
function changeReportMonth(dir) {
  reportMonth = new Date(reportMonth.getFullYear(), reportMonth.getMonth() + dir, 1);
  refreshReports();
}

// ============================================
// Budgets Screen
// ============================================

async function refreshBudgets() {
  const monthYear = getMonthYear(budgetMonth);
  document.getElementById('budget-month-label').textContent = getMonthLabel(budgetMonth);
  
  try {
    const budgets = await getBudgetsByMonth(monthYear);
    const summary = await getMonthSummary(monthYear);
    const categories = await getCategoriesByType('expense');
    
    // Find overall budget
    const overallBudget = budgets.find(b => b.budgetType === 'overall');
    
    if (overallBudget) {
      document.getElementById('budget-expected-income').value = overallBudget.expectedIncome || '';
      document.getElementById('budget-total-limit').value = overallBudget.totalLimit || '';
      
      // Show progress
      if (overallBudget.totalLimit > 0) {
        const progressEl = document.getElementById('budget-overall-progress');
        progressEl.style.display = '';
        
        const spent = summary.totalExpense;
        const limit = overallBudget.totalLimit;
        const pct = Math.min((spent / limit) * 100, 100);
        const remaining = limit - spent;
        
        document.getElementById('budget-overall-info').textContent = 
          `${formatMoney(spent)} / ${formatMoney(limit)} ج.م`;
        
        const bar = document.getElementById('budget-overall-bar');
        bar.style.width = `${pct}%`;
        bar.className = 'budget-progress-bar ' + (pct >= 100 ? 'danger' : pct >= 80 ? 'warning' : 'safe');
        
        document.getElementById('budget-overall-stats').innerHTML = `
          <span>مصروف: ${formatMoney(spent)} ج.م</span>
          <span>متبقي: ${formatMoney(Math.max(remaining, 0))} ج.م</span>
          <span>${Math.round(pct)}%</span>
        `;
        
        const alertEl = document.getElementById('budget-overall-alert');
        if (pct >= 100) {
          alertEl.innerHTML = `<div class="budget-alert danger">⚠️ تجاوزت الميزانية بـ ${formatMoney(Math.abs(remaining))} ج.م!</div>`;
        } else if (pct >= 80) {
          alertEl.innerHTML = `<div class="budget-alert warning">⚠️ اقتربت من حد الميزانية — متبقي ${formatMoney(remaining)} ج.م فقط</div>`;
        } else {
          alertEl.innerHTML = '';
        }
      } else {
        document.getElementById('budget-overall-progress').style.display = 'none';
      }
    } else {
      document.getElementById('budget-expected-income').value = '';
      document.getElementById('budget-total-limit').value = '';
      document.getElementById('budget-overall-progress').style.display = 'none';
    }
    
    // Category budgets form
    const catBudgetsForm = document.getElementById('category-budgets-form');
    const catBudgets = budgets.filter(b => b.budgetType === 'category');
    
    catBudgetsForm.innerHTML = categories.map(cat => {
      const existing = catBudgets.find(b => b.categoryName === cat.name);
      const val = existing ? existing.limit : '';
      return `
        <div class="form-group" style="margin-bottom:10px;">
          <label style="font-size:0.82rem;">${cat.icon || '📦'} ${cat.name}</label>
          <input type="number" class="form-control cat-budget-input" 
            data-category="${cat.name}" 
            value="${val}" 
            placeholder="بدون حد" 
            min="0" step="1" inputmode="numeric"
            style="padding:10px 14px; font-size:0.9rem;">
        </div>
      `;
    }).join('');
    
    // Category budget progress
    renderCategoryBudgetProgress(catBudgets, summary, categories);
    
  } catch (e) {
    console.error('خطأ في تحميل الميزانيات:', e);
    showToast('حدث خطأ في تحميل الميزانيات', 'error');
  }
}

function renderCategoryBudgetProgress(catBudgets, summary, categories) {
  const container = document.getElementById('category-budgets-progress');
  
  const activeBudgets = catBudgets.filter(b => b.limit > 0);
  if (activeBudgets.length === 0) {
    container.innerHTML = '';
    return;
  }
  
  container.innerHTML = activeBudgets.map(budget => {
    const catStat = summary.categoryStats.find(c => c.name === budget.categoryName);
    const spent = catStat ? catStat.amount : 0;
    const limit = budget.limit;
    const pct = Math.min((spent / limit) * 100, 100);
    const remaining = limit - spent;
    const icon = getCategoryIcon(categories, budget.categoryName);
    
    let alertHTML = '';
    if (pct >= 100) {
      alertHTML = `<div class="budget-alert danger">⚠️ تجاوزت ميزانية ${budget.categoryName}!</div>`;
    } else if (pct >= 80) {
      alertHTML = `<div class="budget-alert warning">⚠️ اقتربت من الحد</div>`;
    }
    
    return `
      <div class="budget-card">
        <div class="budget-header">
          <span class="budget-name">${icon} ${budget.categoryName}</span>
          <span class="budget-amount-info">${formatMoney(spent)} / ${formatMoney(limit)} ج.م</span>
        </div>
        <div class="budget-progress">
          <div class="budget-progress-bar ${pct >= 100 ? 'danger' : pct >= 80 ? 'warning' : 'safe'}" 
            style="width: ${pct}%"></div>
        </div>
        <div class="budget-stats">
          <span>مصروف: ${formatMoney(spent)}</span>
          <span>متبقي: ${formatMoney(Math.max(remaining, 0))}</span>
          <span>${Math.round(pct)}%</span>
        </div>
        ${alertHTML}
      </div>
    `;
  }).join('');
}

async function saveOverallBudget() {
  const monthYear = getMonthYear(budgetMonth);
  const expectedIncome = parseFloat(document.getElementById('budget-expected-income').value) || 0;
  const totalLimit = parseFloat(document.getElementById('budget-total-limit').value) || 0;
  
  try {
    const existing = await getBudgetsByMonth(monthYear);
    const overallBudget = existing.find(b => b.budgetType === 'overall');
    
    if (overallBudget) {
      await updateBudget({
        ...overallBudget,
        expectedIncome,
        totalLimit,
      });
    } else {
      await addBudget({
        budgetType: 'overall',
        monthYear,
        expectedIncome,
        totalLimit,
      });
    }
    
    showToast('تم حفظ الميزانية ✅', 'success');
    refreshBudgets();
  } catch (e) {
    console.error('خطأ في حفظ الميزانية:', e);
    showToast('حدث خطأ في حفظ الميزانية', 'error');
  }
}

async function saveCategoryBudgets() {
  const monthYear = getMonthYear(budgetMonth);
  
  try {
    const inputs = document.querySelectorAll('.cat-budget-input');
    const existing = await getBudgetsByMonth(monthYear);
    
    for (const input of inputs) {
      const catName = input.dataset.category;
      const limit = parseFloat(input.value) || 0;
      const existingBudget = existing.find(b => b.budgetType === 'category' && b.categoryName === catName);
      
      if (existingBudget) {
        await updateBudget({
          ...existingBudget,
          limit,
        });
      } else if (limit > 0) {
        await addBudget({
          budgetType: 'category',
          monthYear,
          categoryName: catName,
          limit,
        });
      }
    }
    
    showToast('تم حفظ ميزانيات التصنيفات ✅', 'success');
    refreshBudgets();
  } catch (e) {
    console.error('خطأ في حفظ ميزانيات التصنيفات:', e);
    showToast('حدث خطأ', 'error');
  }
}

function changeBudgetMonth(dir) {
  budgetMonth = new Date(budgetMonth.getFullYear(), budgetMonth.getMonth() + dir, 1);
  refreshBudgets();
}

// ============================================
// Categories Management Screen
// ============================================

async function refreshCategories() {
  const categories = await getAllCategories();
  const filtered = categories.filter(c => c.type === categoriesTab);
  
  // Update tabs
  document.querySelectorAll('#screen-categories .tab-btn').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === categoriesTab);
  });
  
  const listEl = document.getElementById('categories-list');
  if (filtered.length > 0) {
    listEl.innerHTML = filtered.map(cat => `
      <div class="cat-manage-item" data-id="${cat.id}">
        <div class="cat-manage-icon">${cat.icon || '📦'}</div>
        <div class="cat-manage-info">
          <div class="cat-manage-name">${cat.name}</div>
          <div class="cat-manage-type">${cat.type === 'income' ? 'دخل' : 'مصروف'} ${cat.isDefault ? '(افتراضي)' : ''}</div>
        </div>
        <div class="cat-manage-actions">
          <button class="tx-action-btn" onclick="editCategoryPrompt(${cat.id})" title="تعديل">✏️</button>
          <button class="tx-action-btn delete" onclick="confirmDeleteCategory(${cat.id}, '${cat.name.replace(/'/g, "\\'")}')" title="حذف">🗑️</button>
        </div>
      </div>
    `).join('');
  } else {
    listEl.innerHTML = `<div class="empty-state"><div class="empty-desc">لا توجد تصنيفات</div></div>`;
  }
}

async function addNewCategory() {
  const name = document.getElementById('new-cat-name').value.trim();
  const icon = document.getElementById('new-cat-icon').value.trim() || '📦';
  
  if (!name) {
    showToast('يرجى إدخال اسم التصنيف', 'warning');
    return;
  }
  
  // Check duplicate
  const existing = await getAllCategories();
  if (existing.find(c => c.name === name && c.type === categoriesTab)) {
    showToast('هذا التصنيف موجود بالفعل', 'warning');
    return;
  }
  
  try {
    await addCategory({
      name,
      type: categoriesTab,
      icon,
      isDefault: false,
    });
    
    document.getElementById('new-cat-name').value = '';
    document.getElementById('new-cat-icon').value = '';
    
    showToast('تم إضافة التصنيف ✅', 'success');
    refreshCategories();
  } catch (e) {
    console.error('خطأ في إضافة التصنيف:', e);
    showToast('حدث خطأ في إضافة التصنيف', 'error');
  }
}

async function editCategoryPrompt(id) {
  const cat = await getCategory(id);
  if (!cat) return;
  
  const newName = prompt('اسم التصنيف الجديد:', cat.name);
  if (newName === null) return;
  if (!newName.trim()) {
    showToast('لا يمكن ترك الاسم فارغًا', 'warning');
    return;
  }
  
  const newIcon = prompt('الأيقونة (emoji):', cat.icon || '📦');
  
  const oldName = cat.name;
  cat.name = newName.trim();
  cat.icon = newIcon || cat.icon;
  
  try {
    await updateCategory(cat);
    
    // If name changed, update all transactions with old name
    if (oldName !== cat.name) {
      await reassignCategory(oldName, cat.name);
    }
    
    showToast('تم تحديث التصنيف ✅', 'success');
    refreshCategories();
  } catch (e) {
    console.error('خطأ في تحديث التصنيف:', e);
    showToast('حدث خطأ في تحديث التصنيف', 'error');
  }
}

async function confirmDeleteCategory(id, name) {
  const used = await isCategoryUsed(name);
  
  if (used) {
    // Show reassign modal
    const categories = await getAllCategories();
    const cat = categories.find(c => c.id === id);
    const sametype = categories.filter(c => c.type === cat.type && c.id !== id);
    
    if (sametype.length === 0) {
      showToast('لا يمكن حذف التصنيف الوحيد من هذا النوع', 'error');
      return;
    }
    
    const options = sametype.map(c => `<option value="${c.name}">${c.icon || ''} ${c.name}</option>`).join('');
    
    showModal(
      '⚠️ تصنيف مستخدم',
      `التصنيف "${name}" مرتبط بعمليات سابقة. اختر تصنيفًا بديلًا لنقل هذه العمليات إليه:`,
      [
        {
          text: 'نقل وحذف',
          class: 'btn-danger',
          onClick: async () => {
            const select = document.getElementById('reassign-select');
            const newCat = select.value;
            if (newCat) {
              await reassignCategory(name, newCat);
              await deleteCategory(id);
              showToast('تم نقل العمليات وحذف التصنيف ✅', 'success');
              refreshCategories();
            }
          }
        },
        { text: 'إلغاء', class: 'btn-secondary' }
      ],
      `<select id="reassign-select" class="form-control reassign-select">${options}</select>`
    );
  } else {
    showModal(
      '⚠️ تأكيد الحذف',
      `هل أنت متأكد من حذف تصنيف "${name}"؟`,
      [
        {
          text: 'حذف',
          class: 'btn-danger',
          onClick: async () => {
            await deleteCategory(id);
            showToast('تم حذف التصنيف ✅', 'success');
            refreshCategories();
          }
        },
        { text: 'إلغاء', class: 'btn-secondary' }
      ]
    );
  }
}

// ============================================
// Settings Screen
// ============================================

async function refreshSettings() {
  const allTx = await getAllTransactions();
  document.getElementById('settings-tx-count').textContent = `${allTx.length} عملية مسجلة`;
  
  // Dark mode toggle state
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  document.getElementById('dark-mode-toggle').checked = isDark;
}

// ============================================
// Dark Mode
// ============================================

async function toggleDarkMode(isDark) {
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  document.querySelector('meta[name="theme-color"]').setAttribute('content', isDark ? '#1e293b' : '#6366f1');
  
  try {
    await setSetting('darkMode', isDark);
  } catch (e) {
    console.error('خطأ في حفظ إعداد الوضع:', e);
  }
}

async function loadDarkMode() {
  try {
    const isDark = await getSetting('darkMode');
    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.querySelector('meta[name="theme-color"]').setAttribute('content', '#1e293b');
      const toggle = document.getElementById('dark-mode-toggle');
      if (toggle) toggle.checked = true;
    }
  } catch (e) {
    // Ignore - defaults to light
  }
}

// ============================================
// Backup & Restore
// ============================================

async function downloadBackup() {
  try {
    const data = await exportAllData();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `فلوسي-نسخة-احتياطية-${getTodayStr()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('تم تنزيل النسخة الاحتياطية ✅', 'success');
  } catch (e) {
    console.error('خطأ في تنزيل النسخة:', e);
    showToast('حدث خطأ في تنزيل النسخة الاحتياطية', 'error');
  }
}

async function handleImport(file) {
  if (!file) return;
  
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    
    const validation = validateBackupData(data);
    if (!validation.valid) {
      showToast(validation.error, 'error');
      return;
    }
    
    const stats = validation.stats;
    
    showModal(
      '📤 استعادة نسخة احتياطية',
      `الملف يحتوي على:<br>
       • ${stats.transactions} عملية<br>
       • ${stats.categories} تصنيف<br>
       • ${stats.budgets} ميزانية<br><br>
       اختر طريقة الاستعادة:`,
      [
        {
          text: 'استبدال الكل',
          class: 'btn-danger',
          onClick: () => {
            showModal(
              '⚠️ تأكيد الاستبدال',
              'سيتم حذف جميع البيانات الحالية واستبدالها بالنسخة الاحتياطية. هل أنت متأكد؟',
              [
                {
                  text: 'نعم، استبدل',
                  class: 'btn-danger',
                  onClick: async () => {
                    try {
                      await importData(data, 'replace');
                      showToast('تمت الاستعادة بنجاح ✅', 'success');
                      navigateTo('home');
                    } catch (e) {
                      showToast('حدث خطأ في الاستعادة: ' + e.message, 'error');
                    }
                  }
                },
                { text: 'إلغاء', class: 'btn-secondary' }
              ]
            );
          }
        },
        {
          text: 'دمج مع الحالي',
          class: 'btn-primary',
          onClick: async () => {
            try {
              await importData(data, 'merge');
              showToast('تم الدمج بنجاح ✅', 'success');
              navigateTo('home');
            } catch (e) {
              showToast('حدث خطأ في الدمج: ' + e.message, 'error');
            }
          }
        },
        { text: 'إلغاء', class: 'btn-secondary' }
      ]
    );
  } catch (e) {
    console.error('خطأ في قراءة الملف:', e);
    showToast('ملف غير صالح — تأكد من أنه ملف JSON سليم', 'error');
  }
}

async function downloadCSV() {
  try {
    const csv = await exportTransactionsCSV();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `فلوسي-عمليات-${getTodayStr()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('تم تصدير ملف CSV ✅', 'success');
  } catch (e) {
    console.error('خطأ في تصدير CSV:', e);
    showToast('حدث خطأ في تصدير الملف', 'error');
  }
}

// ============================================
// Event Listeners & Initialization
// ============================================

function setupEventListeners() {
  // Bottom Navigation
  document.querySelectorAll('.nav-item[data-nav]').forEach(item => {
    item.addEventListener('click', () => navigateTo(item.dataset.nav));
  });
  
  // All [data-navigate] buttons/links
  document.querySelectorAll('[data-navigate]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo(el.dataset.navigate);
    });
  });
  
  // Home action buttons
  document.getElementById('home-add-expense').addEventListener('click', () => navigateTo('add-expense'));
  document.getElementById('home-add-income').addEventListener('click', () => navigateTo('add-income'));
  document.getElementById('home-see-all-btn').addEventListener('click', () => navigateTo('transactions'));
  
  // Month navigation (home)
  document.getElementById('prev-month-btn').addEventListener('click', () => changeMonth(-1));
  document.getElementById('next-month-btn').addEventListener('click', () => changeMonth(1));
  document.getElementById('today-btn').addEventListener('click', goToCurrentMonth);
  
  // Report month navigation
  document.getElementById('report-prev-month').addEventListener('click', () => changeReportMonth(-1));
  document.getElementById('report-next-month').addEventListener('click', () => changeReportMonth(1));
  document.getElementById('report-today-btn').addEventListener('click', () => {
    reportMonth = new Date();
    refreshReports();
  });
  
  // Budget month navigation
  document.getElementById('budget-prev-month').addEventListener('click', () => changeBudgetMonth(-1));
  document.getElementById('budget-next-month').addEventListener('click', () => changeBudgetMonth(1));
  
  // Expense form
  document.getElementById('expense-form').addEventListener('submit', submitExpense);
  
  // Income form
  document.getElementById('income-form').addEventListener('submit', submitIncome);
  
  // Edit form
  document.getElementById('edit-form').addEventListener('submit', submitEdit);
  
  // Transaction filters
  document.getElementById('tx-search').addEventListener('input', () => {
    if (currentScreen === 'transactions') {
      getAllTransactions().then(allTx => {
        getAllCategories().then(cats => applyTransactionFilters(allTx, cats));
      });
    }
  });
  
  ['tx-filter-month', 'tx-filter-type', 'tx-filter-category'].forEach(id => {
    document.getElementById(id).addEventListener('change', () => {
      if (currentScreen === 'transactions') {
        getAllTransactions().then(allTx => {
          getAllCategories().then(cats => applyTransactionFilters(allTx, cats));
        });
      }
    });
  });
  
  document.getElementById('clear-filters-btn').addEventListener('click', () => {
    document.getElementById('tx-search').value = '';
    document.getElementById('tx-filter-month').value = '';
    document.getElementById('tx-filter-type').value = '';
    document.getElementById('tx-filter-category').value = '';
    refreshTransactions();
  });
  
  // Categories tabs
  document.querySelectorAll('#screen-categories .tab-btn').forEach(tab => {
    tab.addEventListener('click', () => {
      categoriesTab = tab.dataset.tab;
      refreshCategories();
    });
  });
  
  // Add category
  document.getElementById('add-cat-btn').addEventListener('click', addNewCategory);
  document.getElementById('new-cat-name').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addNewCategory();
    }
  });
  
  // Dark mode toggle
  document.getElementById('dark-mode-toggle').addEventListener('change', (e) => {
    toggleDarkMode(e.target.checked);
  });
  
  // Backup
  document.getElementById('export-json-btn').addEventListener('click', downloadBackup);
  document.getElementById('import-json-input').addEventListener('change', (e) => {
    if (e.target.files[0]) {
      handleImport(e.target.files[0]);
      e.target.value = ''; // Reset
    }
  });
  document.getElementById('export-csv-btn').addEventListener('click', downloadCSV);
  
  // Budget save
  document.getElementById('save-overall-budget').addEventListener('click', saveOverallBudget);
  document.getElementById('save-category-budgets').addEventListener('click', saveCategoryBudgets);
  
  // Modal close on overlay click
  document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('modal-overlay')) {
      closeModal();
    }
  });
  
  // Close modal on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
}

// ============================================
// App Initialization
// ============================================

async function initApp() {
  try {
    await initDB();
    await loadDarkMode();
    setupEventListeners();
    await refreshHome();
    
    // Register Service Worker
    if ('serviceWorker' in navigator) {
      try {
        await navigator.serviceWorker.register('service-worker.js');
        console.log('Service Worker registered');
      } catch (e) {
        console.log('Service Worker registration failed (OK for local dev):', e);
      }
    }
    
    console.log('فلوسي راحت فين؟ — التطبيق جاهز ✅');
  } catch (e) {
    console.error('خطأ في تهيئة التطبيق:', e);
    showToast('حدث خطأ في تهيئة التطبيق — ' + e.message, 'error', 5000);
  }
}

// Start app
document.addEventListener('DOMContentLoaded', initApp);
