'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('nv_admin_ok') === '1') {
      router.replace('/admin');
    }
  }, [router]);

  function handleSubmit(e) {
    e.preventDefault();
    const validPin = process.env.NEXT_PUBLIC_ADMIN_PIN || '2468';

    if (pin === validPin) {
      localStorage.setItem('nv_admin_ok', '1');
      router.replace('/admin');
      return;
    }

    setError('Неверный PIN');
  }

  return (
    <main className="page-shell center-shell">
      <form className="panel login-panel" onSubmit={handleSubmit}>
        <h1>Вход в админку</h1>
        <p className="muted">Введите PIN администратора</p>
        <input
          className="input"
          type="password"
          placeholder="PIN"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
        />
        {error ? <div className="error-text">{error}</div> : null}
        <button className="btn" type="submit">Войти</button>
      </form>
    </main>
  );
}
