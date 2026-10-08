'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { StatCard } from '@/components/StatCard';
import { FilterBar } from '@/components/FilterBar';
import { DataTable } from '@/components/DataTable';
import { MonthlyReport } from '@/components/MonthlyReport';
import { HostelDailyCount } from '@/types';
import {
  GraduationCap,
  Briefcase,
  Users,
  Calculator,
  RefreshCw,
  Table as TableIcon,
  BarChart3,
  Calendar,
} from 'lucide-react';

interface SummaryData {
  today: {
    date: string;
    formattedDate: string;
    hasRecord: boolean;
    students: number;
    staff: number;
    others: number;
    total: number;
    submittedBy: string | null;
  };
  monthly: {
    year: number;
    month: number;
    monthName: string;
    daysRecorded: number;
    totalStudents: number;
    totalStaff: number;
    totalOthers: number;
    combinedTotal: number;
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ username: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'records' | 'monthly'>('records');

  // Stats & records state
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [records, setRecords] = useState<HostelDailyCount[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Filters
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 1. Check authentication status
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          router.push('/login');
          return;
        }
        const data = await res.json();
        setUser(data.user);
      } catch {
        router.push('/login');
      }
    }
    checkAuth();
  }, [router]);

  // 2. Fetch dashboard summary (today's counts)
  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/summary');
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      }
    } catch (err) {
      console.error('Error fetching dashboard summary:', err);
    }
  }, []);

  // 3. Fetch table records with filters
  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedDate) params.set('date', selectedDate);
      if (selectedMonth) params.set('month', selectedMonth);
      if (searchQuery) params.set('search', searchQuery);
      params.set('limit', '100');

      const res = await fetch(`/api/dashboard/counts?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setRecords(data.records || []);
      }
    } catch (err) {
      console.error('Error fetching records:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, selectedMonth, searchQuery]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // Handle Export CSV
  const handleExport = async () => {
    try {
      setIsExporting(true);
      const params = new URLSearchParams();
      if (selectedDate) params.set('date', selectedDate);
      if (selectedMonth) params.set('month', selectedMonth);
      if (searchQuery) params.set('search', searchQuery);

      const res = await fetch(`/api/dashboard/export?${params.toString()}`);
      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hostel_daily_counts_${selectedDate || selectedMonth || 'all'}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleClearFilters = () => {
    setSelectedDate('');
    setSelectedMonth('');
    setSearchQuery('');
  };

  return (
    <div>
      <Navbar username={user?.username || 'Admin'} />

      <main className="container">
        {/* Top Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.5rem',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Daily Hostel Overview
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              {summary?.today
                ? `Today: ${summary.today.formattedDate} (Indian Standard Time)`
                : 'Loading today’s stats...'}
            </p>
          </div>

          <button
            onClick={() => {
              fetchSummary();
              fetchRecords();
            }}
            className="btn btn-outline"
            title="Refresh latest WhatsApp submissions"
          >
            <RefreshCw size={14} />
            <span>Refresh Data</span>
          </button>
        </div>

        {/* 4 Main Stat Cards (Section 19) */}
        <div className="stats-grid">
          <StatCard
            title="Today's Students"
            value={summary?.today.students || 0}
            icon={<GraduationCap size={20} />}
            iconBg="var(--primary-light)"
            iconColor="var(--primary)"
            subtext={
              summary?.today.hasRecord
                ? `Logged for ${summary.today.formattedDate}`
                : 'No submission yet today'
            }
          />
          <StatCard
            title="Today's Staff"
            value={summary?.today.staff || 0}
            icon={<Briefcase size={20} />}
            iconBg="#ecfdf5"
            iconColor="#059669"
            subtext="Resident & support staff"
          />
          <StatCard
            title="Today's Others"
            value={summary?.today.others || 0}
            icon={<Users size={20} />}
            iconBg="var(--warning-light)"
            iconColor="var(--warning)"
            subtext="Guests / visitors"
          />
          <StatCard
            title="Today's Total"
            value={summary?.today.total || 0}
            icon={<Calculator size={20} />}
            iconBg="#f5f3ff"
            iconColor="#7c3aed"
            subtext="Calculated: Students+Staff+Others"
          />
        </div>

        {/* Tab Navigation */}
        <div className="card">
          <div className="card-header" style={{ paddingBottom: 0 }}>
            <div className="tabs" style={{ marginBottom: 0 }}>
              <button
                type="button"
                className={`tab-btn ${activeTab === 'records' ? 'active' : ''}`}
                onClick={() => setActiveTab('records')}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <TableIcon size={16} />
                <span>Daily Records</span>
              </button>
              <button
                type="button"
                className={`tab-btn ${activeTab === 'monthly' ? 'active' : ''}`}
                onClick={() => setActiveTab('monthly')}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <BarChart3 size={16} />
                <span>Monthly Report</span>
              </button>
            </div>
          </div>

          <div className="card-body">
            {activeTab === 'records' ? (
              <div>
                {/* Filters */}
                <FilterBar
                  selectedDate={selectedDate}
                  onDateChange={setSelectedDate}
                  selectedMonth={selectedMonth}
                  onMonthChange={setSelectedMonth}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  onClearFilters={handleClearFilters}
                  onExport={handleExport}
                  isExporting={isExporting}
                />

                {/* Daily Records Table */}
                <DataTable records={records} loading={loading} />
              </div>
            ) : (
              <MonthlyReport />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
