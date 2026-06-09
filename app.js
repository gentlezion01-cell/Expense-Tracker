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
const monthPrev = document.getElementById('month-prev');
const monthNext = document.getElementById('month-next');
const monthToday = document.getElementById('month-today');
const monthName = document.getElementById('month-name');
const monthYear = document.getElementById('month-year');
const monthTotalAmount = document.getElementById('month-total-amount');
const monthBadge = document.getElementById('month-badge');

let expenses = [];
let editingIndex = null;
let activeFilter = null;
let activeMonth = null;
let activeYear = null;

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

function getMonthTotal(month, year) {
  const m = String(month + 1).padStart(2, '0');
  const prefix = year + '-' + m;
  return expenses
    .filter(function (e) { return e.date.slice(0, 7) === prefix; })
    .reduce(function (sum, e) { return sum + Number(e.amount); }, 0);
}

function getMonthExpenses(month, year) {
  const m = String(month + 1).padStart(2, '0');
  const prefix = year + '-' + m;
  return expenses.filter(function (e) {
    return e.date.slice(0, 7) === prefix;
  });
}

function renderMonthView() {
  const now = new Date();
  const displayMonth = activeMonth !== null ? activeMonth : now.getMonth();
  const displayYear = activeYear !== null ? activeYear : now.getFullYear();

  monthName.textContent = MONTHS[displayMonth];
  monthYear.textContent = displayYear;

  const total = getMonthTotal(displayMonth, displayYear);

  if (activeMonth === null) {
    monthBadge.textContent = 'all months';
    monthTotalAmount.textContent = formatCurrency(
      expenses.reduce(function (sum, e) { return sum + Number(e.amount); }, 0)
    );
    monthToday.classList.remove('active');
  } else {
    const m = String(displayMonth + 1).padStart(2, '0');
    monthBadge.textContent = displayYear + '-' + m;
    monthTotalAmount.textContent = formatCurrency(total);
    monthToday.classList.add('active');
  }
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

  if (activeMonth !== null && activeYear !== null) {
    filtered = getMonthExpenses(activeMonth, activeYear).filter(function (e) {
      return filtered.indexOf(e) !== -1;
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
  renderMonthView();
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

monthPrev.addEventListener('click', function () {
  var now = new Date();
  var m = activeMonth !== null ? activeMonth : now.getMonth();
  var y = activeYear !== null ? activeYear : now.getFullYear();
  m--;
  if (m < 0) {
    m = 11;
    y--;
  }
  activeMonth = m;
  activeYear = y;
  saveAndRefresh();
});

monthNext.addEventListener('click', function () {
  var now = new Date();
  var m = activeMonth !== null ? activeMonth : now.getMonth();
  var y = activeYear !== null ? activeYear : now.getFullYear();
  m++;
  if (m > 11) {
    m = 0;
    y++;
  }
  activeMonth = m;
  activeYear = y;
  saveAndRefresh();
});

monthToday.addEventListener('click', function () {
  activeMonth = null;
  activeYear = null;
  saveAndRefresh();
});

loadExpenses();
saveAndRefresh();
