const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const CATEGORY_COLOURS = {
  'Food & Drinks': '#f59e0b',
  'Transport': '#3b82f6',
  'Utilities': '#10b981',
  'Entertainment': '#ec4899',
  'Health': '#ef4444',
  'Shopping': '#8b5cf6',
  'Education': '#14b8a6',
  'Other': '#64748b'
};

const STORAGE_KEY = 'kala_expenses';

const form = document.getElementById('expense-form');
const nameInput = document.getElementById('expense-name');
const amountInput = document.getElementById('expense-amount');
const categorySelect = document.getElementById('expense-category');
const expenseList = document.getElementById('expense-list');
const totalAmount = document.getElementById('total-amount');
const expenseCount = document.getElementById('expense-count');
const searchInput = document.getElementById('search-input');
const sortSelect = document.getElementById('sort-select');
const filterChips = document.getElementById('filter-chips');
const categoryBreakdown = document.getElementById('category-breakdown');
const exportBtn = document.getElementById('export-btn');
const editModal = document.getElementById('edit-modal');
const editForm = document.getElementById('edit-form');
const editName = document.getElementById('edit-name');
const editAmount = document.getElementById('edit-amount');
const editCategory = document.getElementById('edit-category');
const cancelEdit = document.getElementById('cancel-edit');
const periodTabs = document.getElementById('period-tabs');
const periodPrev = document.getElementById('period-prev');
const periodNext = document.getElementById('period-next');
const periodToday = document.getElementById('period-today');
const periodLabel = document.getElementById('period-label');
const periodNav = document.getElementById('period-nav');
const periodCustom = document.getElementById('period-custom');
const periodStart = document.getElementById('period-start');
const periodEnd = document.getElementById('period-end');
const periodTotalAmount = document.getElementById('period-total-amount');
const periodTotalLabel = document.getElementById('period-total-label');
const periodBadge = document.getElementById('period-badge');

let expenses = [];
let editingIndex = null;
let activeFilter = null;
let activePeriod = 'month';
let activeDate = new Date();
let customStart = '';
let customEnd = '';

function loadExpenses() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      expenses = JSON.parse(data);
    }
  } catch {
    expenses = [];
  }
}

function saveExpenses() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
}

