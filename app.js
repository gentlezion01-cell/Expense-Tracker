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

let expenses = [];
let editingIndex = null;
let activeFilter = null;

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

function getFilteredExpenses() {
  let filtered = [...expenses];

  const query = searchInput.value.trim().toLowerCase();
  if (query) {
    filtered = filtered.filter(e => e.name.toLowerCase().includes(query));
  }

  if (activeFilter) {
    filtered = filtered.filter(e => e.category === activeFilter);
  }

  const sort = sortSelect.value;
  filtered.sort((a, b) => {
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
  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  totalAmount.textContent = formatCurrency(total);
}

function updateCount() {
  expenseCount.textContent = expenses.length;
}

function renderCategoryBreakdown() {
  const map = {};
  expenses.forEach(e => {
    map[e.category] = (map[e.category] || 0) + Number(e.amount);
  });

  const entries = Object.entries(map).sort((a, b) => b[1] - a[1]);

  if (entries.length === 0) {
    categoryBreakdown.innerHTML = '';
    return;
  }

  categoryBreakdown.innerHTML = entries.map(([cat, total]) => `
    <div class="category-chip">
      <span class="chip-dot" style="background:${CATEGORY_COLOURS[cat] || '#64748b'}"></span>
      <span>${cat}</span>
      <span class="chip-amount">${formatCurrency(total)}</span>
    </div>
  `).join('');
}

function renderFilterChips() {
  const categories = [...new Set(expenses.map(e => e.category))];
  const allActive = activeFilter === null ? 'active' : '';

  filterChips.innerHTML = `<button class="filter-chip ${allActive}" data-filter="all">All</button>`;

  categories.forEach(cat => {
    const active = activeFilter === cat ? 'active' : '';
    filterChips.innerHTML += `<button class="filter-chip ${active}" data-filter="${cat}">${cat}</button>`;
  });

  filterChips.querySelectorAll('.filter-chip').forEach(btn => {
    btn.addEventListener('click', function () {
      const val = this.getAttribute('data-filter');
      activeFilter = val === 'all' ? null : val;
      renderFilterChips();
      renderExpenses();
    });
  });
}

function renderExpenses() {
  const filtered = getFilteredExpenses();

  if (filtered.length === 0) {
    expenseList.innerHTML = '<p class="empty-msg">' + (expenses.length === 0 ? 'No expenses yet. Start tracking today.' : 'No expenses match your search or filter.') + '</p>';
    return;
  }

  expenseList.innerHTML = '';

  filtered.forEach((expense, displayIndex) => {
    const actualIndex = expenses.indexOf(expense);
    const item = document.createElement('div');
    item.className = 'expense-item';

    item.innerHTML = `
      <div class="expense-left">
        <div class="expense-top">
          <span class="expense-name">${escapeHtml(expense.name)}</span>
        </div>
        <div class="expense-bottom">
          <span class="expense-category-badge">
            <span class="chip-dot" style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${CATEGORY_COLOURS[expense.category] || '#64748b'};flex-shrink:0;"></span>
            ${expense.category}
          </span>
          <span class="expense-date">${formatDate(expense.date)}</span>
        </div>
      </div>
      <div class="expense-right">
        <span class="expense-amount">${formatCurrency(expense.amount)}</span>
        <button class="edit-btn" data-index="${actualIndex}" title="Edit">✎</button>
        <button class="delete-btn" data-index="${actualIndex}" title="Remove">✕</button>
      </div>
    `;

    expenseList.appendChild(item);
  });

  expenseList.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      const idx = parseInt(this.getAttribute('data-index'));
      openEditModal(idx);
    });
  });

  expenseList.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      const idx = parseInt(this.getAttribute('data-index'));
      removeExpense(idx);
    });
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function addExpense(name, amount, category) {
  expenses.push({
    name,
    amount,
    category,
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
  const expense = expenses[index];
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
  renderExpenses();
  updateTotal();
  updateCount();
  renderCategoryBreakdown();
  renderFilterChips();
}

form.addEventListener('submit', function (e) {
  e.preventDefault();

  const name = nameInput.value.trim();
  const amount = parseFloat(amountInput.value);
  const category = categorySelect.value;

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

  const name = editName.value.trim();
  const amount = parseFloat(editAmount.value);
  const category = editCategory.value;

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
  renderExpenses();
});

sortSelect.addEventListener('change', function () {
  renderExpenses();
});

exportBtn.addEventListener('click', function () {
  if (expenses.length === 0) {
    alert('No expenses to export.');
    return;
  }

  const headers = ['Name', 'Amount (₦)', 'Category', 'Date'];
  const rows = expenses.map(e => [
    '"' + e.name.replace(/"/g, '""') + '"',
    e.amount,
    '"' + e.category.replace(/"/g, '""') + '"',
    '"' + new Date(e.date).toLocaleString('en-GB') + '"'
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'kala_expenses_' + new Date().toISOString().slice(0, 10) + '.csv';
  link.click();
  URL.revokeObjectURL(link.href);
});

loadExpenses();
saveAndRefresh();
