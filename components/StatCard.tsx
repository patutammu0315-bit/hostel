'use client';

import React from 'react';

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  subtext?: string;
}

export function StatCard({ title, value, icon, iconBg, iconColor, subtext }: StatCardProps) {
  return (
    <div className="stat-card">
      <div>
        <div className="stat-header">
          <span>{title}</span>
          <div
            className="stat-icon"
            style={{ backgroundColor: iconBg, color: iconColor }}
          >
            {icon}
          </div>
        </div>
        <div className="stat-value">{value.toLocaleString()}</div>
      </div>
      {subtext && <div className="stat-subtext">{subtext}</div>}
    </div>
  );
}
