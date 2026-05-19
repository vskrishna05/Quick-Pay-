const now = () => new Date().toISOString();

const state = {
  users: [],
  accounts: [],
  transaction_limits: [],
  mandates: [],
  transactions: [],
  notifications: []
};

const ids = {
  users: 1,
  accounts: 1,
  transaction_limits: 1,
  mandates: 1,
  transactions: 1,
  notifications: 1
};

function publicUser(user) {
  return {
    id: user.id,
    full_name: user.full_name,
    mobile: user.mobile,
    upi_id: user.upi_id,
    is_verified: user.is_verified,
    created_at: user.created_at
  };
}

function insert(table, row) {
  const next = { id: ids[table]++, ...row };
  state[table].push(next);
  return next;
}

function userFor(id) {
  return state.users.find((user) => Number(user.id) === Number(id));
}

function joinUser(rows) {
  return rows.map((row) => {
    const user = userFor(row.user_id) || {};
    return { ...row, full_name: user.full_name, upi_id: user.upi_id };
  });
}

export const memoryPool = {
  async query(sql, params = []) {
    const normalized = sql.replace(/\s+/g, ' ').trim();

    if (normalized.startsWith('CREATE TABLE')) return [[], undefined];

    if (normalized.startsWith('INSERT INTO notifications')) {
      const [user_id, title, message, type] = params;
      const item = insert('notifications', { user_id, title, message, type, is_read: false, created_at: now() });
      return [{ insertId: item.id }, undefined];
    }

    if (normalized === 'SELECT id, full_name, mobile, upi_id, is_verified, created_at FROM users ORDER BY id DESC') {
      return [[...state.users].reverse().map(publicUser), undefined];
    }

    if (normalized.startsWith('INSERT INTO users')) {
      const [full_name, mobile, upi_id, mpin] = params;
      if (state.users.some((user) => user.mobile === mobile || user.upi_id === upi_id)) {
        const error = new Error('Duplicate mobile or UPI ID');
        error.code = 'ER_DUP_ENTRY';
        throw error;
      }
      const item = insert('users', { full_name, mobile, upi_id, mpin, is_verified: true, created_at: now() });
      return [{ insertId: item.id }, undefined];
    }

    if (normalized.startsWith('SELECT id, full_name, mobile, upi_id, is_verified, created_at FROM users WHERE id =')) {
      return [[publicUser(userFor(params[0]))].filter(Boolean), undefined];
    }

    if (normalized === 'SELECT COUNT(*) AS linkedAccounts FROM accounts') {
      return [[{ linkedAccounts: state.accounts.length }], undefined];
    }

    if (normalized.includes('FROM accounts')) {
      return [joinUser([...state.accounts].reverse()), undefined];
    }

    if (normalized.startsWith('INSERT INTO accounts')) {
      const [user_id, bank_name, account_number, ifsc, account_type, is_primary] = params;
      const item = insert('accounts', { user_id, bank_name, account_number, ifsc, account_type, is_primary, created_at: now() });
      return [{ insertId: item.id }, undefined];
    }

    if (normalized.includes('FROM transaction_limits')) {
      return [joinUser([...state.transaction_limits].reverse()), undefined];
    }

    if (normalized.startsWith('INSERT INTO transaction_limits')) {
      const [user_id, daily_limit, per_transaction_limit] = params;
      const existing = state.transaction_limits.find((item) => Number(item.user_id) === Number(user_id));
      if (existing) {
        existing.daily_limit = daily_limit;
        existing.per_transaction_limit = per_transaction_limit;
        existing.updated_at = now();
      } else {
        insert('transaction_limits', { user_id, daily_limit, per_transaction_limit, updated_at: now() });
      }
      return [{ insertId: existing?.id || ids.transaction_limits - 1 }, undefined];
    }

    if (normalized === 'SELECT COUNT(*) AS activeMandates FROM mandates WHERE status = "Active"') {
      return [[{ activeMandates: state.mandates.filter((item) => item.status === 'Active').length }], undefined];
    }

    if (normalized.includes('FROM mandates')) {
      return [joinUser([...state.mandates].reverse()), undefined];
    }

    if (normalized.startsWith('INSERT INTO mandates')) {
      const [user_id, payee_name, amount, frequency, next_payment_date] = params;
      const item = insert('mandates', { user_id, payee_name, amount, frequency, next_payment_date, status: 'Active', created_at: now() });
      return [{ insertId: item.id }, undefined];
    }

    if (normalized.startsWith('UPDATE mandates SET status')) {
      const [status, id] = params;
      const item = state.mandates.find((mandate) => Number(mandate.id) === Number(id));
      if (item) item.status = status;
      return [{ affectedRows: item ? 1 : 0 }, undefined];
    }

    if (normalized === 'SELECT COUNT(*) AS totalTransactions, COALESCE(SUM(amount), 0) AS totalVolume FROM transactions') {
      const totalVolume = state.transactions.reduce((sum, item) => sum + Number(item.amount), 0);
      return [[{ totalTransactions: state.transactions.length, totalVolume }], undefined];
    }

    if (normalized.includes('FROM transactions JOIN users') && !normalized.includes('SELECT transactions.id')) {
      return [joinUser([...state.transactions].reverse()), undefined];
    }

    if (normalized.startsWith('INSERT INTO transactions')) {
      const [user_id, receiver_upi, amount, note] = params;
      const item = insert('transactions', { user_id, receiver_upi, amount, status: 'Success', note, created_at: now() });
      return [{ insertId: item.id }, undefined];
    }

    if (normalized.includes('FROM notifications')) {
      const rows = [...state.notifications].reverse().map((item) => ({
        ...item,
        full_name: userFor(item.user_id)?.full_name
      }));
      return [rows, undefined];
    }

    if (normalized === 'SELECT COUNT(*) AS totalUsers FROM users') {
      return [[{ totalUsers: state.users.length }], undefined];
    }

    if (normalized.includes('SELECT transactions.id, users.full_name')) {
      return [joinUser([...state.transactions].reverse()), undefined];
    }

    if (normalized === 'SELECT id FROM users LIMIT 1') {
      return [state.users.slice(0, 1).map((user) => ({ id: user.id })), undefined];
    }

    throw new Error(`Memory database does not support query: ${normalized}`);
  }
};
