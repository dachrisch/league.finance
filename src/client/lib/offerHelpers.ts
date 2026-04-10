// src/client/lib/offerHelpers.ts
import { Types } from 'mongoose';

export interface OfferDisplay {
  id: string;
  associationName: string;
  seasonId: number;
  seasonName?: string;
  contactName: string;
  leagueCount: number;
  leagueNames: string[];
  status: 'draft' | 'sent' | 'accepted';
  createdAt: Date;
  sentAt?: Date;
  acceptedAt?: Date;
}

export function calculateTotalExpectedRevenue(
  configs: Array<{ expectedTeamsCount: number; baseRateOverride: number | null }> = []
): number {
  return configs.reduce((sum, config) => {
    const rate = config.baseRateOverride ?? 50; // fallback to 50
    return sum + rate * config.expectedTeamsCount;
  }, 0);
}

export function getStatusColor(status: 'draft' | 'sent' | 'accepted'): string {
  switch (status) {
    case 'draft':
      return '#ffc107'; // yellow
    case 'sent':
      return '#0d6efd'; // blue
    case 'accepted':
      return '#198754'; // green
    default:
      return '#6c757d'; // gray
  }
}

export function getStatusLabel(status: 'draft' | 'sent' | 'accepted'): string {
  return status.toUpperCase();
}

export function formatDate(date?: Date | string): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function getTimeAgoText(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const seconds = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
