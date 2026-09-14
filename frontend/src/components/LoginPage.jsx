import React, { useState } from 'react';
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { loginUser } from '../api';

const DEMO_PRESETS = [
  { id: 'admin', label: 'Admin', user: 'admin', pass: 'admin123', role: 'Property Director' },
  { id: 'manager', label: 'Manager', user: 'manager', pass: 'manager123', role: 'Property Manager' },
  { id: 'tech', label: 'Tech Lead', user: 'tech', pass: 'tech123', role: 'Maintenance' },
];

export default function LoginPage({ onLoginSuccess }) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [activePreset, setActivePreset] = useState('admin');

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMessage('Please enter both username and password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const data = await loginUser(username.trim(), password);
      if (onLoginSuccess) {
        onLoginSuccess(data.user, data.token);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Invalid username or password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPreset = (preset) => {
    setActivePreset(preset.id);
    setUsername(preset.user);
    setPassword(preset.pass);
    setErrorMessage('');
  };

  return (
    <div className="login-minimal-container">
      <div className="login-minimal-card">
        {/* Brand & Heading */}
        <div className="login-minimal-header">
          <div className="login-minimal-logo">
            <Mail size={22} />
          </div>
          <h1 className="login-minimal-title">Sign in</h1>
          <p className="login-minimal-desc">Resident Issue Ticketing & AI Dispatch</p>
        </div>

        {/* Minimalist Demo Quick-fill Pills */}
        <div className="login-demo-bar">
          <span className="login-demo-label">Quick fill:</span>
          <div className="login-demo-pills">
            {DEMO_PRESETS.map((preset) => {
              const isSelected = activePreset === preset.id && username === preset.user;
              return (
                <button
                  key={preset.id}
                  type="button"
                  className={`demo-pill ${isSelected ? 'active' : ''}`}
                  onClick={() => handleSelectPreset(preset)}
                  title={`Sign in as ${preset.role} (${preset.user})`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="login-minimal-error">
            <AlertCircle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="login-minimal-form">
          <div className="login-form-group">
            <label className="login-form-label" htmlFor="username">
              Username
            </label>
            <div className="login-field-box">
              <User size={16} className="login-field-icon" />
              <input
                id="username"
                type="text"
                className="login-field-input"
                placeholder="Username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setActivePreset(null);
                }}
                autoComplete="username"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="login-form-group">
            <div className="login-label-split">
              <label className="login-form-label" htmlFor="password">
                Password
              </label>
            </div>
            <div className="login-field-box">
              <Lock size={16} className="login-field-icon" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="login-field-input"
                placeholder="Password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setActivePreset(null);
                }}
                autoComplete="current-password"
                required
                disabled={isLoading}
              />
              <button
                type="button"
                className="login-eye-btn"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <div className="login-remember-row">
            <label className="login-checkbox-wrapper">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span>Remember me</span>
            </label>
          </div>

          <button
            type="submit"
            className="login-minimal-submit"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="spin" />
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div className="login-minimal-footer">
          <span>Secure Session • End-to-end Encrypted</span>
        </div>
      </div>
    </div>
  );
}
