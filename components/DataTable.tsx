'use client';

import React from 'react';
import { HostelDailyCount } from '@/types';
import { formatIsoToDisplay, formatDisplayDateTime } from '@/lib/date';
import { CalendarX2 } from 'lucide-react';

interface DataTableProps {
  records: HostelDailyCount[];
  loading: boolean;
}

export function DataTable({ records, loading }: DataTableProps) {
  if (loading) {
    return (
      <div className="table-wrapper" style={{ padding: '3rem', textAlign: 'center' }}>
        <div style={{ color: 'var(--text-muted)' }}>Loading hostel daily records...</div>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="table-wrapper">
        <div className="empty-state">
          <CalendarX2 size={40} style={{ opacity: 0.5, marginBottom: '0.5rem' }} />
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            No daily records found
          </h3>
          <p>Hostel managers submit records directly via WhatsApp (e.g. 120,8,3).</p>
        </div>
      </div>
    );
  }

  return (
    <div className="table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            <th>Date</th>
            <th style={{ textAlign: 'right' }}>👨🎓 Students</th>
            <th style={{ textAlign: 'right' }}>👨🏫 Staff</th>
            <th style={{ textAlign: 'right' }}>👤 Others</th>
            <th style={{ textAlign: 'right' }}>📊 Total</th>
            <th>Submitted By</th>
            <th>Created At (IST)</th>
          </tr>
        </thead>
        <tbody>
          {records.map((item) => (
            <tr key={item.id}>
              <td style={{ fontWeight: 600 }}>{formatIsoToDisplay(item.record_date)}</td>
              <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                {item.students.toLocaleString()}
              </td>
              <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                {item.staff.toLocaleString()}
              </td>
              <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                {item.others.toLocaleString()}
              </td>
              <td style={{ textAlign: 'right' }}>
                <span className="total-pill">{item.total.toLocaleString()}</span>
              </td>
              <td>
                <span style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                  {item.submitted_by}
                </span>
              </td>
              <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                {formatDisplayDateTime(item.created_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
