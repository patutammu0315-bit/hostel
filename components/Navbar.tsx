'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Building2, LogOut, ShieldCheck, Clock } from 'lucide-react';

interface NavbarProps {
  username?: string;
}

export function Navbar({ username = 'Admin' }: NavbarProps) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <div className="navbar-brand">
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 8,
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
            }}
          >
            <Building2 size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, lineHeight: 1.2 }}>
              🏨 Hostel Daily Count
            </h1>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
              WhatsApp Automated Management System
            </span>
          </div>
        </div>

        <div className="navbar-actions">
          <div className="badge badge-info" title="Application Timezone">
            <Clock size={12} />
            <span>IST (Asia/Kolkata)</span>
          </div>

          <div className="badge badge-success" title="Admin Authentication Active">
            <ShieldCheck size={12} />
            <span>{username}</span>
          </div>

          <button
            onClick={handleLogout}
            className="btn btn-outline"
            style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
            title="Sign out of Dashboard"
          >
            <LogOut size={14} />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}
