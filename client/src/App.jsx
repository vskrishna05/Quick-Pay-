import React, { useState } from 'react';
import { BrowserRouter, Navigate, NavLink, Route, Routes } from 'react-router-dom';
import {
  ArrowRight,
  BadgeIndianRupee,
  LockKeyhole,
  ShieldCheck,
  Smartphone,
  UserPlus,
  WalletCards
} from 'lucide-react';

function Home() {
  return (
    <section className="review-home">
      <div className="home-copy">
        <p className="eyebrow">Problem 259</p>
        <h1>UPI & Mobile Banking Registration</h1>
        <p>
          A clean review build focused on the first three required screens:
          home, login, and sign-up for a UPI banking onboarding flow.
        </p>
        <div className="hero-actions">
          <NavLink className="btn btn-dark" to="/signup">Create Account <ArrowRight size={16} /></NavLink>
          <NavLink className="btn btn-light" to="/login">Login</NavLink>
        </div>
      </div>

      <div className="home-visual" aria-label="UPI banking preview">
        <div className="phone-frame">
          <div className="phone-top"><WalletCards size={18} /><span>UPI Secure</span></div>
          <div className="payment-orb"><BadgeIndianRupee size={44} /></div>
          <div className="payment-row"><span>Mobile</span><strong>Verified</strong></div>
          <div className="payment-row"><span>UPI ID</span><strong>ready@upi</strong></div>
          <div className="payment-row"><span>MPIN</span><strong>Protected</strong></div>
        </div>
      </div>
    </section>
  );
}

function Login() {
  const [message, setMessage] = useState('');

  function handleSubmit(event) {
    event.preventDefault();
    setMessage('Login verified for review demo.');
  }

  return (
    <section className="auth-page">
      <div className="auth-card">
        <div className="auth-icon"><LockKeyhole size={24} /></div>
        <p className="eyebrow">Secure access</p>
        <h2>Login</h2>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Mobile Number
            <input type="tel" placeholder="9876543210" minLength="10" maxLength="10" required />
          </label>
          <label>
            MPIN
            <input type="password" placeholder="4 to 6 digits" minLength="4" maxLength="6" required />
          </label>
          <button className="btn btn-dark" type="submit">Login</button>
        </form>
        {message && <div className="success-message">{message}</div>}
      </div>
    </section>
  );
}

function SignUp() {
  const [message, setMessage] = useState('');

  function handleSubmit(event) {
    event.preventDefault();
    setMessage('Sign-up completed for review demo.');
  }

  return (
    <section className="auth-page">
      <div className="auth-card wide">
        <div className="auth-icon"><UserPlus size={24} /></div>
        <p className="eyebrow">New user onboarding</p>
        <h2>Sign-Up</h2>
        <form className="auth-form grid" onSubmit={handleSubmit}>
          <label>
            Full Name
            <input placeholder="Venkata Sai Krishna" required />
          </label>
          <label>
            Mobile Number
            <input type="tel" placeholder="9876543210" minLength="10" maxLength="10" required />
          </label>
          <label>
            UPI ID
            <input placeholder="name@upi" required />
          </label>
          <label>
            MPIN
            <input type="password" placeholder="4 to 6 digits" minLength="4" maxLength="6" required />
          </label>
          <button className="btn btn-dark" type="submit">Create UPI Account</button>
        </form>
        {message && <div className="success-message">{message}</div>}
      </div>
    </section>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="review-shell">
        <header className="review-nav">
          <NavLink className="brand-link" to="/">
            <Smartphone size={24} />
            <span>UPI Banking</span>
          </NavLink>
          <nav>
            <NavLink to="/">Home</NavLink>
            <NavLink to="/login">Login</NavLink>
            <NavLink to="/signup">Sign-Up</NavLink>
          </nav>
        </header>

        <main className="review-main">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        <footer className="review-footer">
          <ShieldCheck size={16} />
          <span>Current review submission includes only Home, Login, and Sign-Up.</span>
        </footer>
      </div>
    </BrowserRouter>
  );
}

export default App;
