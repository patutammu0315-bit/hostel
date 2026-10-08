'use client';

import React, { useState, useEffect } from 'react';
import { MonthlySummary, HostelDailyCount } from '@/types';
import { StatCard } from './StatCard';
import { DataTable } from './DataTable';
import { Users, GraduationCap, Briefcase, CalendarCheck2, Download } from 'lucide-react';
import { getMonthNameAndYear } from '@/lib/date';

export function MonthlyReport() {
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
  
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [records, setRecords] = useState<HostelDailyCount[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  useEffect(() => {
    async function fetchMonthlyData() {
      setLoading(true);
      try {
        const [yearStr, monthStr] = selectedMonth.split('-');
        const year = parseInt(yearStr, 10);
        const month = parseInt(monthStr, 10);

        // Fetch counts for this month
        const countsRes = await fetch(`/api/dashboard/counts?month=${selectedMonth}&limit=100`);
        if (countsRes.ok) {
          const data = await countsRes.json();
          const recs: HostelDailyCount[] = data.records || [];
          setRecords(recs);

          // Calculate summary client-side or use server endpoint
          let totalStudents = 0;
          let totalStaff = 0;
          let totalOthers = 0;
          let combinedTotal = 0;

          for (const r of recs) {
            totalStudents += r.students;
            totalStaff += r.staff;
            totalOthers += r.others;
            combinedTotal += r.total;
          }

          setSummary({
            year,
            month,
            monthName: getMonthNameAndYear(year, month).split(' ')[0],
            daysRecorded: recs.length,
            totalStudents,
            totalStaff,
            totalOthers,
            combinedTotal,
          });
        }
      } catch (err) {
        console.error('Error fetching monthly report:', err);
      } finally {
        setLoading(false);
      }
    }

    if (selectedMonth) {
      fetchMonthlyData();
    }
  }, [selectedMonth]);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const res = await fetch(`/api/dashboard/export?month=${selectedMonth}`);
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hostel_monthly_report_${selectedMonth}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export download error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Select Month:
          </label>
          <input
            type="month"
            className="form-control"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          />
        </div>

        <button
          type="button"
          onClick={handleExport}
          disabled={isExporting}
          className="btn btn-outline"
        >
          <Download size={14} />
          <span>{isExporting ? 'Exporting...' : 'Export Month CSV'}</span>
        </button>
      </div>

      {summary && (
        <div className="stats-grid">
          <StatCard
            title="Days Recorded"
            value={summary.daysRecorded}
            icon={<CalendarCheck2 size={20} />}
            iconBg="var(--primary-light)"
            iconColor="var(--primary)"
            subtext={`${summary.monthName} ${summary.year}`}
          />
          <StatCard
            title="Total Student Entries"
            value={summary.totalStudents}
            icon={<GraduationCap size={20} />}
            iconBg="#ecfdf5"
            iconColor="#059669"
            subtext="Cumulative students"
          />
          <StatCard
            title="Total Staff Entries"
            value={summary.totalStaff}
            icon={<Briefcase size={20} />}
            iconBg="var(--warning-light)"
            iconColor="var(--warning)"
            subtext="Cumulative staff"
          />
          <StatCard
            title="Total Others Entries"
            value={summary.totalOthers}
            icon={<Users size={20} />}
            iconBg="#f5f3ff"
            iconColor="#7c3aed"
            subtext="Cumulative others"
          />
        </div>
      )}

      {summary && (
        <div
          style={{
            background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
            border: '1px solid #bfdbfe',
            borderRadius: 'var(--radius-lg)',
            padding: '1.25rem 1.5rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            <div style={{ fontSize: '0.85rem', color: '#1e40af', fontWeight: 600 }}>
              Combined Monthly Total Count
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e3a8a' }}>
              {summary.combinedTotal.toLocaleString()}
            </div>
          </div>
          <div style={{ fontSize: '0.85rem', color: '#3b82f6', fontWeight: 500 }}>
            {summary.monthName} {summary.year} aggregate summary
          </div>
        </div>
      )}

      <div style={{ marginTop: '1rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>
          Daily Records in {summary?.monthName} {summary?.year}
        </h3>
        <DataTable records={records} loading={loading} />
      </div>
    </div>
  );
}
