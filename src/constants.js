// Default categories for new users
export const DEFAULT_CATEGORIES = [
  { id: 'personal-admin', name: 'Personal Admin', color: '#f59e0b' },
  { id: 'health', name: 'Health', color: '#ef4444' },
  { id: 'leisure', name: 'Leisure', color: '#06b6d4' },
  { id: 'hobbies', name: 'Hobbies', color: '#8b5cf6' },
];

// Fallback categories (used if no custom categories exist - for backwards compatibility)
export const CATEGORIES = [
  { id: 'day-job', name: 'Day Job', color: '#78716c' },
  { id: 'certificates', name: 'Certificates/Courses', color: '#8b5cf6' },
  { id: 'portfolio', name: 'Portfolio Building', color: '#3b82f6' },
  { id: 'creative', name: 'Creative', color: '#ec4899' },
  { id: 'personal-admin', name: 'Personal Admin', color: '#f59e0b' },
  { id: 'financial', name: 'Financial', color: '#10b981' },
  { id: 'health', name: 'Health/Exercise', color: '#ef4444' },
  { id: 'leisure', name: 'Leisure', color: '#06b6d4' },
];

// Preset colors for category picker
export const CATEGORY_COLORS = [
  '#78716c', // stone
  '#ef4444', // red
  '#f59e0b', // amber
  '#84cc16', // lime
  '#10b981', // emerald
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#f97316', // orange
];

// Kanban board columns for goals
export const KANBAN_COLUMNS = [
  'Not Started',
  'Ongoing',
  'Complete This Week',
  'Paused',
  'Done'
];

// Hours displayed in schedule (7am to 11pm)
export const HOURS = Array.from({ length: 17 }, (_, i) => i + 7);

// Days of the week (Monday first)
export const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const DAYS_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// Default pomodoro timer settings
export const DEFAULT_POMODORO = {
  work: 25,
  shortBreak: 5,
  longBreak: 15,
  sessionsBeforeLong: 4
};

// Navigation tabs
export const TABS = [
  { id: 'home', label: 'Home' },
  { id: 'goals', label: 'Goals' },
  { id: 'progress', label: 'Progress' },
  { id: 'focus', label: 'Focus' },
];
