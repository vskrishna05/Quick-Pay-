import React, { useEffect, useMemo, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { BrowserRouter, Navigate, NavLink, Route, Routes } from 'react-router-dom';
import {
  ArrowRight,
  Bell,
  CircleDollarSign,
  CreditCard,
  Download,
  Landmark,
  LayoutDashboard,
  ListChecks,
  QrCode,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Smartphone,
  WalletCards
} from 'lucide-react';
import { api } from './api.js';

const initialForms = {
  user: { fullName: '', mobile: '', upiId: '', mpin: '' },
  account: { userId: '', bankName: '', accountNumber: '', ifsc: '', accountType: 'Savings', isPrimary: true },
  limits: { userId: '', dailyLimit: '100000', perTransactionLimit: '25000' },
  mandate: { userId: '', payeeName: '', amount: '', frequency: 'Monthly', nextPaymentDate: '' },
  transaction: { userId: '', receiverUpi: '', amount: '', note: '' }
};

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="stat-card">
      <div className="stat-icon"><Icon size={20} /></div>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, text, accent }) {
  return (
    <div className={`feature-card ${accent}`}>
      <div className="feature-icon"><Icon size={20} /></div>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

function FormSelect({ label, value, onChange, users }) {
  return (
    <label className="form-label">
      {label}
      <select className="form-select" value={value} onChange={(event) => onChange(event.target.value)} required>
        <option value="">Select user</option>
        {users.map((user) => (
          <option value={user.id} key={user.id}>{user.full_name} - {user.upi_id}</option>
        ))}
      </select>
    </label>
  );
}

function App() {
  const [data, setData] = useState({
    users: [],
    accounts: [],
    limits: [],
    mandates: [],
    transactions: [],
    notifications: [],
    admin: {}
  });
  const [forms, setForms] = useState(initialForms);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const selectedUser = useMemo(() => {
    return data.users.find((user) => String(user.id) === String(forms.transaction.userId || forms.account.userId || forms.limits.userId || forms.mandate.userId)) || data.users[0];
  }, [data.users, forms]);

  async function loadData() {
    setLoading(true);
    try {
      const [users, accounts, limits, mandates, transactions, notifications, admin] = await Promise.all([
        api.get('/users'),
        api.get('/accounts'),
        api.get('/limits'),
        api.get('/mandates'),
        api.get('/transactions'),
        api.get('/notifications'),
        api.get('/admin')
      ]);
      setData({
        users: users.data,
        accounts: accounts.data,
        limits: limits.data,
        mandates: mandates.data,
        transactions: transactions.data,
        notifications: notifications.data,
        admin: admin.data
      });
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to connect to backend. Start server and MySQL.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function updateForm(section, key, value) {
    setForms((current) => ({
      ...current,
      [section]: { ...current[section], [key]: value }
    }));
  }

  async function submit(section, endpoint, payload) {
    setMessage('');
    try {
      await api.post(endpoint, payload);
      setForms((current) => ({ ...current, [section]: initialForms[section] }));
      setMessage('Saved successfully.');
      await loadData();
    } catch (error) {
      setMessage(error.response?.data?.message || error.message || 'Request failed.');
    }
  }

  async function seedDemo() {
    setMessage('');
    try {
      const response = await api.post('/seed');
      setMessage(response.data.message);
      await loadData();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to seed data.');
    }
  }

  function downloadCsv() {
    window.location.href = `${api.defaults.baseURL}/export`;
  }

  const qrValue = selectedUser ? `upi://pay?pa=${selectedUser.upi_id}&pn=${encodeURIComponent(selectedUser.full_name)}&cu=INR` : 'upi://pay?pa=demo@upi&pn=Demo&cu=INR';

  const overview = (
    <>
      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow"><Sparkles size={15} /> Digital payments control room</p>
          <h2>Register UPI users, connect bank accounts, and monitor payments in one live workspace.</h2>
          <p>
            A full-stack prototype for UPI onboarding, transaction limits, mandates,
            payment history, QR payments, notifications, exports, and admin monitoring.
          </p>
          <div className="hero-actions">
            <NavLink className="btn btn-dark" to="/registration">Start Registration <ArrowRight size={16} /></NavLink>
            <NavLink className="btn btn-light" to="/history">View Transactions</NavLink>
          </div>
        </div>
        <div className="hero-visual" aria-label="UPI payment dashboard preview">
          <div className="floating-card card-balance">
            <span>Daily limit</span>
            <strong>Rs. {data.limits[0]?.daily_limit ?? '100000'}</strong>
          </div>
          <div className="floating-card card-qr">
            <QRCodeCanvas value={qrValue} size={92} />
            <span>{selectedUser?.upi_id ?? 'demo@upi'}</span>
          </div>
          <div className="phone-frame">
            <div className="phone-top"><WalletCards size={18} /><span>UPI Wallet</span></div>
            <div className="payment-orb"><CircleDollarSign size={42} /></div>
            <div className="payment-row"><span>Receiver</span><strong>{data.transactions[0]?.receiver_upi ?? 'merchant@upi'}</strong></div>
            <div className="payment-row"><span>Status</span><strong>Success</strong></div>
            <div className="payment-row"><span>Amount</span><strong>Rs. {data.transactions[0]?.amount ?? '999.00'}</strong></div>
          </div>
        </div>
      </section>
      <div className="ticker" aria-label="Project module highlights">
        <span>UPI Registration</span>
        <span>Account Linking</span>
        <span>Transaction Limits</span>
        <span>Mandates</span>
        <span>QR Payments</span>
        <span>Notifications</span>
        <span>Admin Panel</span>
      </div>
      <section className="stats-grid">
        <StatCard icon={ShieldCheck} label="Users" value={data.admin.totalUsers ?? 0} />
        <StatCard icon={Landmark} label="Linked Accounts" value={data.admin.linkedAccounts ?? 0} />
        <StatCard icon={CreditCard} label="Transactions" value={data.admin.totalTransactions ?? 0} />
        <StatCard icon={ReceiptText} label="Active Mandates" value={data.admin.activeMandates ?? 0} />
      </section>
      <section className="feature-grid">
        <FeatureCard icon={ShieldCheck} title="Verified onboarding" text="Simulated OTP, MPIN setup, and UPI ID creation for project flow." accent="mint" />
        <FeatureCard icon={Landmark} title="Linked accounts" text="Attach bank account details and keep every user tied to their UPI profile." accent="sun" />
        <FeatureCard icon={ReceiptText} title="Mandate tracking" text="Create recurring payments with amount, frequency, next date, and status." accent="rose" />
      </section>
      <section className="panel">
        <div className="panel-title"><h2>Project Dashboard</h2><span>Summary for UPI banking modules.</span></div>
        <div className="table-wrap">
          <table className="table align-middle"><thead><tr><th>User</th><th>Mobile</th><th>UPI ID</th><th>Verified</th></tr></thead><tbody>{data.users.map((item) => <tr key={item.id}><td>{item.full_name}</td><td>{item.mobile}</td><td>{item.upi_id}</td><td>{item.is_verified ? 'Yes' : 'No'}</td></tr>)}</tbody></table>
        </div>
      </section>
    </>
  );

  const registration = (
    <section className="panel">
      <div className="panel-title">
        <h2>Registration & UPI ID</h2>
        <span>OTP verification is simulated for project demo.</span>
      </div>
      <form className="form-grid" onSubmit={(event) => {
        event.preventDefault();
        submit('user', '/users', forms.user);
      }}>
        <label className="form-label">Full name<input className="form-control" value={forms.user.fullName} onChange={(event) => updateForm('user', 'fullName', event.target.value)} required /></label>
        <label className="form-label">Mobile<input className="form-control" value={forms.user.mobile} onChange={(event) => updateForm('user', 'mobile', event.target.value)} placeholder="9876543210" required /></label>
        <label className="form-label">UPI ID<input className="form-control" value={forms.user.upiId} onChange={(event) => updateForm('user', 'upiId', event.target.value)} placeholder="name@upi" required /></label>
        <label className="form-label">MPIN<input className="form-control" type="password" value={forms.user.mpin} onChange={(event) => updateForm('user', 'mpin', event.target.value)} placeholder="4 to 6 digits" required /></label>
        <button className="btn btn-success" type="submit">Register User</button>
      </form>
    </section>
  );

  const accounts = (
    <section className="panel">
      <div className="panel-title"><h2>Link Bank Account</h2><span>Manage multiple bank accounts.</span></div>
      <form className="form-grid" onSubmit={(event) => {
        event.preventDefault();
        submit('account', '/accounts', forms.account);
      }}>
        <FormSelect label="User" users={data.users} value={forms.account.userId} onChange={(value) => updateForm('account', 'userId', value)} />
        <label className="form-label">Bank<input className="form-control" value={forms.account.bankName} onChange={(event) => updateForm('account', 'bankName', event.target.value)} required /></label>
        <label className="form-label">Account number<input className="form-control" value={forms.account.accountNumber} onChange={(event) => updateForm('account', 'accountNumber', event.target.value)} required /></label>
        <label className="form-label">IFSC<input className="form-control" value={forms.account.ifsc} onChange={(event) => updateForm('account', 'ifsc', event.target.value)} required /></label>
        <button className="btn btn-success" type="submit">Link Account</button>
      </form>
      <div className="table-wrap">
        <table className="table align-middle"><thead><tr><th>User</th><th>Bank</th><th>Account</th><th>IFSC</th></tr></thead><tbody>{data.accounts.map((item) => <tr key={item.id}><td>{item.full_name}</td><td>{item.bank_name}</td><td>{item.account_number}</td><td>{item.ifsc}</td></tr>)}</tbody></table>
      </div>
    </section>
  );

  const limits = (
    <section className="panel">
      <div className="panel-title"><h2>Transaction Limits</h2><span>Set daily and per-payment limits.</span></div>
      <form className="form-grid" onSubmit={(event) => {
        event.preventDefault();
        submit('limits', '/limits', forms.limits);
      }}>
        <FormSelect label="User" users={data.users} value={forms.limits.userId} onChange={(value) => updateForm('limits', 'userId', value)} />
        <label className="form-label">Daily limit<input className="form-control" type="number" value={forms.limits.dailyLimit} onChange={(event) => updateForm('limits', 'dailyLimit', event.target.value)} required /></label>
        <label className="form-label">Per transaction<input className="form-control" type="number" value={forms.limits.perTransactionLimit} onChange={(event) => updateForm('limits', 'perTransactionLimit', event.target.value)} required /></label>
        <button className="btn btn-success" type="submit">Save Limits</button>
      </form>
    </section>
  );

  const mandates = (
    <section className="panel">
      <div className="panel-title"><h2>Mandate Management</h2><span>Create recurring payment mandates.</span></div>
      <form className="form-grid" onSubmit={(event) => {
        event.preventDefault();
        submit('mandate', '/mandates', forms.mandate);
      }}>
        <FormSelect label="User" users={data.users} value={forms.mandate.userId} onChange={(value) => updateForm('mandate', 'userId', value)} />
        <label className="form-label">Payee<input className="form-control" value={forms.mandate.payeeName} onChange={(event) => updateForm('mandate', 'payeeName', event.target.value)} required /></label>
        <label className="form-label">Amount<input className="form-control" type="number" value={forms.mandate.amount} onChange={(event) => updateForm('mandate', 'amount', event.target.value)} required /></label>
        <label className="form-label">Next payment<input className="form-control" type="date" value={forms.mandate.nextPaymentDate} onChange={(event) => updateForm('mandate', 'nextPaymentDate', event.target.value)} required /></label>
        <button className="btn btn-success" type="submit">Create Mandate</button>
      </form>
      <div className="table-wrap">
        <table className="table align-middle"><thead><tr><th>User</th><th>Payee</th><th>Amount</th><th>Frequency</th><th>Status</th></tr></thead><tbody>{data.mandates.map((item) => <tr key={item.id}><td>{item.full_name}</td><td>{item.payee_name}</td><td>Rs. {item.amount}</td><td>{item.frequency}</td><td>{item.status}</td></tr>)}</tbody></table>
      </div>
    </section>
  );

  const history = (
    <section className="panel">
      <div className="panel-title">
        <h2>Transaction History</h2>
        <button className="btn btn-outline-primary" onClick={downloadCsv}><Download size={16} /> Export CSV</button>
      </div>
      <form className="form-grid" onSubmit={(event) => {
        event.preventDefault();
        submit('transaction', '/transactions', forms.transaction);
      }}>
        <FormSelect label="Sender" users={data.users} value={forms.transaction.userId} onChange={(value) => updateForm('transaction', 'userId', value)} />
        <label className="form-label">Receiver UPI<input className="form-control" value={forms.transaction.receiverUpi} onChange={(event) => updateForm('transaction', 'receiverUpi', event.target.value)} placeholder="merchant@upi" required /></label>
        <label className="form-label">Amount<input className="form-control" type="number" value={forms.transaction.amount} onChange={(event) => updateForm('transaction', 'amount', event.target.value)} required /></label>
        <label className="form-label">Note<input className="form-control" value={forms.transaction.note} onChange={(event) => updateForm('transaction', 'note', event.target.value)} /></label>
        <button className="btn btn-success" type="submit">Add Payment</button>
      </form>
      <div className="table-wrap">
        <table className="table align-middle"><thead><tr><th>User</th><th>Receiver</th><th>Amount</th><th>Status</th><th>Note</th></tr></thead><tbody>{data.transactions.map((item) => <tr key={item.id}><td>{item.full_name}</td><td>{item.receiver_upi}</td><td>Rs. {item.amount}</td><td><span className="badge text-bg-success">{item.status}</span></td><td>{item.note}</td></tr>)}</tbody></table>
      </div>
    </section>
  );

  const qr = (
    <section className="panel qr-panel">
      <div>
        <div className="panel-title"><h2>QR Code Display</h2><span>Scan-ready payment data for selected user.</span></div>
        <p className="qr-text">{selectedUser ? selectedUser.upi_id : 'Create or seed a user to show QR.'}</p>
      </div>
      <div className="qr-box"><QRCodeCanvas value={qrValue} size={180} /></div>
    </section>
  );

  const admin = (
    <section className="panel">
      <div className="panel-title"><h2>Notifications & Admin Panel</h2><span>Monitor activity and alerts.</span></div>
      <div className="notification-list">
        {data.notifications.map((item) => (
          <div className="notification" key={item.id}>
            <Bell size={18} />
            <div><strong>{item.title}</strong><p>{item.message}</p></div>
            <span>{item.type}</span>
          </div>
        ))}
      </div>
    </section>
  );

  return (
    <BrowserRouter>
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <Smartphone size={30} />
          <div>
            <strong>UPI Banking</strong>
            <span>Registration System</span>
          </div>
        </div>
        <nav>
          <NavLink to="/dashboard"><LayoutDashboard size={18} /> Dashboard</NavLink>
          <NavLink to="/registration"><ShieldCheck size={18} /> Registration</NavLink>
          <NavLink to="/accounts"><Landmark size={18} /> Accounts</NavLink>
          <NavLink to="/limits"><ListChecks size={18} /> Limits</NavLink>
          <NavLink to="/mandates"><ReceiptText size={18} /> Mandates</NavLink>
          <NavLink to="/history"><CreditCard size={18} /> History</NavLink>
          <NavLink to="/qr"><QrCode size={18} /> QR</NavLink>
          <NavLink to="/admin"><Bell size={18} /> Admin</NavLink>
        </nav>
      </aside>

      <main>
        <header className="topbar">
          <div>
            <p className="eyebrow">Problem 259</p>
            <h1>UPI & Mobile Banking Registration</h1>
          </div>
          <div className="actions">
            <button className="btn btn-outline-secondary" onClick={loadData} disabled={loading}>
              <RefreshCw size={16} /> Refresh
            </button>
            <button className="btn btn-primary" onClick={seedDemo}>Seed Demo</button>
          </div>
        </header>

        {message && <div className="alert alert-info">{message}</div>}

        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={overview} />
          <Route path="/registration" element={registration} />
          <Route path="/accounts" element={accounts} />
          <Route path="/limits" element={limits} />
          <Route path="/mandates" element={mandates} />
          <Route path="/history" element={history} />
          <Route path="/qr" element={qr} />
          <Route path="/admin" element={admin} />
        </Routes>
      </main>
    </div>
    </BrowserRouter>
  );
}

export default App;