function formatCurrency(amount) {
  const num = Number(amount);
  if (num >= 1000000) {
    return '₦' + (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1000) {
    return '₦' + num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
  return '₦' + num.toFixed(2);
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now - d;
  const day = 86400000;

  if (diff < day && d.getDate() === now.getDate()) {
    return 'Today, ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.getDate() === yesterday.getDate() && d.getMonth() === yesterday.getMonth() && d.getFullYear() === yesterday.getFullYear()) {
    return 'Yesterday, ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return days[d.getDay()] + ' ' + d.getDate() + ' ' + months[d.getMonth()] + ', ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function getPeriodRange() {
  const d = new Date(activeDate);
  let start, end, label;

  switch (activePeriod) {
    case 'week': {
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      start = new Date(d.getFullYear(), d.getMonth(), diff);
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setDate(end.getDate() + 7);
      label = 'Week of ' + start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      break;
    }
    case 'month': {
      start = new Date(d.getFullYear(), d.getMonth(), 1);
      end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      label = MONTHS[d.getMonth()] + ' ' + d.getFullYear();
      break;
    }
    case 'quarter': {
      const q = Math.floor(d.getMonth() / 3);
      start = new Date(d.getFullYear(), q * 3, 1);
      end = new Date(d.getFullYear(), (q + 1) * 3, 1);
      label = 'Q' + (q + 1) + ' ' + d.getFullYear();
      break;
    }
    case 'year': {
      start = new Date(d.getFullYear(), 0, 1);
      end = new Date(d.getFullYear() + 1, 0, 1);
      label = String(d.getFullYear());
      break;
    }
    case 'custom': {
      if (customStart && customEnd) {
        start = new Date(customStart + 'T00:00:00');
        end = new Date(customEnd + 'T00:00:00');
        end.setDate(end.getDate() + 1);
        label = customStart + ' to ' + customEnd;
      } else {
        start = null;
        end = null;
        label = 'Custom Range';
      }
      break;
    }
    default:
      start = null;
      end = null;
      label = 'All Time';
  }

  return { start: start, end: end, label: label };
}

function getExpensesInPeriod() {
  if (activePeriod === 'all') return [...expenses];
  const range = getPeriodRange();
  if (!range.start && !range.end) return [...expenses];
  return expenses.filter(function (e) {
    const d = new Date(e.date);
    if (range.start && d < range.start) return false;
    if (range.end && d >= range.end) return false;
    return true;
  });
}

function renderPeriodView() {
  const range = getPeriodRange();
  periodLabel.textContent = range.label;

  const list = getExpensesInPeriod();
  const total = list.reduce(function (sum, e) { return sum + Number(e.amount); }, 0);
  periodTotalAmount.textContent = formatCurrency(total);

  if (activePeriod === 'all') {
    periodBadge.textContent = expenses.length + ' expenses';
    periodTotalLabel.textContent = 'Total (All Time)';
  } else {
    periodBadge.textContent = list.length + ' expenses';
    periodTotalLabel.textContent = 'Total for ' + range.label;
  }

  periodNav.style.display = (activePeriod === 'all' || activePeriod === 'custom') ? 'none' : 'flex';
  periodCustom.style.display = activePeriod === 'custom' ? 'block' : 'none';
  periodToday.classList.toggle('active', activePeriod !== 'all');

  document.querySelectorAll('.period-tab').forEach(function (tab) {
    tab.classList.toggle('active', tab.getAttribute('data-period') === activePeriod);
  });
}

function getFilteredExpenses() {
  let filtered = [...expenses];

  const query = searchInput.value.trim().toLowerCase();
  if (query) {
    filtered = filtered.filter(function (e) {
      return e.name.toLowerCase().includes(query);
    });
  }

  if (activeFilter) {
    filtered = filtered.filter(function (e) {
      return e.category === activeFilter;
    });
  }

  if (activePeriod !== 'all') {
    const periodExpenses = getExpensesInPeriod();
    filtered = filtered.filter(function (e) {
      return periodExpenses.indexOf(e) !== -1;
    });
  }

  const sort = sortSelect.value;
  filtered.sort(function (a, b) {
    switch (sort) {
      case 'newest': return new Date(b.date) - new Date(a.date);
      case 'oldest': return new Date(a.date) - new Date(b.date);
      case 'highest': return b.amount - a.amount;
      case 'lowest': return a.amount - b.amount;
      case 'a-z': return a.name.localeCompare(b.name);
      case 'z-a': return b.name.localeCompare(a.name);
      default: return 0;
    }
  });

  return filtered;
}

function updateTotal() {
  const total = expenses.reduce(function (sum, e) { return sum + Number(e.amount); }, 0);
  totalAmount.textContent = formatCurrency(total);
}

function updateCount() {
  expenseCount.textContent = expenses.length;
}

function renderCategoryBreakdown() {
  const map = {};
  expenses.forEach(function (e) {
    map[e.category] = (map[e.category] || 0) + Number(e.amount);
  });

  const entries = Object.entries(map).sort(function (a, b) { return b[1] - a[1]; });

  if (entries.length === 0) {
    categoryBreakdown.innerHTML = '';
    return;
  }

  categoryBreakdown.innerHTML = entries.map(function (_ref) {
    var cat = _ref[0], total = _ref[1];
    return '<div class="category-chip">\
      <span class="chip-dot" style="background:' + (CATEGORY_COLOURS[cat] || '#64748b') + '"></span>\
      <span>' + cat + '</span>\
      <span class="chip-amount">' + formatCurrency(total) + '</span>\
    </div>';
  }).join('');
}

function renderFilterChips() {
  var categories = [...new Set(expenses.map(function (e) { return e.category; }))];
  var allActive = activeFilter === null ? 'active' : '';

  filterChips.innerHTML = '<button class="filter-chip ' + allActive + '" data-filter="all">All</button>';

  categories.forEach(function (cat) {
    var active = activeFilter === cat ? 'active' : '';
    filterChips.innerHTML += '<button class="filter-chip ' + active + '" data-filter="' + cat + '">' + cat + '</button>';
  });

  filterChips.querySelectorAll('.filter-chip').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var val = this.getAttribute('data-filter');
      activeFilter = val === 'all' ? null : val;
      renderFilterChips();
      renderExpensesList();
    });
  });
}

function renderExpensesList() {
  var list = getFilteredExpenses();

  if (list.length === 0) {
    expenseList.innerHTML = '<p class="empty-msg">' + (expenses.length === 0 ? 'No expenses yet. Start tracking today.' : 'No expenses match your search or filter.') + '</p>';
    return;
  }

  expenseList.innerHTML = '';

  list.forEach(function (expense) {
    var actualIndex = expenses.indexOf(expense);
    var item = document.createElement('div');
    item.className = 'expense-item';

    item.innerHTML = '\
      <div class="expense-left">\
        <div class="expense-top">\
          <span class="expense-name">' + escapeHtml(expense.name) + '</span>\
        </div>\
        <div class="expense-bottom">\
          <span class="expense-category-badge">\
            <span class="chip-dot" style="display:inline-block;width:6px;height:6px;border-radius:50%;background:' + (CATEGORY_COLOURS[expense.category] || '#64748b') + ';flex-shrink:0;"></span>\
            ' + expense.category + '\
          </span>\
          <span class="expense-date">' + formatDate(expense.date) + '</span>\
        </div>\
      </div>\
      <div class="expense-right">\
        <span class="expense-amount">' + formatCurrency(expense.amount) + '</span>\
        <button class="edit-btn" data-index="' + actualIndex + '" title="Edit">\u270E</button>\
        <button class="delete-btn" data-index="' + actualIndex + '" title="Remove">\u2715</button>\
      </div>';

    expenseList.appendChild(item);
  });

  expenseList.querySelectorAll('.edit-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var idx = parseInt(this.getAttribute('data-index'));
      openEditModal(idx);
    });
  });

  expenseList.querySelectorAll('.delete-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var idx = parseInt(this.getAttribute('data-index'));
      removeExpense(idx);
    });
  });
}

