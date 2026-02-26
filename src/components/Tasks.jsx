import React, { useState, useMemo } from 'react';
import { Icons } from './Icons';
import { formatDateShort, formatHour, isPast, formatDateKey } from '../utils';

const Tasks = ({ tasks, goals, categories, onToggleTask, onEditTask, onAddTask, onTaskUpdate }) => {
  const [statusFilter, setStatusFilter] = useState('active');
  const [dateFilter, setDateFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [randomTask, setRandomTask] = useState(null);
  const [showRandomModal, setShowRandomModal] = useState(false);

  const sevenDaysAgo = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date;
  }, []);

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // Auto-hide completed tasks older than 7 days (unless explicitly viewing completed)
      if (task.completed && task.completedAt && statusFilter !== 'completed') {
        if (new Date(task.completedAt) < sevenDaysAgo) return false;
      }
      
      if (statusFilter === 'active' && task.completed) return false;
      if (statusFilter === 'completed' && !task.completed) return false;
      if (dateFilter === 'has-date' && !task.scheduledDate) return false;
      if (dateFilter === 'no-date' && task.scheduledDate) return false;
      if (dateFilter === 'overdue') {
        if (!task.scheduledDate || task.completed) return false;
        if (!isPast(task.scheduledDate)) return false;
      }
      if (categoryFilter !== 'all' && task.categoryId !== categoryFilter) return false;
      return true;
    });
  }, [tasks, statusFilter, dateFilter, categoryFilter, sevenDaysAgo]);

  const sortedTasks = useMemo(() => {
    return [...filteredTasks].sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      const aOverdue = a.scheduledDate && !a.completed && isPast(a.scheduledDate);
      const bOverdue = b.scheduledDate && !b.completed && isPast(b.scheduledDate);
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;
      if (a.scheduledDate && !b.scheduledDate) return -1;
      if (!a.scheduledDate && b.scheduledDate) return 1;
      if (a.scheduledDate && b.scheduledDate) return a.scheduledDate.localeCompare(b.scheduledDate);
      return 0;
    });
  }, [filteredTasks]);

  const stats = useMemo(() => {
    const active = tasks.filter(t => !t.completed).length;
    const completedRecent = tasks.filter(t => t.completed && t.completedAt && new Date(t.completedAt) >= sevenDaysAgo).length;
    const completedOlder = tasks.filter(t => t.completed && (!t.completedAt || new Date(t.completedAt) < sevenDaysAgo)).length;
    const overdue = tasks.filter(t => t.scheduledDate && !t.completed && isPast(t.scheduledDate)).length;
    return { active, completedRecent, completedOlder, overdue };
  }, [tasks, sevenDaysAgo]);

  const incompleteTasks = useMemo(() => tasks.filter(t => !t.completed), [tasks]);

  const pickRandomTask = () => {
    if (incompleteTasks.length === 0) return;
    const randomIndex = Math.floor(Math.random() * incompleteTasks.length);
    setRandomTask(incompleteTasks[randomIndex]);
    setShowRandomModal(true);
  };

  const selectRandomTask = () => {
    if (randomTask && onTaskUpdate) {
      const todayKey = formatDateKey(new Date());
      onTaskUpdate({ ...randomTask, scheduledDate: todayKey, date: todayKey });
    }
    setShowRandomModal(false);
    setRandomTask(null);
  };

  const FilterButton = ({ active, onClick, children, variant = 'default' }) => {
    const baseClasses = 'px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors';
    if (variant === 'category' && active) {
      const cat = categories.find(c => c.id === categoryFilter);
      return <button onClick={onClick} className={`${baseClasses} text-white`} style={{ backgroundColor: cat?.color }}>{children}</button>;
    }
    return <button onClick={onClick} className={`${baseClasses} ${active ? 'bg-stone-800 text-white' : 'bg-stone-100 hover:bg-stone-200 text-stone-600'}`}>{children}</button>;
  };

  // Random Task Modal
  const RandomTaskModal = () => {
    if (!showRandomModal || !randomTask) return null;
    const category = categories.find(c => c.id === randomTask.categoryId);
    const goal = randomTask.goalId ? goals.find(g => g.id === randomTask.goalId) : null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 text-center">
          <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icons.Shuffle size={28} className="text-stone-600" />
          </div>
          <h2 className="text-xl font-bold text-stone-800 mb-2">Your Random Task</h2>
          
          <div className="p-4 bg-stone-50 rounded-xl my-4 text-left">
            <p className="font-medium text-stone-800 text-lg mb-2">{randomTask.title}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: category?.color }}>
                {category?.name}
              </span>
              {goal && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-stone-200 text-stone-600">
                  {goal.title}
                </span>
              )}
              {randomTask.scheduledDate && (
                <span className="text-xs text-stone-400">
                  Scheduled: {formatDateShort(randomTask.scheduledDate)}
                </span>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={pickRandomTask}
              className="flex-1 px-4 py-3 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <Icons.Shuffle size={16} />
              Pick Another
            </button>
            <button
              onClick={selectRandomTask}
              className="flex-1 px-4 py-3 bg-stone-800 text-white hover:bg-stone-700 rounded-xl transition-colors"
            >
              Start This Task
            </button>
          </div>
          
          <button
            onClick={() => { setShowRandomModal(false); setRandomTask(null); }}
            className="mt-3 text-sm text-stone-400 hover:text-stone-600"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-stone-800">Tasks</h2>
          <p className="text-sm text-stone-500">
            {stats.active} active
            {stats.completedRecent > 0 && ` • ${stats.completedRecent} completed`}
            {stats.completedOlder > 0 && ` • ${stats.completedOlder} archived`}
            {stats.overdue > 0 && <span className="text-red-500"> • {stats.overdue} overdue</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={pickRandomTask}
            disabled={incompleteTasks.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Pick a random task"
          >
            <Icons.Shuffle size={18} />
            <span className="hidden sm:inline">Random</span>
          </button>
          <button onClick={() => onAddTask()} className="flex items-center gap-2 px-4 py-2 bg-stone-800 text-white rounded-xl hover:bg-stone-700 transition-colors">
            <Icons.Plus size={18} /><span className="hidden sm:inline">Add Task</span>
          </button>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex gap-2 flex-wrap">
          <span className="text-xs text-stone-400 uppercase tracking-wide py-2 w-16">Status</span>
          <FilterButton active={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>All</FilterButton>
          <FilterButton active={statusFilter === 'active'} onClick={() => setStatusFilter('active')}>Active</FilterButton>
          <FilterButton active={statusFilter === 'completed'} onClick={() => setStatusFilter('completed')}>Completed</FilterButton>
        </div>
        <div className="flex gap-2 flex-wrap">
          <span className="text-xs text-stone-400 uppercase tracking-wide py-2 w-16">Date</span>
          <FilterButton active={dateFilter === 'all'} onClick={() => setDateFilter('all')}>All</FilterButton>
          <FilterButton active={dateFilter === 'has-date'} onClick={() => setDateFilter('has-date')}>Scheduled</FilterButton>
          <FilterButton active={dateFilter === 'no-date'} onClick={() => setDateFilter('no-date')}>Unscheduled</FilterButton>
          <FilterButton active={dateFilter === 'overdue'} onClick={() => setDateFilter('overdue')}>Overdue</FilterButton>
        </div>
        <div className="flex gap-2 flex-wrap">
          <span className="text-xs text-stone-400 uppercase tracking-wide py-2 w-16">Category</span>
          <FilterButton active={categoryFilter === 'all'} onClick={() => setCategoryFilter('all')}>All</FilterButton>
          {categories.map(cat => <FilterButton key={cat.id} active={categoryFilter === cat.id} onClick={() => setCategoryFilter(cat.id)} variant="category">{cat.name}</FilterButton>)}
        </div>
      </div>

      <div className="flex-1 overflow-auto space-y-2">
        {sortedTasks.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-stone-400 mb-2">No tasks match your filters</p>
            <button onClick={() => { setStatusFilter('all'); setDateFilter('all'); setCategoryFilter('all'); }} className="text-sm text-stone-600 hover:text-stone-800 underline">Clear filters</button>
          </div>
        ) : sortedTasks.map(task => {
          const category = categories.find(c => c.id === task.categoryId);
          const goal = task.goalId ? goals.find(g => g.id === task.goalId) : null;
          const isOverdue = task.scheduledDate && !task.completed && isPast(task.scheduledDate);
          const hasTime = task.startHour !== null && task.startHour !== undefined;

          return (
            <div key={task.id} className={`p-4 bg-white rounded-xl border transition-colors flex items-start gap-3 ${isOverdue ? 'border-red-200 bg-red-50' : 'border-stone-100 hover:border-stone-200'} ${task.completed ? 'opacity-60' : ''}`}>
              <button onClick={() => onToggleTask(task.id)} className={`w-5 h-5 mt-0.5 rounded-md border-2 flex-none flex items-center justify-center transition-colors ${task.completed ? 'bg-stone-800 border-stone-800 text-white' : 'border-stone-300 hover:border-stone-400'}`}>
                {task.completed && <Icons.Check size={12} />}
              </button>
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onEditTask(task)}>
                <div className={`font-medium ${task.completed ? 'line-through text-stone-400' : 'text-stone-800'}`}>
                  {task.title}
                  {hasTime && <span className="text-stone-400 font-normal ml-1 text-sm">({formatHour(task.startHour)}{task.duration ? `, ${task.duration}hr` : ''})</span>}
                </div>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="text-xs px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: category?.color }}>{category?.name}</span>
                  {goal && <span className="text-xs px-2 py-0.5 rounded-full bg-stone-200 text-stone-600 flex items-center gap-1"><Icons.Link size={10} />{goal.title}</span>}
                  {task.scheduledDate && <span className={`text-xs flex items-center gap-1 ${isOverdue ? 'text-red-600 font-medium' : 'text-stone-400'}`}>{formatDateShort(task.scheduledDate)}{isOverdue && ' (overdue)'}</span>}
                  {task.completed && task.completedAt && <span className="text-xs text-stone-400">Completed {formatDateShort(task.completedAt)}</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <RandomTaskModal />
    </div>
  );
};

export default Tasks;
