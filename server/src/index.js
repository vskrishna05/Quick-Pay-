import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { getDbMode, initDb, pool } from './db.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

const allowedOrigins = new Set([
  process.env.CLIENT_URL || 'http://localhost:5173',
  'http://localhost:5173',
  'http://127.0.0.1:5173'
]);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked origin: ${origin}`));
  }
}));
app.use(express.json());

const asyncHandler = (handler) => async (req, res, next) => {
  try {
    await handler(req, res, next);
  } catch (error) {
    next(error);
  }
};

function validUpiId(upiId) {
  return /^[a-zA-Z0-9._-]{3,}@[a-zA-Z]{2,}$/.test(upiId);
}

async function createNotification(userId, title, message, type = 'Info') {
  await pool.query(
    'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
    [userId, title, message, type]
  );
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'UPI Banking API', database: getDbMode() });
});

app.get('/api/users', asyncHandler(async (req, res) => {
  const [rows] = await pool.query('SELECT id, full_name, mobile, upi_id, is_verified, created_at FROM users ORDER BY id DESC');
  res.json(rows);
}));

app.post('/api/users', asyncHandler(async (req, res) => {
  const { fullName, mobile, upiId, mpin } = req.body;

  if (!fullName || !mobile || !upiId || !mpin) {
    return res.status(400).json({ message: 'Full name, mobile, UPI ID, and MPIN are required.' });
  }
  if (!/^\d{10}$/.test(mobile)) {
    return res.status(400).json({ message: 'Enter a valid 10 digit mobile number.' });
  }
  if (!validUpiId(upiId)) {
    return res.status(400).json({ message: 'UPI ID must look like name@upi.' });
  }
  if (!/^\d{4,6}$/.test(mpin)) {
    return res.status(400).json({ message: 'MPIN must be 4 to 6 digits.' });
  }

  const [result] = await pool.query(
    'INSERT INTO users (full_name, mobile, upi_id, mpin) VALUES (?, ?, ?, ?)',
    [fullName, mobile, upiId, mpin]
  );

  await createNotification(result.insertId, 'Registration completed', `${upiId} is ready for UPI banking.`, 'Success');
  const [rows] = await pool.query('SELECT id, full_name, mobile, upi_id, is_verified, created_at FROM users WHERE id = ?', [result.insertId]);
  res.status(201).json(rows[0]);
}));

app.get('/api/accounts', asyncHandler(async (req, res) => {
  const [rows] = await pool.query(`
    SELECT accounts.*, users.full_name, users.upi_id
    FROM accounts
    JOIN users ON users.id = accounts.user_id
    ORDER BY accounts.id DESC
  `);
  res.json(rows);
}));

app.post('/api/accounts', asyncHandler(async (req, res) => {
  const { userId, bankName, accountNumber, ifsc, accountType, isPrimary } = req.body;
  if (!userId || !bankName || !accountNumber || !ifsc) {
    return res.status(400).json({ message: 'User, bank name, account number, and IFSC are required.' });
  }

  const [result] = await pool.query(
    'INSERT INTO accounts (user_id, bank_name, account_number, ifsc, account_type, is_primary) VALUES (?, ?, ?, ?, ?, ?)',
    [userId, bankName, accountNumber, ifsc.toUpperCase(), accountType || 'Savings', Boolean(isPrimary)]
  );
  await createNotification(userId, 'Bank account linked', `${bankName} account has been linked.`, 'Success');
  res.status(201).json({ id: result.insertId, userId, bankName, accountNumber, ifsc: ifsc.toUpperCase(), accountType: accountType || 'Savings', isPrimary: Boolean(isPrimary) });
}));

app.get('/api/limits', asyncHandler(async (req, res) => {
  const [rows] = await pool.query(`
    SELECT transaction_limits.*, users.full_name, users.upi_id
    FROM transaction_limits
    JOIN users ON users.id = transaction_limits.user_id
    ORDER BY transaction_limits.updated_at DESC
  `);
  res.json(rows);
}));

app.post('/api/limits', asyncHandler(async (req, res) => {
  const { userId, dailyLimit, perTransactionLimit } = req.body;
  if (!userId || Number(dailyLimit) <= 0 || Number(perTransactionLimit) <= 0) {
    return res.status(400).json({ message: 'User and positive limit amounts are required.' });
  }
  if (Number(perTransactionLimit) > Number(dailyLimit)) {
    return res.status(400).json({ message: 'Per transaction limit cannot exceed daily limit.' });
  }

  await pool.query(
    `INSERT INTO transaction_limits (user_id, daily_limit, per_transaction_limit)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE daily_limit = VALUES(daily_limit), per_transaction_limit = VALUES(per_transaction_limit)`,
    [userId, dailyLimit, perTransactionLimit]
  );
  await createNotification(userId, 'Transaction limits updated', `Daily limit set to Rs. ${dailyLimit}.`, 'Security');
  res.status(201).json({ userId, dailyLimit, perTransactionLimit });
}));

app.get('/api/mandates', asyncHandler(async (req, res) => {
  const [rows] = await pool.query(`
    SELECT mandates.*, users.full_name, users.upi_id
    FROM mandates
    JOIN users ON users.id = mandates.user_id
    ORDER BY mandates.id DESC
  `);
  res.json(rows);
}));

app.post('/api/mandates', asyncHandler(async (req, res) => {
  const { userId, payeeName, amount, frequency, nextPaymentDate } = req.body;
  if (!userId || !payeeName || Number(amount) <= 0 || !frequency || !nextPaymentDate) {
    return res.status(400).json({ message: 'All mandate fields are required.' });
  }
  const [result] = await pool.query(
    'INSERT INTO mandates (user_id, payee_name, amount, frequency, next_payment_date) VALUES (?, ?, ?, ?, ?)',
    [userId, payeeName, amount, frequency, nextPaymentDate]
  );
  await createNotification(userId, 'Mandate created', `${frequency} mandate for ${payeeName} is active.`, 'Info');
  res.status(201).json({ id: result.insertId, userId, payeeName, amount, frequency, nextPaymentDate, status: 'Active' });
}));

app.patch('/api/mandates/:id/status', asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!['Active', 'Paused', 'Cancelled'].includes(status)) {
    return res.status(400).json({ message: 'Status must be Active, Paused, or Cancelled.' });
  }
  await pool.query('UPDATE mandates SET status = ? WHERE id = ?', [status, req.params.id]);
  res.json({ id: Number(req.params.id), status });
}));

app.get('/api/transactions', asyncHandler(async (req, res) => {
  const [rows] = await pool.query(`
    SELECT transactions.*, users.full_name, users.upi_id
    FROM transactions
    JOIN users ON users.id = transactions.user_id
    ORDER BY transactions.created_at DESC
  `);
  res.json(rows);
}));

app.post('/api/transactions', asyncHandler(async (req, res) => {
  const { userId, receiverUpi, amount, note } = req.body;
  if (!userId || !validUpiId(receiverUpi || '') || Number(amount) <= 0) {
    return res.status(400).json({ message: 'User, valid receiver UPI ID, and positive amount are required.' });
  }
  const [result] = await pool.query(
    'INSERT INTO transactions (user_id, receiver_upi, amount, note) VALUES (?, ?, ?, ?)',
    [userId, receiverUpi, amount, note || 'UPI payment']
  );
  await createNotification(userId, 'Payment successful', `Rs. ${amount} sent to ${receiverUpi}.`, 'Success');
  res.status(201).json({ id: result.insertId, userId, receiverUpi, amount, status: 'Success', note: note || 'UPI payment' });
}));

app.get('/api/notifications', asyncHandler(async (req, res) => {
  const [rows] = await pool.query(`
    SELECT notifications.*, users.full_name
    FROM notifications
    LEFT JOIN users ON users.id = notifications.user_id
    ORDER BY notifications.created_at DESC
  `);
  res.json(rows);
}));

app.get('/api/admin', asyncHandler(async (req, res) => {
  const [[users]] = await pool.query('SELECT COUNT(*) AS totalUsers FROM users');
  const [[accounts]] = await pool.query('SELECT COUNT(*) AS linkedAccounts FROM accounts');
  const [[transactions]] = await pool.query('SELECT COUNT(*) AS totalTransactions, COALESCE(SUM(amount), 0) AS totalVolume FROM transactions');
  const [[mandates]] = await pool.query('SELECT COUNT(*) AS activeMandates FROM mandates WHERE status = "Active"');
  res.json({
    totalUsers: users.totalUsers,
    linkedAccounts: accounts.linkedAccounts,
    totalTransactions: transactions.totalTransactions,
    totalVolume: transactions.totalVolume,
    activeMandates: mandates.activeMandates
  });
}));

app.get('/api/export', asyncHandler(async (req, res) => {
  const [rows] = await pool.query(`
    SELECT transactions.id, users.full_name, users.upi_id, transactions.receiver_upi,
           transactions.amount, transactions.status, transactions.note, transactions.created_at
    FROM transactions
    JOIN users ON users.id = transactions.user_id
    ORDER BY transactions.created_at DESC
  `);

  const header = ['ID', 'User', 'Sender UPI', 'Receiver UPI', 'Amount', 'Status', 'Note', 'Created At'];
  const lines = rows.map((row) => [
    row.id,
    row.full_name,
    row.upi_id,
    row.receiver_upi,
    row.amount,
    row.status,
    row.note,
    row.created_at
  ].map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(','));

  res.header('Content-Type', 'text/csv');
  res.attachment('upi-transactions.csv');
  res.send([header.join(','), ...lines].join('\n'));
}));

app.post('/api/seed', asyncHandler(async (req, res) => {
  const [existing] = await pool.query('SELECT id FROM users LIMIT 1');
  if (existing.length) {
    return res.json({ message: 'Demo data already exists.' });
  }

  const [userResult] = await pool.query(
    'INSERT INTO users (full_name, mobile, upi_id, mpin) VALUES (?, ?, ?, ?)',
    ['Venkata Sai Krishna', '9876543210', 'saikrishna@upi', '1234']
  );
  const userId = userResult.insertId;
  await pool.query('INSERT INTO accounts (user_id, bank_name, account_number, ifsc, account_type, is_primary) VALUES (?, ?, ?, ?, ?, ?)', [userId, 'State Bank of India', '123456789012', 'SBIN0001234', 'Savings', true]);
  await pool.query('INSERT INTO transaction_limits (user_id, daily_limit, per_transaction_limit) VALUES (?, ?, ?)', [userId, 100000, 25000]);
  await pool.query('INSERT INTO mandates (user_id, payee_name, amount, frequency, next_payment_date) VALUES (?, ?, ?, ?, ?)', [userId, 'Netflix India', 649, 'Monthly', '2026-06-01']);
  await pool.query('INSERT INTO transactions (user_id, receiver_upi, amount, note) VALUES (?, ?, ?, ?)', [userId, 'merchant@upi', 999, 'Demo transaction']);
  await createNotification(userId, 'Welcome', 'Demo account seeded successfully.', 'Info');
  res.status(201).json({ message: 'Demo data created.', userId });
}));

app.use((error, req, res, next) => {
  if (error?.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ message: 'Duplicate mobile number or UPI ID already exists.' });
  }
  console.error(error);
  res.status(500).json({ message: 'Server error. Check backend console and MySQL connection.' });
});

initDb()
  .then(() => {
    app.listen(port, () => {
      console.log(`UPI Banking API running on http://localhost:${port}`);
      console.log(`Database mode: ${getDbMode()}`);
    });
  })
  .catch((error) => {
    console.error('Failed to start server. Check MySQL database and .env settings.');
    console.error(error);
    process.exit(1);
  });