function escapeHtml(text) {
  var div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function addExpense(name, amount, category) {
  expenses.push({
    name: name,
    amount: amount,
    category: category,
    date: new Date().toISOString()
  });
  saveAndRefresh();
}

function removeExpense(index) {
  if (confirm('Remove "' + expenses[index].name + '" from your list?')) {
    expenses.splice(index, 1);
    saveAndRefresh();
  }
}

function openEditModal(index) {
  var expense = expenses[index];
  editingIndex = index;
  editName.value = expense.name;
  editAmount.value = expense.amount;
  editCategory.value = expense.category;
  editModal.classList.add('open');
  editName.focus();
}

function closeEditModal() {
  editModal.classList.remove('open');
  editingIndex = null;
}

function saveAndRefresh() {
  saveExpenses();
  renderPeriodView();
  renderExpensesList();
  updateTotal();
  updateCount();
  renderCategoryBreakdown();
  renderFilterChips();
}

form.addEventListener('submit', function (e) {
  e.preventDefault();

  var name = nameInput.value.trim();
  var amount = parseFloat(amountInput.value);
  var category = categorySelect.value;

  if (!name) {
    alert('Please enter an expense name.');
    nameInput.focus();
    return;
  }

  if (isNaN(amount) || amount <= 0) {
    alert('Please enter a valid amount.');
    amountInput.focus();
    return;
  }

  addExpense(name, amount, category);

  nameInput.value = '';
  amountInput.value = '';
  categorySelect.selectedIndex = 0;
  nameInput.focus();
});

editForm.addEventListener('submit', function (e) {
  e.preventDefault();

  var name = editName.value.trim();
  var amount = parseFloat(editAmount.value);
  var category = editCategory.value;

  if (!name) {
    alert('Please enter an expense name.');
    editName.focus();
    return;
  }

  if (isNaN(amount) || amount <= 0) {
    alert('Please enter a valid amount.');
    editAmount.focus();
    return;
  }

  if (editingIndex !== null) {
    expenses[editingIndex].name = name;
    expenses[editingIndex].amount = amount;
    expenses[editingIndex].category = category;
    saveAndRefresh();
  }

  closeEditModal();
});

cancelEdit.addEventListener('click', closeEditModal);

editModal.addEventListener('click', function (e) {
  if (e.target === editModal) {
    closeEditModal();
  }
});

document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') {
    closeEditModal();
  }
});

searchInput.addEventListener('input', function () {
  renderExpensesList();
});

sortSelect.addEventListener('change', function () {
  renderExpensesList();
});

exportBtn.addEventListener('click', function () {
  if (expenses.length === 0) {
    alert('No expenses to export.');
    return;
  }

  var headers = ['Name', 'Amount (₦)', 'Category', 'Date'];
  var rows = expenses.map(function (e) {
    return [
      '"' + e.name.replace(/"/g, '""') + '"',
      e.amount,
      '"' + e.category.replace(/"/g, '""') + '"',
      '"' + new Date(e.date).toLocaleString('en-GB') + '"'
    ];
  });

  var csv = [headers.join(','), ...rows.map(function (r) { return r.join(','); })].join('\n');
  var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  var link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'kala_expenses_' + new Date().toISOString().slice(0, 10) + '.csv';
  link.click();
  URL.revokeObjectURL(link.href);
});

periodPrev.addEventListener('click', function () {
  const d = new Date(activeDate);
  switch (activePeriod) {
    case 'week': d.setDate(d.getDate() - 7); break;
    case 'month': d.setMonth(d.getMonth() - 1); break;
    case 'quarter': d.setMonth(d.getMonth() - 3); break;
    case 'year': d.setFullYear(d.getFullYear() - 1); break;
  }
  activeDate = d;
  saveAndRefresh();
});

periodNext.addEventListener('click', function () {
  const d = new Date(activeDate);
  switch (activePeriod) {
    case 'week': d.setDate(d.getDate() + 7); break;
    case 'month': d.setMonth(d.getMonth() + 1); break;
    case 'quarter': d.setMonth(d.getMonth() + 3); break;
    case 'year': d.setFullYear(d.getFullYear() + 1); break;
  }
  activeDate = d;
  saveAndRefresh();
});

periodToday.addEventListener('click', function () {
  activeDate = new Date();
  saveAndRefresh();
});

periodTabs.addEventListener('click', function (e) {
  const tab = e.target.closest('.period-tab');
  if (!tab) return;
  const period = tab.getAttribute('data-period');
  activePeriod = period;
  activeDate = new Date();
  if (period === 'custom') {
    const today = new Date();
    customStart = today.toISOString().slice(0, 10);
    customEnd = today.toISOString().slice(0, 10);
    periodStart.value = customStart;
    periodEnd.value = customEnd;
  }
  saveAndRefresh();
});

periodStart.addEventListener('change', function () {
  customStart = this.value;
  saveAndRefresh();
});

periodEnd.addEventListener('change', function () {
  customEnd = this.value;
  saveAndRefresh();
});

loadExpenses();
saveAndRefresh();
