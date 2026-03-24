import { v4 as uuidv4 } from 'uuid';

export function generateId(): string {
  return uuidv4();
}

export function formatDate(date: Date): string {
  return date.toISOString();
}

export function parseTimeRange(hours?: number): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();
  
  if (hours) {
    start.setHours(start.getHours() - hours);
  } else {
    start.setHours(start.getHours() - 24); // Default to last 24 hours
  }
  
  return { start, end };
}
