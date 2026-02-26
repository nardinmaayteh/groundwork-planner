import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Icons } from './Icons';
import { DAYS_SHORT } from '../constants';
import { formatDateKey, formatDate, formatDateShort, getWeekDates, getMonthDates, formatHour, isPast } from '../utils';

/**
 * MindSpace - Home tab with split panel layout
 * Desktop: Left (Actions) | Right (Calendar)
 * Mobile: Stacked with segment control
 */
const MindSpace = ({ 
  selectedDate, 
  setSelectedDate, 
  tasks, 
  goals,
  categories, 
  weeklyFocus,
  onTaskUpdate, 
  onTaskToggle, 
  onTaskClick, 
  onAddTask,
  onCreateAction,
  onDeleteTask,
  onSaveWeeklyFocus,
}) => {
  // View states
  const [calendarView, setCalendarView] = useState('week'); // day | week | month
  const [actionsView, setActionsView] = useState('week'); // unscheduled | today | week
  const [mobileSegment, setMobileSegment] = useState('actions'); // actions | calendar
  const [focusPanel, setFocusPanel] = useState(null); // null | 'actions' | 'calendar'
  
  // Quick add state
  const [quickAddText, setQuickAddText] = useState('');
  
  // Action editor state
  const [editingAction, setEditingAction] = useState(null);
  
  // Weekly focus editing
  const [focusText, setFocusText] = useState(weeklyFocus || '');
  const [isFocusEditing, setIsFocusEditing] = useState(false);
  
  // Sync focus text with prop
  useEffect(() => {
    setFocusText(weeklyFocus || '');
  }, [weeklyFocus]);
  
  // Date calculations
  const weekDates = getWeekDates(selectedDate);
  const monthDates = getMonthDates(selectedDate);
  const todayKey = formatDateKey(new Date());
  const today = new Date();
  
  // Week label (e.g., "Week of Mar 10–16")
  const weekLabel = useMemo(() => {
    const start = weekDates[0];
    const end = weekDates[6];
    const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
    const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
    if (startMonth === endMonth) {
      return `Week of ${startMonth} ${start.getDate()}–${end.getDate()}`;
    }
    return `Week of ${startMonth} ${start.getDate()} – ${endMonth} ${end.getDate()}`;
  }, [weekDates]);
  
  // Check if it's Sunday for the weekly focus prompt
  const isSunday = today.getDay() === 0;
  const [showFocusPrompt, setShowFocusPrompt] = useState(isSunday && !weeklyFocus);

  // Separate actions by schedule status
  const { unscheduledActions, scheduledActions } = useMemo(() => {
    const unscheduled = [];
    const scheduled = [];
    
    tasks.forEach(task => {
      if (!task.scheduledDate) {
        unscheduled.push(task);
      } else {
        scheduled.push(task);
      }
    });
    
    // Sort: incomplete first, then by order
    unscheduled.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return (a.order || 0) - (b.order || 0);
    });
    
    return { unscheduledActions: unscheduled, scheduledActions: scheduled };
  }, [tasks]);

  // Get actions for a specific date
  const getActionsForDate = useCallback((date) => {
    const dateKey = formatDateKey(date);
    return scheduledActions
      .filter(task => task.scheduledDate === dateKey)
      .sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        const aHasTime = a.startHour !== null && a.startHour !== undefined;
        const bHasTime = b.startHour !== null && b.startHour !== undefined;
        if (aHasTime && bHasTime) return a.startHour - b.startHour;
        return (a.order || 0) - (b.order || 0);
      });
  }, [scheduledActions]);

  // Get actions for current week
  const weekActions = useMemo(() => {
    const actions = [];
    weekDates.forEach(date => {
      actions.push(...getActionsForDate(date));
    });
    return actions;
  }, [weekDates, getActionsForDate]);

  // Get today's actions
  const todayActions = useMemo(() => {
    return getActionsForDate(today);
  }, [today, getActionsForDate]);

  // Current view actions (based on actionsView state)
  const currentActions = useMemo(() => {
    if (actionsView === 'unscheduled') return unscheduledActions;
    if (actionsView === 'today') return todayActions;
    return weekActions;
  }, [actionsView, unscheduledActions, todayActions, weekActions]);

  // Group actions by category (for Today and Week views)
  const groupedActions = useMemo(() => {
    if (actionsView === 'unscheduled') {
      // Flat list for unscheduled
      return { flat: currentActions };
    }
    
    const groups = {};
    const uncategorized = [];
    const completed = [];
    
    currentActions.forEach(action => {
      if (action.completed) {
        completed.push(action);
      } else if (!action.categoryId) {
        uncategorized.push(action);
      } else {
        if (!groups[action.categoryId]) groups[action.categoryId] = [];
        groups[action.categoryId].push(action);
      }
    });
    
    return { groups, uncategorized, completed };
  }, [currentActions, actionsView]);

  // Completed today count
  const completedTodayCount = useMemo(() => {
    return tasks.filter(t => {
      if (!t.completed || !t.completedAt) return false;
      const completedDate = new Date(t.completedAt);
      return formatDateKey(completedDate) === todayKey;
    }).length;
  }, [tasks, todayKey]);

  // Navigation
  const navigate = (direction) => {
    const newDate = new Date(selectedDate);
    if (calendarView === 'day') newDate.setDate(newDate.getDate() + direction);
    else if (calendarView === 'week') newDate.setDate(newDate.getDate() + direction * 7);
    else newDate.setMonth(newDate.getMonth() + direction);
    setSelectedDate(newDate);
  };

  // Quick Add handler
  const handleQuickAdd = (e) => {
    e.preventDefault();
    if (!quickAddText.trim()) return;
    
    const id = `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    onCreateAction({
      id,
      title: quickAddText.trim(),
      categoryId: null,
      goalId: null,
      scheduledDate: null,
      startHour: null,
      startMinute: 0,
      duration: 1,
      completed: false,
      isTask: true,
    });
    
    setQuickAddText('');
  };

  // Weekly focus save
  const handleFocusSave = () => {
    const weekStart = formatDateKey(weekDates[0]);
    onSaveWeeklyFocus(focusText, weekStart);
    setIsFocusEditing(false);
  };

  // Action scheduling
  const handleScheduleAction = (action, date) => {
    onTaskUpdate({
      ...action,
      scheduledDate: formatDateKey(date),
    });
    setEditingAction(null);
  };

  // Detect mobile
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // ============ COMPONENTS ============

  // Action Item Component
  const ActionItem = ({ action, showDate = false }) => {
    const category = action.categoryId ? categories.find(c => c.id === action.categoryId) : null;
    const isEditing = editingAction?.id === action.id;

    return (
      <div className={`group relative ${action.completed ? 'opacity-50' : ''}`}>
        <div 
          className={`flex items-center gap-3 py-2.5 px-3 rounded-lg transition-all cursor-pointer
            ${isEditing ? 'bg-stone-100 ring-1 ring-stone-300' : 'hover:bg-stone-50'}
            ${isEditing ? 'border-l-2 border-stone-500' : 'border-l-2 border-transparent'}
          `}
          onClick={() => setEditingAction(isEditing ? null : action)}
        >
          {/* Checkbox */}
          <button
            onClick={(e) => { e.stopPropagation(); onTaskToggle(action.id); }}
            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors
              ${action.completed 
                ? 'bg-stone-400 border-stone-400 text-white' 
                : 'border-stone-300 hover:border-stone-400'
              }`}
          >
            {action.completed && <Icons.Check size={12} />}
          </button>

          {/* Title */}
          <span className={`flex-1 text-sm ${action.completed ? 'line-through text-stone-400' : 'text-stone-700'}`}>
            {action.title}
          </span>

          {/* Category indicator */}
          {category && (
            <div 
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: category.color }}
              title={category.name}
            />
          )}

          {/* Time if scheduled */}
          {action.startHour !== null && action.startHour !== undefined && (
            <span className="text-xs text-stone-400">{formatHour(action.startHour)}</span>
          )}

          {/* Date if showing */}
          {showDate && action.scheduledDate && (
            <span className="text-xs text-stone-400">{formatDateShort(action.scheduledDate)}</span>
          )}
        </div>

        {/* Inline Editor */}
        {isEditing && (
          <div className="mt-2 p-3 bg-stone-50 rounded-lg border border-stone-200 space-y-3">
            {/* Date picker */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-stone-500 w-16">Date</label>
              <input
                type="date"
                value={action.scheduledDate || ''}
                onChange={(e) => onTaskUpdate({ ...action, scheduledDate: e.target.value || null })}
                className="flex-1 text-sm px-2 py-1.5 rounded border border-stone-200 bg-white"
              />
              {action.scheduledDate && (
                <button
                  onClick={() => onTaskUpdate({ ...action, scheduledDate: null })}
                  className="text-xs text-stone-400 hover:text-stone-600"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Time picker */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-stone-500 w-16">Time</label>
              <select
                value={action.startHour ?? ''}
                onChange={(e) => onTaskUpdate({ ...action, startHour: e.target.value ? parseInt(e.target.value) : null })}
                className="flex-1 text-sm px-2 py-1.5 rounded border border-stone-200 bg-white"
              >
                <option value="">No time</option>
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>{formatHour(i)}</option>
                ))}
              </select>
            </div>

            {/* Category picker */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-stone-500 w-16">Category</label>
              <select
                value={action.categoryId || ''}
                onChange={(e) => onTaskUpdate({ ...action, categoryId: e.target.value || null })}
                className="flex-1 text-sm px-2 py-1.5 rounded border border-stone-200 bg-white"
              >
                <option value="">No category</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            {/* Goal picker */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-stone-500 w-16">Goal</label>
              <select
                value={action.goalId || ''}
                onChange={(e) => onTaskUpdate({ ...action, goalId: e.target.value || null })}
                className="flex-1 text-sm px-2 py-1.5 rounded border border-stone-200 bg-white"
              >
                <option value="">No goal</option>
                {goals.map(goal => (
                  <option key={goal.id} value={goal.id}>{goal.title}</option>
                ))}
              </select>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-stone-200">
              <button
                onClick={() => {
                  if (window.confirm('Delete this action?')) {
                    onDeleteTask(action.id);
                    setEditingAction(null);
                  }
                }}
                className="text-xs text-red-500 hover:text-red-600"
              >
                Delete
              </button>
              <button
                onClick={() => setEditingAction(null)}
                className="text-xs text-stone-500 hover:text-stone-700"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Actions Panel Component
  const ActionsPanel = ({ expanded = false }) => (
    <div className={`flex flex-col h-full bg-white ${expanded ? '' : 'border-r border-stone-200'}`}>
      {/* Panel Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
        <div className="flex items-center gap-1 bg-stone-100 rounded-lg p-0.5">
          {['unscheduled', 'today', 'week'].map(view => (
            <button
              key={view}
              onClick={() => setActionsView(view)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors
                ${actionsView === view ? 'bg-white shadow-sm text-stone-800' : 'text-stone-500 hover:text-stone-700'}`}
            >
              {view}
            </button>
          ))}
        </div>
        
        {!isMobile && (
          <button
            onClick={() => setFocusPanel(focusPanel === 'actions' ? null : 'actions')}
            className="p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded transition-colors"
            title={focusPanel === 'actions' ? 'Exit focus mode' : 'Expand panel'}
          >
            {focusPanel === 'actions' ? <Icons.Minimize size={16} /> : <Icons.Maximize size={16} />}
          </button>
        )}
      </div>

      {/* View label for Unscheduled */}
      {actionsView === 'unscheduled' && (
        <div className="px-4 py-2 text-xs text-stone-500 bg-stone-50 border-b border-stone-100">
          Viewing: Unscheduled
        </div>
      )}

      {/* Actions List */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {actionsView === 'unscheduled' ? (
          // Flat list for unscheduled
          <div className="space-y-0.5">
            {groupedActions.flat?.filter(a => !a.completed).map(action => (
              <ActionItem key={action.id} action={action} />
            ))}
            
            {/* Completed at bottom */}
            {groupedActions.flat?.filter(a => a.completed).length > 0 && (
              <div className="mt-4 pt-2 border-t border-stone-100">
                {groupedActions.flat?.filter(a => a.completed).map(action => (
                  <ActionItem key={action.id} action={action} />
                ))}
              </div>
            )}
            
            {groupedActions.flat?.length === 0 && (
              <div className="text-center py-8 text-stone-400 text-sm">
                Nothing here yet.
              </div>
            )}
          </div>
        ) : (
          // Grouped by category for Today/Week
          <div className="space-y-4">
            {/* Uncategorized first */}
            {groupedActions.uncategorized?.length > 0 && (
              <div>
                <div className="text-xs font-medium text-stone-400 px-3 py-1 mb-1">Uncategorized</div>
                {groupedActions.uncategorized.map(action => (
                  <ActionItem key={action.id} action={action} showDate={actionsView === 'week'} />
                ))}
              </div>
            )}

            {/* Category groups */}
            {Object.entries(groupedActions.groups || {}).map(([categoryId, actions]) => {
              const category = categories.find(c => c.id === categoryId);
              return (
                <div key={categoryId}>
                  <div 
                    className="text-xs font-medium px-3 py-1 mb-1 flex items-center gap-2"
                    style={{ color: category?.color || '#78716c' }}
                  >
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: category?.color }} />
                    {category?.name || 'Unknown'}
                  </div>
                  {actions.map(action => (
                    <ActionItem key={action.id} action={action} showDate={actionsView === 'week'} />
                  ))}
                </div>
              );
            })}

            {/* Completed at bottom */}
            {groupedActions.completed?.length > 0 && (
              <div className="pt-2 border-t border-stone-100">
                <div className="text-xs text-stone-400 px-3 py-1 mb-1">Completed</div>
                {groupedActions.completed.map(action => (
                  <ActionItem key={action.id} action={action} showDate={actionsView === 'week'} />
                ))}
              </div>
            )}

            {/* Empty state */}
            {!groupedActions.uncategorized?.length && 
             !Object.keys(groupedActions.groups || {}).length && 
             !groupedActions.completed?.length && (
              <div className="text-center py-8 text-stone-400 text-sm">
                Nothing scheduled yet.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Completed today count */}
      <div className="px-4 py-2 border-t border-stone-100 text-xs text-stone-400">
        Completed today: {completedTodayCount}
      </div>
    </div>
  );

  // Calendar Day Card
  const DayCard = ({ date, compact = false }) => {
    const dateKey = formatDateKey(date);
    const isToday = dateKey === todayKey;
    const isSelected = formatDateKey(selectedDate) === dateKey;
    const dayActions = getActionsForDate(date);
    const incompleteActions = dayActions.filter(a => !a.completed);
    const maxVisible = compact ? 2 : 3;

    return (
      <div 
        onClick={() => { setSelectedDate(date); if (calendarView === 'month') setCalendarView('day'); }}
        className={`rounded-lg border transition-all cursor-pointer overflow-hidden
          ${isToday ? 'border-stone-400' : 'border-stone-200'}
          ${isSelected && calendarView !== 'month' ? 'bg-stone-50' : 'bg-white hover:bg-stone-50'}
        `}
        style={{ height: compact ? '100px' : '140px' }}
      >
        {/* Header */}
        <div className={`px-2 py-1.5 flex items-center justify-between ${isToday ? 'bg-stone-100' : ''}`}>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-stone-400">{DAYS_SHORT[date.getDay() === 0 ? 6 : date.getDay() - 1]}</span>
            <span className={`text-sm font-medium ${isToday ? 'text-stone-900' : 'text-stone-600'}`}>
              {date.getDate()}
            </span>
          </div>
          <button
            onClick={(e) => { 
              e.stopPropagation(); 
              const id = `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
              onCreateAction({
                id,
                title: 'New action',
                categoryId: null,
                goalId: null,
                scheduledDate: dateKey,
                startHour: null,
                completed: false,
                isTask: true,
              });
            }}
            className="text-stone-300 hover:text-stone-500 p-0.5"
          >
            <Icons.Plus size={12} />
          </button>
        </div>

        {/* Actions */}
        <div className="px-2 py-1 space-y-0.5 overflow-hidden">
          {incompleteActions.slice(0, maxVisible).map(action => {
            const category = action.categoryId ? categories.find(c => c.id === action.categoryId) : null;
            return (
              <div 
                key={action.id}
                className="text-xs truncate py-0.5 px-1.5 rounded flex items-center gap-1"
                style={{ backgroundColor: category ? category.color + '15' : '#f5f5f4' }}
              >
                {category && <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: category.color }} />}
                <span className="truncate text-stone-600">{action.title}</span>
              </div>
            );
          })}
          {incompleteActions.length > maxVisible && (
            <div className="text-xs text-stone-400 px-1.5">+{incompleteActions.length - maxVisible} more</div>
          )}
        </div>
      </div>
    );
  };

  // Calendar Panel Component
  const CalendarPanel = ({ expanded = false, dimmed = false }) => (
    <div className={`flex flex-col h-full bg-white transition-opacity ${dimmed ? 'opacity-50' : ''}`}>
      {/* Panel Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="p-1 hover:bg-stone-100 rounded text-stone-500">
            <Icons.ChevronLeft size={18} />
          </button>
          <span className="text-sm font-medium text-stone-700 min-w-[160px] text-center">
            {calendarView === 'day' && formatDate(selectedDate)}
            {calendarView === 'week' && weekLabel}
            {calendarView === 'month' && selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </span>
          <button onClick={() => navigate(1)} className="p-1 hover:bg-stone-100 rounded text-stone-500">
            <Icons.ChevronRight size={18} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center gap-0.5 bg-stone-100 rounded-lg p-0.5">
            {['day', 'week', 'month'].map(view => (
              <button
                key={view}
                onClick={() => setCalendarView(view)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md capitalize transition-colors
                  ${calendarView === view ? 'bg-white shadow-sm text-stone-800' : 'text-stone-500 hover:text-stone-700'}`}
              >
                {view}
              </button>
            ))}
          </div>

          {!isMobile && (
            <button
              onClick={() => setFocusPanel(focusPanel === 'calendar' ? null : 'calendar')}
              className="p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded transition-colors"
              title={focusPanel === 'calendar' ? 'Exit focus mode' : 'Expand panel'}
            >
              {focusPanel === 'calendar' ? <Icons.Minimize size={16} /> : <Icons.Maximize size={16} />}
            </button>
          )}
        </div>
      </div>

      {/* Calendar Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {/* Day View */}
        {calendarView === 'day' && (
          <div className="space-y-1">
            {(() => {
              const dayActions = getActionsForDate(selectedDate);
              const incomplete = dayActions.filter(a => !a.completed);
              const completed = dayActions.filter(a => a.completed);

              // Group by category
              const groups = {};
              const uncategorized = [];
              incomplete.forEach(action => {
                if (!action.categoryId) uncategorized.push(action);
                else {
                  if (!groups[action.categoryId]) groups[action.categoryId] = [];
                  groups[action.categoryId].push(action);
                }
              });

              return (
                <>
                  {/* Add action button */}
                  <button
                    onClick={() => {
                      const id = `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                      onCreateAction({
                        id,
                        title: 'New action',
                        categoryId: null,
                        scheduledDate: formatDateKey(selectedDate),
                        completed: false,
                        isTask: true,
                      });
                    }}
                    className="w-full text-left text-sm text-stone-400 hover:text-stone-600 py-2 px-3 hover:bg-stone-50 rounded-lg transition-colors"
                  >
                    + Add action
                  </button>

                  {/* Uncategorized */}
                  {uncategorized.length > 0 && (
                    <div className="mb-4">
                      <div className="text-xs text-stone-400 px-3 py-1">Uncategorized</div>
                      {uncategorized.map(action => <ActionItem key={action.id} action={action} />)}
                    </div>
                  )}

                  {/* Category groups */}
                  {Object.entries(groups).map(([categoryId, actions]) => {
                    const category = categories.find(c => c.id === categoryId);
                    return (
                      <div key={categoryId} className="mb-4">
                        <div className="text-xs px-3 py-1 flex items-center gap-2" style={{ color: category?.color }}>
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: category?.color }} />
                          {category?.name}
                        </div>
                        {actions.map(action => <ActionItem key={action.id} action={action} />)}
                      </div>
                    );
                  })}

                  {/* Completed */}
                  {completed.length > 0 && (
                    <div className="mt-4 pt-2 border-t border-stone-100">
                      <div className="text-xs text-stone-400 px-3 py-1">Completed</div>
                      {completed.map(action => <ActionItem key={action.id} action={action} />)}
                    </div>
                  )}

                  {incomplete.length === 0 && completed.length === 0 && (
                    <div className="text-center py-8 text-stone-400 text-sm">Nothing scheduled.</div>
                  )}
                </>
              );
            })()}
          </div>
        )}

        {/* Week View */}
        {calendarView === 'week' && (
          <div className="grid grid-cols-7 gap-2">
            {weekDates.map((date, i) => (
              <DayCard key={i} date={date} compact={true} />
            ))}
          </div>
        )}

        {/* Month View */}
        {calendarView === 'month' && (
          <div>
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {DAYS_SHORT.map(day => (
                <div key={day} className="text-xs text-stone-400 text-center py-1">{day}</div>
              ))}
            </div>
            
            {/* Day cells */}
            <div className="grid grid-cols-7 gap-1">
              {monthDates.map((date, i) => {
                if (!date) return <div key={i} className="h-16" />;
                
                const dateKey = formatDateKey(date);
                const isToday = dateKey === todayKey;
                const isCurrentMonth = date.getMonth() === selectedDate.getMonth();
                const dayActions = getActionsForDate(date);
                const incomplete = dayActions.filter(a => !a.completed);

                return (
                  <div
                    key={i}
                    onClick={() => { setSelectedDate(date); setCalendarView('day'); }}
                    className={`h-16 rounded border p-1 cursor-pointer transition-colors overflow-hidden
                      ${isToday ? 'border-stone-400 bg-stone-50' : 'border-stone-100 hover:bg-stone-50'}
                      ${!isCurrentMonth ? 'opacity-40' : ''}`}
                  >
                    <div className={`text-xs font-medium ${isToday ? 'text-stone-900' : 'text-stone-500'}`}>
                      {date.getDate()}
                    </div>
                    {incomplete.length > 0 && (
                      <div className="mt-0.5 text-xs text-stone-400">{incomplete.length} action{incomplete.length > 1 ? 's' : ''}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // ============ MAIN RENDER ============

  return (
    <div className="h-full flex flex-col bg-stone-50">
      {/* Top Section: Weekly Focus + Quick Add */}
      <div className="bg-white border-b border-stone-200 px-4 py-4 flex-shrink-0">
        {/* Weekly Focus Prompt (Sunday) */}
        {showFocusPrompt && !focusText && (
          <div className="mb-3 flex items-center justify-between text-sm text-stone-500 bg-stone-50 rounded-lg px-3 py-2">
            <span>Set your focus for this week.</span>
            <button onClick={() => setShowFocusPrompt(false)} className="text-stone-400 hover:text-stone-600">
              <Icons.X size={14} />
            </button>
          </div>
        )}

        {/* Weekly Focus */}
        <div className="mb-2">
          {isFocusEditing ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={focusText}
                onChange={(e) => setFocusText(e.target.value)}
                onBlur={handleFocusSave}
                onKeyDown={(e) => e.key === 'Enter' && handleFocusSave()}
                placeholder="Set your focus for this week."
                className="flex-1 text-lg font-medium text-stone-800 bg-transparent border-b border-stone-300 focus:border-stone-500 outline-none py-1"
                autoFocus
              />
            </div>
          ) : (
            <div 
              onClick={() => setIsFocusEditing(true)}
              className="text-lg font-medium text-stone-800 cursor-text hover:bg-stone-50 rounded px-1 py-0.5 -mx-1"
            >
              {focusText || <span className="text-stone-400">Set your focus for this week.</span>}
            </div>
          )}
        </div>

        {/* Week Label */}
        <div className="text-xs text-stone-400 mb-3">{weekLabel}</div>

        {/* Quick Add */}
        <form onSubmit={handleQuickAdd} className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 bg-stone-50 rounded-lg px-3 py-2 border border-stone-200 focus-within:border-stone-400 transition-colors">
            <Icons.Plus size={16} className="text-stone-400" />
            <input
              type="text"
              value={quickAddText}
              onChange={(e) => setQuickAddText(e.target.value)}
              placeholder="Add action..."
              className="flex-1 bg-transparent text-sm text-stone-700 placeholder:text-stone-400 outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => onAddTask({})}
            className="px-3 py-2 text-sm text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
          >
            Details
          </button>
        </form>
      </div>

      {/* Main Content */}
      {isMobile ? (
        // Mobile: Segmented control
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Segment Control */}
          <div className="bg-white border-b border-stone-200 px-4 py-2">
            <div className="flex items-center gap-1 bg-stone-100 rounded-lg p-0.5">
              {['actions', 'calendar'].map(segment => (
                <button
                  key={segment}
                  onClick={() => setMobileSegment(segment)}
                  className={`flex-1 py-2 text-sm font-medium rounded-md capitalize transition-colors
                    ${mobileSegment === segment ? 'bg-white shadow-sm text-stone-800' : 'text-stone-500'}`}
                >
                  {segment}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {mobileSegment === 'actions' ? (
              <ActionsPanel />
            ) : (
              <CalendarPanel dimmed={actionsView === 'unscheduled'} />
            )}
          </div>
        </div>
      ) : (
        // Desktop: Split panels
        <div className="flex-1 flex overflow-hidden">
          {focusPanel === 'calendar' ? (
            <CalendarPanel expanded dimmed={actionsView === 'unscheduled'} />
          ) : focusPanel === 'actions' ? (
            <ActionsPanel expanded />
          ) : (
            <>
              {/* Actions Panel (40%) */}
              <div className="w-2/5 flex-shrink-0 overflow-hidden">
                <ActionsPanel />
              </div>
              
              {/* Calendar Panel (60%) */}
              <div className="flex-1 overflow-hidden">
                <CalendarPanel dimmed={actionsView === 'unscheduled'} />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default MindSpace;
