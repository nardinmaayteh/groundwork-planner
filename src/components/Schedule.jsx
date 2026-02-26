import React, { useState, useMemo } from 'react';
import { Icons } from './Icons';
import { DAYS_SHORT } from '../constants';
import { formatDateKey, formatDate, formatDateShort, getWeekDates, getMonthDates, formatHour, isPast } from '../utils';

const Schedule = ({ selectedDate, setSelectedDate, tasks, categories, onTaskUpdate, onTaskToggle, onTaskClick, onAddTask }) => {
  const [viewMode, setViewMode] = useState('week');
  const [draggedTask, setDraggedTask] = useState(null);
  const [dragOverTarget, setDragOverTarget] = useState(null);
  const [expandedDay, setExpandedDay] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  const weekDates = getWeekDates(selectedDate);
  const monthDates = getMonthDates(selectedDate);
  const todayKey = formatDateKey(new Date());

  const { thisWeekTasks, datedTasks } = useMemo(() => {
    const thisWeek = [];
    const dated = [];
    tasks.forEach(task => {
      if (!task.scheduledDate) {
        thisWeek.push(task);
      } else {
        dated.push(task);
      }
    });
    // Sort: incomplete first, then by order; completed at bottom
    thisWeek.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return (a.order || 0) - (b.order || 0);
    });
    return { thisWeekTasks: thisWeek, datedTasks: dated };
  }, [tasks]);

  const getTasksForDate = (date) => {
    const dateKey = formatDateKey(date);
    return datedTasks
      .filter(task => task.scheduledDate === dateKey)
      .sort((a, b) => {
        const aHasTime = a.startHour !== null && a.startHour !== undefined;
        const bHasTime = b.startHour !== null && b.startHour !== undefined;
        if (!aHasTime && bHasTime) return -1;
        if (aHasTime && !bHasTime) return 1;
        if (aHasTime && bHasTime) return a.startHour - b.startHour;
        return (a.order || 0) - (b.order || 0);
      });
  };

  const navigate = (direction) => {
    const newDate = new Date(selectedDate);
    if (viewMode === 'day') newDate.setDate(newDate.getDate() + direction);
    else if (viewMode === 'week') newDate.setDate(newDate.getDate() + direction * 7);
    else newDate.setMonth(newDate.getMonth() + direction);
    setSelectedDate(newDate);
  };

  const handleDragStart = (e, task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, targetId = null) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverTarget(targetId);
  };

  const handleDragLeave = () => setDragOverTarget(null);

  const handleDropOnDay = (e, date, dropIndex = null) => {
    e.preventDefault();
    setDragOverTarget(null);
    if (!draggedTask) return;
    
    const dateKey = formatDateKey(date);
    const sameDateDrop = draggedTask.scheduledDate === dateKey;
    
    if (sameDateDrop && dropIndex !== null) {
      const dayTasks = getTasksForDate(date);
      const oldIndex = dayTasks.findIndex(t => t.id === draggedTask.id);
      if (oldIndex !== -1 && oldIndex !== dropIndex) {
        const newOrder = [...dayTasks];
        newOrder.splice(oldIndex, 1);
        newOrder.splice(dropIndex, 0, draggedTask);
        newOrder.forEach((task, idx) => {
          if (task.order !== idx) onTaskUpdate({ ...task, order: idx });
        });
      }
    } else {
      onTaskUpdate({ ...draggedTask, scheduledDate: dateKey, date: dateKey, order: dropIndex ?? 0 });
    }
    setDraggedTask(null);
  };

  const handleDropOnThisWeek = (e, dropIndex = null) => {
    e.preventDefault();
    setDragOverTarget(null);
    if (!draggedTask) return;
    
    const wasUnscheduled = !draggedTask.scheduledDate;
    if (wasUnscheduled && dropIndex !== null) {
      const oldIndex = thisWeekTasks.findIndex(t => t.id === draggedTask.id);
      if (oldIndex !== -1 && oldIndex !== dropIndex) {
        const newOrder = [...thisWeekTasks];
        newOrder.splice(oldIndex, 1);
        newOrder.splice(dropIndex, 0, draggedTask);
        newOrder.forEach((task, idx) => {
          if (task.order !== idx) onTaskUpdate({ ...task, order: idx });
        });
      }
    } else {
      onTaskUpdate({ ...draggedTask, scheduledDate: null, date: null, order: dropIndex ?? thisWeekTasks.length });
    }
    setDraggedTask(null);
  };

  const TaskCard = ({ task, compact = false, index, onDropHere }) => {
    const category = categories.find(c => c.id === task.categoryId);
    const hasTime = task.startHour !== null && task.startHour !== undefined;
    const isDragOver = dragOverTarget === `task-${task.id}`;
    
    return (
      <div
        draggable
        onDragStart={(e) => handleDragStart(e, task)}
        onDragOver={(e) => handleDragOver(e, `task-${task.id}`)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => { e.preventDefault(); e.stopPropagation(); onDropHere?.(index); }}
        className={`bg-white rounded-lg border cursor-pointer hover:shadow-sm transition-all ${compact ? 'p-2' : 'p-3'} ${task.completed ? 'opacity-50' : ''} ${isDragOver ? 'border-stone-400 border-dashed' : 'border-stone-200 hover:border-stone-300'}`}
      >
        <div className="flex items-start gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onTaskToggle(task.id); }}
            className={`w-4 h-4 mt-0.5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${task.completed ? 'bg-stone-800 border-stone-800 text-white' : 'border-stone-300 hover:border-stone-400'}`}
          >
            {task.completed && <Icons.Check size={10} />}
          </button>
          <div className="flex-1 min-w-0" onClick={(e) => { e.stopPropagation(); onTaskClick(task); }}>
            <div className={`font-medium text-stone-800 ${compact ? 'text-xs' : 'text-sm'} ${task.completed ? 'line-through text-stone-400' : ''}`}>
              {task.title}
              {hasTime && <span className="text-stone-400 font-normal ml-1">({formatHour(task.startHour)})</span>}
            </div>
            {!compact && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] px-1.5 py-0.5 rounded text-white" style={{ backgroundColor: category?.color }}>{category?.name}</span>
              </div>
            )}
            {compact && <div className="w-2 h-2 rounded-full mt-1" style={{ backgroundColor: category?.color }} />}
          </div>
        </div>
      </div>
    );
  };

  const ThisWeekSidebar = () => (
    <div className={`bg-stone-800 border-l border-stone-700 flex flex-col transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-0 overflow-hidden'}`}>
      <div className="p-4 border-b border-stone-700 flex items-center justify-between">
        <h3 className="font-semibold text-white text-sm">This Week</h3>
        <button onClick={() => onAddTask({ scheduledDate: null })} className="text-stone-400 hover:text-white p-1"><Icons.Plus size={16} /></button>
      </div>
      <div className="flex-1 overflow-auto p-3" onDragOver={(e) => handleDragOver(e, 'this-week')} onDragLeave={handleDragLeave} onDrop={(e) => handleDropOnThisWeek(e, thisWeekTasks.length)}>
        {thisWeekTasks.length === 0 ? (
          <p className="text-stone-400 text-sm text-center py-4">Drag tasks here or click + to add</p>
        ) : (
          <div className="space-y-2">
            {thisWeekTasks.map((task, index) => (
              <TaskCard key={task.id} task={task} index={index} onDropHere={(dropIndex) => handleDropOnThisWeek({ preventDefault: () => {} }, dropIndex)} />
            ))}
          </div>
        )}
      </div>
      <div className="p-3 border-t border-stone-700 text-xs text-stone-400">{thisWeekTasks.filter(t => !t.completed).length} tasks unscheduled</div>
    </div>
  );

  const DayView = () => {
    const dayTasks = getTasksForDate(selectedDate);
    const dateKey = formatDateKey(selectedDate);
    const isDateToday = dateKey === todayKey;
    
    return (
      <div className="bg-white rounded-xl border border-stone-200 p-4 min-h-[300px]" onDragOver={(e) => handleDragOver(e, 'day-view')} onDragLeave={handleDragLeave} onDrop={(e) => handleDropOnDay(e, selectedDate, dayTasks.length)}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className={`font-semibold ${isDateToday ? 'text-stone-800' : 'text-stone-600'}`}>{formatDate(selectedDate)}</h3>
            {isDateToday && <span className="text-xs text-emerald-600 font-medium">Today</span>}
          </div>
          <button onClick={() => onAddTask({ scheduledDate: dateKey })} className="text-stone-400 hover:text-stone-600 p-1"><Icons.Plus size={18} /></button>
        </div>
        {dayTasks.length === 0 ? (
          <p className="text-stone-400 text-sm text-center py-8">No tasks for this day</p>
        ) : (
          <div className="space-y-2">{dayTasks.map((task, index) => <TaskCard key={task.id} task={task} index={index} onDropHere={(dropIndex) => handleDropOnDay({ preventDefault: () => {} }, selectedDate, dropIndex)} />)}</div>
        )}
      </div>
    );
  };

  const WeekView = () => (
    <div className="grid grid-cols-7 gap-2 h-full">
      {weekDates.map((date, dayIndex) => {
        const dateKey = formatDateKey(date);
        const dayTasks = getTasksForDate(date);
        const isDateToday = dateKey === todayKey;
        const isDatePast = isPast(date) && !isDateToday;
        
        return (
          <div key={dateKey} className={`bg-white rounded-xl border p-3 flex flex-col ${isDateToday ? 'border-stone-400 ring-1 ring-stone-400' : 'border-stone-200'} ${isDatePast ? 'opacity-60' : ''}`} onDragOver={(e) => handleDragOver(e, `day-${dateKey}`)} onDragLeave={handleDragLeave} onDrop={(e) => handleDropOnDay(e, date, dayTasks.length)}>
            <div className="flex items-center justify-between mb-2">
              <div className="text-center">
                <div className={`text-xs uppercase ${isDateToday ? 'text-stone-800 font-semibold' : 'text-stone-400'}`}>{DAYS_SHORT[dayIndex]}</div>
                <div className={`text-lg font-semibold ${isDateToday ? 'bg-stone-800 text-white w-8 h-8 rounded-full flex items-center justify-center mx-auto' : 'text-stone-600'}`}>{date.getDate()}</div>
              </div>
              <button onClick={() => onAddTask({ scheduledDate: dateKey })} className="text-stone-300 hover:text-stone-500 p-1"><Icons.Plus size={14} /></button>
            </div>
            <div className="flex-1 overflow-auto space-y-1.5">{dayTasks.map((task, index) => <TaskCard key={task.id} task={task} compact index={index} onDropHere={(dropIndex) => handleDropOnDay({ preventDefault: () => {} }, date, dropIndex)} />)}</div>
            {dayTasks.length > 0 && <div className="text-[10px] text-stone-400 mt-2 pt-2 border-t border-stone-100">{dayTasks.filter(t => !t.completed).length} of {dayTasks.length} remaining</div>}
          </div>
        );
      })}
    </div>
  );

  const MonthView = () => {
    const currentMonth = selectedDate.getMonth();
    return (
      <div>
        <div className="grid grid-cols-7 gap-1 mb-1">{DAYS_SHORT.map(day => <div key={day} className="text-center text-xs font-medium text-stone-400 py-2">{day}</div>)}</div>
        <div className="grid grid-cols-7 gap-1">
          {monthDates.slice(0, 35).map((date) => {
            const dateKey = formatDateKey(date);
            const dayTasks = getTasksForDate(date);
            const isDateToday = dateKey === todayKey;
            const isCurrentMonth = date.getMonth() === currentMonth;
            const isExpanded = expandedDay === dateKey;
            const incompleteTasks = dayTasks.filter(t => !t.completed);
            
            return (
              <div key={dateKey} className={`border rounded-lg p-2 min-h-[80px] cursor-pointer transition-all ${isDateToday ? 'border-stone-400 bg-stone-50' : 'border-stone-200 hover:border-stone-300'} ${!isCurrentMonth ? 'opacity-40' : ''} ${isExpanded ? 'col-span-2 row-span-2 z-10 shadow-lg bg-white' : ''}`} onClick={() => setExpandedDay(isExpanded ? null : dateKey)} onDragOver={(e) => handleDragOver(e, `month-${dateKey}`)} onDragLeave={handleDragLeave} onDrop={(e) => handleDropOnDay(e, date)}>
                <div className={`text-sm font-medium mb-1 ${isDateToday ? 'text-stone-800' : 'text-stone-600'}`}>{date.getDate()}</div>
                {isExpanded ? (
                  <div className="space-y-1 max-h-48 overflow-auto">
                    {dayTasks.map((task, index) => <TaskCard key={task.id} task={task} compact index={index} onDropHere={(dropIndex) => handleDropOnDay({ preventDefault: () => {} }, date, dropIndex)} />)}
                    {dayTasks.length === 0 && <p className="text-xs text-stone-400">No tasks</p>}
                    <button onClick={(e) => { e.stopPropagation(); onAddTask({ scheduledDate: dateKey }); }} className="text-xs text-stone-400 hover:text-stone-600 flex items-center gap-1 mt-2"><Icons.Plus size={12} /> Add task</button>
                  </div>
                ) : incompleteTasks.length > 0 && <div className="text-xs text-stone-500">{incompleteTasks.length} task{incompleteTasks.length !== 1 ? 's' : ''}</div>}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const getHeaderTitle = () => {
    if (viewMode === 'day') return formatDate(selectedDate);
    if (viewMode === 'week') return `${formatDateShort(weekDates[0])} - ${formatDateShort(weekDates[6])}`;
    return selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="h-full flex flex-col relative">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-2 sm:gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-stone-100 rounded-lg transition-colors"><Icons.ChevronLeft /></button>
          <h2 className="text-lg sm:text-xl font-semibold text-stone-800 min-w-[200px] text-center">{getHeaderTitle()}</h2>
          <button onClick={() => navigate(1)} className="p-2 hover:bg-stone-100 rounded-lg transition-colors"><Icons.ChevronRight /></button>
          <button onClick={() => setSelectedDate(new Date())} className="px-3 py-1.5 text-sm bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors">Today</button>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-stone-100 rounded-lg p-1">
            {['day', 'week', 'month'].map((view) => <button key={view} onClick={() => setViewMode(view)} className={`px-3 py-1.5 rounded-md text-sm capitalize transition-colors ${viewMode === view ? 'bg-white shadow-sm' : ''}`}>{view}</button>)}
          </div>
          {!sidebarOpen && (
            <button onClick={() => setSidebarOpen(true)} className="px-3 py-1.5 text-sm bg-stone-800 hover:bg-stone-700 text-white rounded-lg transition-colors flex items-center gap-1">
              <span>This Week</span>
              <span className="bg-stone-600 px-1.5 rounded text-xs">{thisWeekTasks.filter(t => !t.completed).length}</span>
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-auto pr-2">
          {viewMode === 'day' && <DayView />}
          {viewMode === 'week' && <WeekView />}
          {viewMode === 'month' && <MonthView />}
        </div>
        {sidebarOpen && (
          <div className="relative">
            <button onClick={() => setSidebarOpen(false)} className="absolute -left-3 top-4 z-10 p-1 bg-stone-700 hover:bg-stone-600 text-white rounded-full shadow-sm"><Icons.ChevronRight size={14} /></button>
            <ThisWeekSidebar />
          </div>
        )}
      </div>
    </div>
  );
};

export default Schedule;
