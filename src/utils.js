// Generate unique ID
export const generateId = () => Math.random().toString(36).substr(2, 9);

// Parse date string (YYYY-MM-DD) as local date, not UTC
export const parseLocalDate = (dateStr) => {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return dateStr;
  // If it's a YYYY-MM-DD string, parse as local time
  if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(dateStr);
};

// Format date as YYYY-MM-DD for storage keys
export const formatDateKey = (date) => {
  const d = parseLocalDate(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Format date for display (e.g., "Mon, Jan 15")
export const formatDate = (date) => {
  return parseLocalDate(date).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
};

// Format seconds as MM:SS for timer
export const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// Get array of dates for current week (Monday to Sunday)
export const getWeekDates = (date) => {
  const d = parseLocalDate(date);
  const day = d.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const week = [];
  for (let i = 0; i < 7; i++) {
    const newDate = new Date(d);
    newDate.setDate(d.getDate() + mondayOffset + i);
    week.push(newDate);
  }
  return week;
};

// Get start of week (Monday)
export const getWeekStart = (date) => {
  const d = parseLocalDate(date);
  const day = d.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + mondayOffset);
  d.setHours(0, 0, 0, 0);
  return d;
};

// Get start of month
export const getMonthStart = (date) => {
  const d = parseLocalDate(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
};

// Get week number in year
export const getWeekNumber = (date) => {
  const d = parseLocalDate(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};

// Format hour for display (e.g., "9am", "2pm")
export const formatHour = (hour) => {
  if (hour === 12) return '12pm';
  if (hour > 12) return `${hour - 12}pm`;
  return `${hour}am`;
};

// Get all dates for a month view (including padding days from prev/next month)
export const getMonthDates = (date) => {
  const d = parseLocalDate(date);
  const year = d.getFullYear();
  const month = d.getMonth();
  
  const firstDay = new Date(year, month, 1);
  const startDay = new Date(firstDay);
  const dayOfWeek = firstDay.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  startDay.setDate(firstDay.getDate() + mondayOffset);
  
  const dates = [];
  for (let i = 0; i < 42; i++) {
    const newDate = new Date(startDay);
    newDate.setDate(startDay.getDate() + i);
    dates.push(newDate);
  }
  
  return dates;
};

// Format date as short string (e.g., "Jan 20")
export const formatDateShort = (date) => {
  return parseLocalDate(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });
};

// Check if date is today
export const isToday = (date) => {
  const today = new Date();
  const d = parseLocalDate(date);
  return d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();
};

// Check if date is in the past (before today)
export const isPast = (date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = parseLocalDate(date);
  d.setHours(0, 0, 0, 0);
  return d < today;
};

// Check if it's Sunday or later in the week (for weekly check-in)
export const shouldShowWeeklyCheckIn = (lastCheckInDate) => {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday
  
  if (dayOfWeek !== 0) return false; // Only show on Sunday
  
  if (!lastCheckInDate) return true;
  
  const lastCheckIn = parseLocalDate(lastCheckInDate);
  const weekStart = getWeekStart(now);
  
  return lastCheckIn < weekStart;
};

// Check if it's end of month (for monthly check-in)
export const shouldShowMonthlyCheckIn = (lastCheckInDate) => {
  const now = new Date();
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const currentDay = now.getDate();
  
  // Show in last 3 days of month
  if (currentDay < lastDayOfMonth - 2) return false;
  
  if (!lastCheckInDate) return true;
  
  const lastCheckIn = parseLocalDate(lastCheckInDate);
  const monthStart = getMonthStart(now);
  
  return lastCheckIn < monthStart;
};
