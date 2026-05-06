import { useState } from 'react';
import { useApp } from '../../context/AppContext';

export default function LoginForm() {
  const { loginStep, setLoginStep, handleLogin, verifyOTP, saveName } = useApp();
  const [phoneInput, setPhoneInput] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [nameInput, setNameInput] = useState('');

  return (
    <div className="auth-overlay">
      <div className="auth-card">
        <h1>Study Tracker</h1>
        <p className="auth-subtitle">
          {loginStep === 'phone' && "Sign in to continue"}
          {loginStep === 'otp' && "Enter the OTP sent to your number"}
          {loginStep === 'name' && "What should we call you?"}
        </p>

        {loginStep === 'phone' && (
          <form onSubmit={async (e) => { e.preventDefault(); await handleLogin(phoneInput); }}>
            <div className="phone-input-wrapper">
              <span className="country-code">+91</span>
              <input type="tel" placeholder="Mobile Number" value={phoneInput} onChange={e => setPhoneInput(e.target.value)} required autoFocus />
            </div>
            <button type="submit" className="btn-primary btn-full">Send OTP</button>
          </form>
        )}

        {loginStep === 'otp' && (
          <form onSubmit={async (e) => { e.preventDefault(); await verifyOTP(otpInput); }}>
            <input type="text" placeholder="6-digit OTP" value={otpInput} onChange={e => setOtpInput(e.target.value)} required maxLength={6} autoFocus className="otp-input" />
            <button className="btn-primary btn-full">Verify</button>
            <button type="button" className="btn-back" onClick={() => setLoginStep('phone')}>Back</button>
          </form>
        )}

        {loginStep === 'name' && (
          <form onSubmit={async (e) => { e.preventDefault(); await saveName(nameInput); }}>
            <input type="text" placeholder="Your Name" value={nameInput} onChange={e => setNameInput(e.target.value)} required autoFocus className="name-input" />
            <button className="btn-primary btn-full">Get Started</button>
          </form>
        )}
      </div>
    </div>
  );
}
