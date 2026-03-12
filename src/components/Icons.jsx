import React from 'react';

const s = { width: 20, height: 20, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };

export const BoltIcon = () => (
  <svg viewBox="0 0 24 24" {...s}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
);

export const CalendarIcon = () => (
  <svg viewBox="0 0 24 24" {...s}><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
);

export const EuroIcon = () => (
  <svg viewBox="0 0 24 24" {...s}><path d="M17 4.5C15.7 3.5 14.1 3 12.3 3 8.3 3 5 6.6 5 11s3.3 8 7.3 8c1.8 0 3.4-.5 4.7-1.5" /><line x1="3" y1="10" x2="14" y2="10" /><line x1="3" y1="14" x2="14" y2="14" /></svg>
);

export const TrendIcon = () => (
  <svg viewBox="0 0 24 24" {...s}><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></svg>
);

export const BuildingIcon = () => (
  <svg viewBox="0 0 24 24" {...s}><rect x="4" y="2" width="16" height="20" rx="2" /><line x1="9" y1="6" x2="11" y2="6" /><line x1="13" y1="6" x2="15" y2="6" /><line x1="9" y1="10" x2="11" y2="10" /><line x1="13" y1="10" x2="15" y2="10" /><line x1="9" y1="14" x2="11" y2="14" /><line x1="13" y1="14" x2="15" y2="14" /><rect x="10" y="18" width="4" height="4" /></svg>
);

export const HomeIcon = () => (
  <svg viewBox="0 0 24 24" {...s}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
);

export const ReceiptIcon = () => (
  <svg viewBox="0 0 24 24" {...s}><path d="M4 2v20l3-2 3 2 3-2 3 2 3-2 3 2V2l-3 2-3-2-3 2-3-2-3 2-3-2z" /><line x1="8" y1="10" x2="16" y2="10" /><line x1="8" y1="14" x2="12" y2="14" /></svg>
);
