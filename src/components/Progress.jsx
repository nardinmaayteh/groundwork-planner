import React, { useState, useMemo, useEffect } from 'react';
import { Icons } from './Icons';
import Modal from './Modal';
import { DAYS_SHORT, CATEGORY_COLORS } from '../constants';
import { formatDateShort, getWeekStart, formatDate, formatDateKey, parseLocalDate } from '../utils';

/**
 * Progress View - Stats, Habits, Mind Map, Milestones, Check-ins, Rewards
 */
const Progress = ({
  tasks,
  goals,
  milestones,
  checkIns,
  rewards,
  habits,
  habitLogs,
  categories,
  pendingRewards,
  weeklyBannerDismissed,
  monthlyBannerDismissed,
  onDismissWeeklyBanner,
  onDismissMonthlyBanner,
  onAddMilestone,
  onEditMilestone,
  onEditGoal,
  onEditTask,
  onAddGoal,
  onOpenCheckIn,
  onSaveReward,
  onDeleteReward,
  onClaimReward,
  onSaveHabit,
  onDeleteHabit,
  onToggleHabitLog,
  onAddPendingReward,
  onClaimPendingReward,
  onSaveCategory,
  onDeleteCategory,
}) => {
  const [viewMode, setViewMode] = useState('stats');
  const [expandedMilestones, setExpandedMilestones] = useState({});
  const [expandedGoals, setExpandedGoals] = useState({});
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [showPastCheckIns, setShowPastCheckIns] = useState(false);
  const [showHabitModal, setShowHabitModal] = useState(false);
  const [showHabitDetail, setShowHabitDetail] = useState(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [newCategory, setNewCategory] = useState({ name: '', color: CATEGORY_COLORS[0] });
  const [newReward, setNewReward] = useState('');
  const [newHabit, setNewHabit] = useState({ name: '', frequency: 3 });
  const [editingHabit, setEditingHabit] = useState(null);
  const [celebration, setCelebration] = useState(null);

  const todayKey = formatDateKey(new Date());

  // Calculate stats
  const stats = useMemo(() => {
    if (!tasks || !goals || !milestones) return { tasksThisWeek: 0, completedThisWeek: 0, goalsInProgress: 0, activeMilestones: 0 };
    const weekStart = getWeekStart(new Date());
    const tasksThisWeek = tasks.filter(t => {
      if (!t.scheduledDate) return false;
      return new Date(t.scheduledDate) >= weekStart;
    });
    const completedThisWeek = tasks.filter(t => {
      if (!t.completed || !t.completedAt) return false;
      return new Date(t.completedAt) >= weekStart;
    });
    const goalsInProgress = goals.filter(g => 
      g.column === 'Ongoing' || g.column === 'Complete This Week'
    ).length;
    const activeMilestones = milestones.length;

    return {
      tasksThisWeek: tasksThisWeek.length,
      completedThisWeek: completedThisWeek.length,
      goalsInProgress,
      activeMilestones,
    };
  }, [tasks, goals, milestones]);

  // Tasks by category
  const tasksByCategory = useMemo(() => {
    if (!categories || categories.length === 0 || !tasks) return [];
    return categories.map(cat => {
      const catTasks = tasks.filter(t => t.categoryId === cat.id);
      const completed = catTasks.filter(t => t.completed).length;
      return { ...cat, total: catTasks.length, completed };
    }).filter(cat => cat.total > 0);
  }, [tasks, categories]);

  // Check-in status - weekly shows from Sunday until done, monthly shows from 1st until done
  const checkInStatus = useMemo(() => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday
    const weekStart = getWeekStart(now);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const safeCheckIns = checkIns || [];
    const weeklyCheckIns = safeCheckIns.filter(c => c.type === 'weekly');
    const monthlyCheckIns = safeCheckIns.filter(c => c.type === 'monthly');

    const lastWeekly = weeklyCheckIns[0];
    const lastMonthly = monthlyCheckIns[0];

    const weeklyDone = lastWeekly && new Date(lastWeekly.date) >= weekStart;
    const monthlyDone = lastMonthly && new Date(lastMonthly.date) >= monthStart;

    // Weekly: Show from Sunday (dayOfWeek === 0) onwards until completed
    const showWeeklyBanner = dayOfWeek === 0 && !weeklyDone && !weeklyBannerDismissed;
    // Monthly: Show every day of the month until completed  
    const showMonthlyBanner = !monthlyDone && !monthlyBannerDismissed;

    return {
      weeklyDone, monthlyDone, showWeeklyBanner, showMonthlyBanner,
      lastWeekly, lastMonthly, weeklyCheckIns, monthlyCheckIns,
    };
  }, [checkIns, weeklyBannerDismissed, monthlyBannerDismissed]);

  // Habit helpers
  const getWeeksForHabit = (weeksBack = 8) => {
    const weeks = [];
    const today = new Date();
    for (let i = 0; i < weeksBack; i++) {
      const weekStart = getWeekStart(new Date(today.getTime() - i * 7 * 24 * 60 * 60 * 1000));
      const days = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + d);
        days.push(formatDateKey(date));
      }
      weeks.push({ start: weekStart, days });
    }
    return weeks;
  };

  const getHabitLogsForWeek = (habitId, weekDays) => {
    return weekDays.filter(day => 
      habitLogs?.some(log => log.habitId === habitId && log.date === day)
    ).length;
  };

  const isHabitLoggedForDay = (habitId, date) => {
    return habitLogs?.some(log => log.habitId === habitId && log.date === date);
  };

  const getCurrentWeekProgress = (habitId) => {
    const weekStart = getWeekStart(new Date());
    const days = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + d);
      days.push(formatDateKey(date));
    }
    return getHabitLogsForWeek(habitId, days);
  };

  const getWeeksGoalMet = (habitId, frequency) => {
    const weeks = getWeeksForHabit(5); // Check last 5 weeks
    let weeksMetGoal = 0;
    weeks.slice(1).forEach(week => { // Skip current week
      const completed = getHabitLogsForWeek(habitId, week.days);
      if (completed >= frequency) weeksMetGoal++;
    });
    return weeksMetGoal;
  };

  const handleToggleHabit = (habitId, date) => {
    const isLogged = isHabitLoggedForDay(habitId, date);
    onToggleHabitLog(habitId, date, !isLogged);

    // Check if this triggers a reward (4 weeks goal met)
    if (!isLogged) {
      const habit = habits?.find(h => h.id === habitId);
      if (habit) {
        const weeksMetBefore = getWeeksGoalMet(habitId, habit.frequency);
        // After this log, check current week
        const weekStart = getWeekStart(new Date());
        const days = [];
        for (let d = 0; d < 7; d++) {
          const dt = new Date(weekStart);
          dt.setDate(weekStart.getDate() + d);
          days.push(formatDateKey(dt));
        }
        const currentWeekCompleted = getHabitLogsForWeek(habitId, days) + 1;
        if (currentWeekCompleted >= habit.frequency && weeksMetBefore === 3) {
          // This completes 4th week!
          setCelebration({ type: 'habit', title: habit.name });
          onAddPendingReward?.();
        }
      }
    }
  };

  const handleSaveHabit = () => {
    if (newHabit.name.trim()) {
      onSaveHabit({ ...newHabit, id: editingHabit?.id });
      setNewHabit({ name: '', frequency: 3 });
      setEditingHabit(null);
      setShowHabitModal(false);
    }
  };

  const handleEditHabit = (habit) => {
    setEditingHabit(habit);
    setNewHabit({ name: habit.name, frequency: habit.frequency });
    setShowHabitModal(true);
  };

  // Other helpers
  const getTasksForGoal = (goalId) => tasks.filter(t => t.goalId === goalId);
  const getGoalsForMilestone = (milestoneId) => goals.filter(g => g.milestoneId === milestoneId);

  const getMilestoneProgress = (milestoneId) => {
    const mGoals = getGoalsForMilestone(milestoneId);
    let totalTasks = 0;
    let completedTasks = 0;
    mGoals.forEach(goal => {
      const gTasks = getTasksForGoal(goal.id);
      totalTasks += gTasks.length;
      completedTasks += gTasks.filter(t => t.completed).length;
    });
    if (totalTasks === 0) return { percent: 0, completed: 0, total: 0 };
    return { percent: Math.round((completedTasks / totalTasks) * 100), completed: completedTasks, total: totalTasks };
  };

  const toggleMilestone = (id) => setExpandedMilestones(prev => ({ ...prev, [id]: !prev[id] }));
  const toggleGoal = (id) => setExpandedGoals(prev => ({ ...prev, [id]: !prev[id] }));

  const handleAddReward = () => {
    if (newReward.trim()) {
      onSaveReward({ id: Date.now().toString(), text: newReward, claimed: false });
      setNewReward('');
    }
  };

  // Celebration component
  const Celebration = ({ data, onClose }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 text-center animate-celebrate">
        <div className="text-6xl mb-4">{data.type === 'habit' ? '🔥' : '🎉'}</div>
        <h2 className="text-2xl font-bold text-stone-800 mb-2">
          {data.type === 'habit' ? '4 Week Streak!' : 'Goal Complete!'}
        </h2>
        <p className="text-stone-600 mb-6">"{data.title}"</p>
        
        {rewards && rewards.filter(r => !r.claimed).length > 0 ? (
          <>
            <p className="text-stone-600 mb-4">You earned a reward! Pick one:</p>
            <div className="flex flex-wrap gap-2 justify-center mb-6">
              {rewards.filter(r => !r.claimed).map(reward => (
                <button
                  key={reward.id}
                  onClick={() => { onClaimReward(reward.id); onClose(); }}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors"
                >
                  {reward.text}
                </button>
              ))}
            </div>
          </>
        ) : (
          <p className="text-stone-500 mb-6">Add some rewards to celebrate next time!</p>
        )}
        
        <button onClick={onClose} className="px-6 py-2 text-stone-600 hover:text-stone-800">
          {rewards && rewards.filter(r => !r.claimed).length > 0 ? 'Skip for now' : 'Continue'}
        </button>
      </div>
    </div>
  );

  // Habit Detail Modal
  const HabitDetailModal = ({ habit, onClose }) => {
    const weeks = getWeeksForHabit(8);
    
    return (
      <Modal isOpen={!!habit} onClose={onClose} title={habit?.name} size="md">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-stone-600">Goal: {habit?.frequency}x per week</span>
            <span className="text-stone-600">
              This week: {getCurrentWeekProgress(habit?.id)}/{habit?.frequency}
              {getCurrentWeekProgress(habit?.id) >= habit?.frequency && ' ✓'}
            </span>
          </div>
          
          <div className="max-h-80 overflow-auto space-y-4">
            {weeks.map((week, idx) => {
              const completed = getHabitLogsForWeek(habit?.id, week.days);
              const goalMet = completed >= habit?.frequency;
              
              return (
                <div key={idx} className={`p-3 rounded-lg ${idx === 0 ? 'bg-stone-100' : 'bg-stone-50'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-stone-700">
                      {idx === 0 ? 'This Week' : formatDateShort(week.start)}
                    </span>
                    <span className={`text-sm ${goalMet ? 'text-emerald-600 font-medium' : 'text-stone-400'}`}>
                      {completed}/{habit?.frequency}{goalMet && ' ✓'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {week.days.map((day, dayIdx) => {
                      const isLogged = isHabitLoggedForDay(habit?.id, day);
                      const dayDate = parseLocalDate(day);
                      const today = new Date();
                      today.setHours(23, 59, 59, 999);
                      const canToggle = dayDate <= today;
                      
                      return (
                        <button
                          key={day}
                          onClick={() => canToggle && handleToggleHabit(habit?.id, day)}
                          disabled={!canToggle}
                          className="flex-1 flex flex-col items-center gap-1"
                        >
                          <span className="text-[10px] text-stone-400">{DAYS_SHORT[dayIdx]}</span>
                          <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors ${
                            isLogged 
                              ? 'bg-stone-800 border-stone-800 text-white cursor-pointer' 
                              : canToggle 
                                ? 'border-stone-300 hover:border-stone-400 cursor-pointer' 
                                : 'border-stone-200 opacity-50'
                          }`}>
                            {isLogged && <Icons.Check size={14} />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="flex gap-3 pt-4 border-t border-stone-100">
            <button
              onClick={() => handleEditHabit(habit)}
              className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-xl"
            >
              Edit
            </button>
            <button
              onClick={() => { onDeleteHabit(habit.id); onClose(); }}
              className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-xl"
            >
              Delete
            </button>
            <div className="flex-1" />
            <button onClick={onClose} className="px-4 py-2 bg-stone-800 text-white rounded-xl hover:bg-stone-700">
              Done
            </button>
          </div>
        </div>
      </Modal>
    );
  };

  // Past Check-ins Modal
  const PastCheckInsModal = () => (
    <Modal isOpen={showPastCheckIns} onClose={() => setShowPastCheckIns(false)} title="Past Check-ins" size="lg">
      <div className="space-y-6">
        <div>
          <h3 className="font-semibold text-stone-800 mb-3">Weekly Check-ins</h3>
          {checkInStatus.weeklyCheckIns.length === 0 ? (
            <p className="text-stone-400 text-sm">No weekly check-ins yet</p>
          ) : (
            <div className="space-y-3">
              {checkInStatus.weeklyCheckIns.slice(0, 10).map((checkIn, idx) => (
                <div key={idx} className="p-4 bg-stone-50 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-stone-800">{formatDate(checkIn.date)}</span>
                    <span className="text-2xl">
                      {checkIn.rating === 1 ? '😔' : checkIn.rating === 2 ? '😕' : checkIn.rating === 3 ? '😐' : checkIn.rating === 4 ? '🙂' : '😊'}
                    </span>
                  </div>
                  {checkIn.wins && <p className="text-sm text-stone-600"><strong>Wins:</strong> {checkIn.wins}</p>}
                  {checkIn.wentWell && <p className="text-sm text-stone-600"><strong>Went well:</strong> {checkIn.wentWell}</p>}
                  {checkIn.obstacles && <p className="text-sm text-stone-600"><strong>Obstacles:</strong> {checkIn.obstacles}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="font-semibold text-stone-800 mb-3">Monthly Check-ins</h3>
          {checkInStatus.monthlyCheckIns.length === 0 ? (
            <p className="text-stone-400 text-sm">No monthly check-ins yet</p>
          ) : (
            <div className="space-y-3">
              {checkInStatus.monthlyCheckIns.slice(0, 10).map((checkIn, idx) => (
                <div key={idx} className="p-4 bg-stone-50 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-stone-800">{formatDate(checkIn.date)}</span>
                    <span className="text-2xl">
                      {checkIn.rating === 1 ? '😔' : checkIn.rating === 2 ? '😕' : checkIn.rating === 3 ? '😐' : checkIn.rating === 4 ? '🙂' : '😊'}
                    </span>
                  </div>
                  {checkIn.wins && <p className="text-sm text-stone-600"><strong>Wins:</strong> {checkIn.wins}</p>}
                  {checkIn.makeTimeFor && <p className="text-sm text-stone-600"><strong>Make time for:</strong> {checkIn.makeTimeFor}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );

  // Add/Edit Habit Modal
  const HabitModal = () => (
    <Modal isOpen={showHabitModal} onClose={() => { setShowHabitModal(false); setEditingHabit(null); setNewHabit({ name: '', frequency: 3 }); }} title={editingHabit ? 'Edit Habit' : 'New Habit'} size="sm">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-stone-600 mb-2">Habit Name</label>
          <input
            type="text"
            value={newHabit.name}
            onChange={(e) => setNewHabit(h => ({ ...h, name: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:border-stone-400 outline-none"
            placeholder="e.g., Exercise, Read, Meditate"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-600 mb-2">Frequency (times per week)</label>
          <div className="flex items-center gap-3">
            {[1, 2, 3, 4, 5, 6, 7].map(n => (
              <button
                key={n}
                onClick={() => setNewHabit(h => ({ ...h, frequency: n }))}
                className={`w-10 h-10 rounded-full font-medium transition-colors ${
                  newHabit.frequency === n 
                    ? 'bg-stone-800 text-white' 
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-3 pt-4">
          <button onClick={() => { setShowHabitModal(false); setEditingHabit(null); }} className="flex-1 px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-xl">Cancel</button>
          <button onClick={handleSaveHabit} disabled={!newHabit.name.trim()} className="flex-1 px-4 py-2 bg-stone-800 text-white rounded-xl hover:bg-stone-700 disabled:opacity-50">Save</button>
        </div>
      </div>
    </Modal>
  );

  return (
    <div className="h-full overflow-auto space-y-6">
      {/* Check-in Banners */}
      {checkInStatus.showWeeklyBanner && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="font-medium text-amber-800">Weekly check-in time!</p>
            <p className="text-sm text-amber-600">Take a moment to reflect on your week</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onDismissWeeklyBanner} className="px-3 py-2 text-amber-600 hover:bg-amber-100 rounded-xl transition-colors text-sm">
              Later
            </button>
            <button onClick={() => onOpenCheckIn('weekly')} className="px-4 py-2 bg-amber-600 text-white rounded-xl hover:bg-amber-500 transition-colors">
              Start Check-in
            </button>
          </div>
        </div>
      )}

      {checkInStatus.showMonthlyBanner && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="font-medium text-purple-800">Monthly check-in time!</p>
            <p className="text-sm text-purple-600">Review your month and plan ahead</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onDismissMonthlyBanner} className="px-3 py-2 text-purple-600 hover:bg-purple-100 rounded-xl transition-colors text-sm">
              Later
            </button>
            <button onClick={() => onOpenCheckIn('monthly')} className="px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-500 transition-colors">
              Start Check-in
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-stone-800">Progress</h2>
        <div className="flex items-center gap-1 bg-stone-100 rounded-lg p-1">
          <button onClick={() => setViewMode('stats')} className={`px-3 py-1.5 rounded-md text-sm transition-colors ${viewMode === 'stats' ? 'bg-white shadow-sm' : ''}`}>Stats</button>
          <button onClick={() => setViewMode('mindmap')} className={`px-3 py-1.5 rounded-md text-sm transition-colors ${viewMode === 'mindmap' ? 'bg-white shadow-sm' : ''}`}>Mind Map</button>
        </div>
      </div>

      {viewMode === 'stats' ? (
        <>
          {/* Key Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl border border-stone-200 p-4">
              <div className="text-2xl font-bold text-stone-800">{stats.tasksThisWeek}</div>
              <div className="text-xs text-stone-500">Tasks This Week</div>
            </div>
            <div className="bg-white rounded-xl border border-stone-200 p-4">
              <div className="text-2xl font-bold text-stone-800">{stats.completedThisWeek}</div>
              <div className="text-xs text-stone-500">Completed</div>
            </div>
            <div className="bg-white rounded-xl border border-stone-200 p-4">
              <div className="text-2xl font-bold text-stone-800">{stats.goalsInProgress}</div>
              <div className="text-xs text-stone-500">Goals In Progress</div>
            </div>
            <div className="bg-white rounded-xl border border-stone-200 p-4">
              <div className="text-2xl font-bold text-stone-800">{stats.activeMilestones}</div>
              <div className="text-xs text-stone-500">Milestones</div>
            </div>
          </div>

          {/* Habits */}
          <div className="bg-white rounded-xl border border-stone-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-stone-800">Habits</h3>
              <button onClick={() => setShowHabitModal(true)} className="flex items-center gap-1 px-3 py-1.5 text-sm bg-stone-100 hover:bg-stone-200 rounded-lg">
                <Icons.Plus size={14} /> Add
              </button>
            </div>
            
            {!habits || habits.length === 0 ? (
              <p className="text-stone-400 text-sm text-center py-4">Add habits to track your daily routines</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {habits.map(habit => {
                  const progress = getCurrentWeekProgress(habit.id);
                  const goalMet = progress >= habit.frequency;
                  const isLoggedToday = isHabitLoggedForDay(habit.id, todayKey);
                  
                  return (
                    <div
                      key={habit.id}
                      className="p-3 bg-stone-50 rounded-xl hover:bg-stone-100 transition-colors"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleToggleHabit(habit.id, todayKey); }}
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                            isLoggedToday 
                              ? 'bg-stone-800 border-stone-800 text-white' 
                              : 'border-stone-300 hover:border-stone-500'
                          }`}
                        >
                          {isLoggedToday && <Icons.Check size={12} />}
                        </button>
                        <button 
                          onClick={() => setShowHabitDetail(habit)}
                          className="flex-1 text-left font-medium text-stone-700 text-sm truncate hover:text-stone-900"
                        >
                          {habit.name}
                        </button>
                      </div>
                      <button 
                        onClick={() => setShowHabitDetail(habit)}
                        className="w-full text-left"
                      >
                        <span className={`text-xs ${goalMet ? 'text-emerald-600 font-medium' : 'text-stone-400'}`}>
                          {progress}/{habit.frequency}{goalMet && ' ✓'}
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Manage Categories */}
          <div className="bg-white rounded-xl border border-stone-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-stone-800">Categories</h3>
              <button onClick={() => { setEditingCategory(null); setNewCategory({ name: '', color: CATEGORY_COLORS[0] }); setShowCategoryModal(true); }} className="flex items-center gap-1 px-3 py-1.5 text-sm bg-stone-100 hover:bg-stone-200 rounded-lg">
                <Icons.Plus size={14} /> Add
              </button>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {categories && categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => { setEditingCategory(cat); setNewCategory({ name: cat.name, color: cat.color }); setShowCategoryModal(true); }}
                  className="flex items-center gap-2 px-3 py-1.5 bg-stone-50 hover:bg-stone-100 rounded-lg transition-colors"
                >
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                  <span className="text-sm text-stone-700">{cat.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Actions by Category */}
          {tasksByCategory.length > 0 && (
            <div className="bg-white rounded-xl border border-stone-200 p-5">
              <h3 className="font-semibold text-stone-800 mb-4">Actions by Category</h3>
              <div className="space-y-3">
                {tasksByCategory.map(cat => (
                  <div key={cat.id}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-stone-600">{cat.name}</span>
                      <span className="text-stone-800 font-medium">
                        {cat.completed}/{cat.total} completed
                        {cat.completed === cat.total && cat.total > 0 && ' ✓'}
                      </span>
                    </div>
                    <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${cat.total > 0 ? (cat.completed / cat.total) * 100 : 0}%`, backgroundColor: cat.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Check-ins */}
          <div className="bg-white rounded-xl border border-stone-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-stone-800">Check-ins</h3>
              <button onClick={() => setShowPastCheckIns(true)} className="text-sm text-stone-500 hover:text-stone-700 flex items-center gap-1">
                <Icons.FileText size={14} /> View past check-ins
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => onOpenCheckIn('weekly')}
                className={`p-4 rounded-xl border text-left transition-colors ${checkInStatus.weeklyDone ? 'bg-emerald-50 border-emerald-200' : 'bg-stone-50 border-stone-200 hover:border-stone-300'}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-stone-800">Weekly</span>
                  {checkInStatus.weeklyDone && <span className="text-emerald-600">✓</span>}
                </div>
                <p className="text-xs text-stone-500">{checkInStatus.weeklyDone ? 'Completed this week' : 'Reflect on your week'}</p>
              </button>
              <button
                onClick={() => onOpenCheckIn('monthly')}
                className={`p-4 rounded-xl border text-left transition-colors ${checkInStatus.monthlyDone ? 'bg-emerald-50 border-emerald-200' : 'bg-stone-50 border-stone-200 hover:border-stone-300'}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-stone-800">Monthly</span>
                  {checkInStatus.monthlyDone && <span className="text-emerald-600">✓</span>}
                </div>
                <p className="text-xs text-stone-500">{checkInStatus.monthlyDone ? 'Completed this month' : 'Review the month'}</p>
              </button>
            </div>
          </div>

          {/* Rewards */}
          <div className="bg-white rounded-xl border border-stone-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-stone-800 flex items-center gap-2">
                <Icons.Gift size={18} />
                Rewards
                {(pendingRewards || 0) > 0 && (
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                    {pendingRewards} to claim
                  </span>
                )}
              </h3>
              <button onClick={() => setShowRewardModal(true)} className="text-sm text-stone-500 hover:text-stone-700">Manage</button>
            </div>
            {!rewards || rewards.length === 0 ? (
              <p className="text-stone-400 text-sm">Add rewards to motivate yourself when you complete goals!</p>
            ) : (
              <div className="space-y-3">
                {(pendingRewards || 0) > 0 && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                    <p className="text-sm text-amber-800 mb-2">You have {pendingRewards} reward{pendingRewards > 1 ? 's' : ''} to claim!</p>
                    <div className="flex flex-wrap gap-2">
                      {rewards.filter(r => !r.claimed).map(reward => (
                        <button
                          key={reward.id}
                          onClick={() => { onClaimReward(reward.id); onClaimPendingReward?.(); }}
                          className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 rounded-full text-sm text-amber-800 transition-colors"
                        >
                          {reward.text}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {rewards.filter(r => !r.claimed).map(reward => (
                    <span key={reward.id} className="px-3 py-1.5 bg-stone-100 rounded-full text-sm text-stone-700">{reward.text}</span>
                  ))}
                  {rewards.filter(r => r.claimed).length > 0 && (
                    <span className="px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-sm">
                      {rewards.filter(r => r.claimed).length} claimed
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Milestones */}
          <div className="bg-white rounded-xl border border-stone-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-stone-800">Milestones</h3>
              <button onClick={onAddMilestone} className="flex items-center gap-1 px-3 py-1.5 text-sm bg-stone-100 hover:bg-stone-200 rounded-lg">
                <Icons.Plus size={14} /> Add
              </button>
            </div>

            {milestones.length === 0 ? (
              <div className="text-center py-8 text-stone-400">
                <p>No milestones yet</p>
                <p className="text-sm">Milestones are big achievements to work toward</p>
              </div>
            ) : (
              <div className="space-y-4">
                {milestones.map(milestone => {
                  const category = categories.find(c => c.id === milestone.categoryId);
                  const progress = getMilestoneProgress(milestone.id);
                  const mGoals = getGoalsForMilestone(milestone.id);
                  const recentTasks = tasks
                    .filter(t => t.completed && mGoals.some(g => g.id === t.goalId))
                    .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
                    .slice(0, 3);

                  return (
                    <div key={milestone.id} className="p-4 bg-stone-50 rounded-xl cursor-pointer hover:bg-stone-100 transition-colors" onClick={() => onEditMilestone(milestone)}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category?.color }} />
                          <span className="font-medium text-stone-800">{milestone.title}</span>
                        </div>
                        <span className="text-lg font-bold text-stone-800">{progress.percent}%</span>
                      </div>
                      
                      <div className="h-2 bg-stone-200 rounded-full overflow-hidden mb-3">
                        <div className="h-full rounded-full transition-all" style={{ width: `${progress.percent}%`, backgroundColor: category?.color }} />
                      </div>

                      <div className="flex items-center justify-between text-sm text-stone-500">
                        <span>{mGoals.length} goals • {progress.completed}/{progress.total} tasks</span>
                        {milestone.deadline && <span>Due: {formatDateShort(milestone.deadline)}</span>}
                      </div>

                      {recentTasks.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-stone-200">
                          <p className="text-xs text-stone-400 mb-2">Recent progress:</p>
                          {recentTasks.map(task => (
                            <div key={task.id} className="text-xs text-stone-600 flex items-center gap-2">
                              <span className="text-emerald-600">✓</span>
                              {task.title}
                              <span className="text-stone-400">({formatDateShort(task.completedAt)})</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      ) : (
        /* Mind Map View */
        <div className="space-y-4">
          <div className="flex gap-2">
            <button onClick={onAddMilestone} className="px-3 py-2 bg-stone-800 text-white rounded-xl text-sm hover:bg-stone-700">+ Milestone</button>
            <button onClick={onAddGoal} className="px-3 py-2 bg-stone-100 text-stone-800 rounded-xl text-sm hover:bg-stone-200">+ Goal</button>
          </div>

          <div className="bg-stone-100 rounded-xl border border-stone-200 p-8 min-h-[600px] overflow-auto">
            {milestones.length === 0 ? (
              <div className="h-full flex items-center justify-center text-stone-400">
                <div className="text-center">
                  <Icons.Target size={48} className="mx-auto mb-4 opacity-50" />
                  <p>Add a milestone to see your progress map</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-8 justify-center">
                {milestones.map(milestone => {
                  const category = categories.find(c => c.id === milestone.categoryId);
                  const mGoals = getGoalsForMilestone(milestone.id);
                  const progress = getMilestoneProgress(milestone.id);
                  const isExpanded = expandedMilestones[milestone.id] === true;

                  return (
                    <div key={milestone.id} className="flex flex-col items-center">
                      <div onClick={() => toggleMilestone(milestone.id)} className="relative cursor-pointer group">
                        <div className="w-28 h-28 rounded-full flex flex-col items-center justify-center text-white shadow-xl transition-transform hover:scale-105 border-4 border-white" style={{ backgroundColor: category?.color }}>
                          <span className="text-2xl font-bold">{progress.percent}%</span>
                          <span className="text-xs opacity-90">{progress.completed}/{progress.total}</span>
                        </div>
                        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-white px-3 py-1 rounded-full shadow-md text-xs font-medium text-stone-700 whitespace-nowrap">{milestone.title}</div>
                        <div className={`absolute -right-1 -top-1 w-6 h-6 rounded-full bg-white shadow flex items-center justify-center transition-transform ${isExpanded ? 'rotate-45' : ''}`}>
                          <Icons.Plus size={14} />
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="mt-8 relative">
                          <div className="absolute top-0 left-1/2 w-0.5 h-8 -mt-8 bg-stone-300" />
                          {mGoals.length === 0 ? (
                            <div className="text-center text-stone-400 text-sm p-4 bg-white rounded-xl">No goals linked to this milestone</div>
                          ) : (
                            <div className="flex gap-6 justify-center flex-wrap">
                              {mGoals.map(goal => {
                                const gTasks = getTasksForGoal(goal.id);
                                const completedTasks = gTasks.filter(t => t.completed).length;
                                const isGoalDone = goal.column === 'Done';
                                const isGoalExpanded = expandedGoals[goal.id] === true;
                                const goalProgress = gTasks.length > 0 ? Math.round((completedTasks / gTasks.length) * 100) : 0;

                                return (
                                  <div key={goal.id} className="flex flex-col items-center">
                                    <div className="w-0.5 h-4 bg-stone-300" />
                                    <div onClick={(e) => { e.stopPropagation(); toggleGoal(goal.id); }} className="relative cursor-pointer">
                                      <div className={`w-20 h-20 rounded-full flex flex-col items-center justify-center shadow-lg transition-transform hover:scale-105 border-3 ${isGoalDone ? 'bg-emerald-500 text-white border-emerald-300' : 'bg-white text-stone-700 border-stone-200'}`}>
                                        {isGoalDone ? <Icons.Check size={24} /> : <><span className="text-sm font-bold">{goalProgress}%</span><span className="text-[10px] text-stone-400">{completedTasks}/{gTasks.length}</span></>}
                                      </div>
                                      <div className="mt-2 text-center max-w-24">
                                        <p className={`text-xs font-medium ${isGoalDone ? 'text-stone-400 line-through' : 'text-stone-700'}`}>{goal.title}</p>
                                        <p className="text-[10px] text-stone-400">{goal.column}</p>
                                      </div>
                                    </div>

                                    {isGoalExpanded && gTasks.length > 0 && (
                                      <div className="mt-4">
                                        <div className="w-0.5 h-4 bg-stone-300 mx-auto" />
                                        <div className="bg-white rounded-xl shadow-md p-3 max-w-48">
                                          <p className="text-[10px] text-stone-400 uppercase tracking-wide mb-2">Tasks</p>
                                          <div className="space-y-1.5">
                                            {gTasks.map(task => (
                                              <div key={task.id} onClick={(e) => { e.stopPropagation(); onEditTask(task); }} className="flex items-center gap-2 p-1.5 rounded hover:bg-stone-50 cursor-pointer">
                                                <div className={`w-3 h-3 rounded-full flex items-center justify-center ${task.completed ? 'bg-emerald-500' : 'border-2 border-stone-300'}`}>
                                                  {task.completed && <Icons.Check size={8} className="text-white" />}
                                                </div>
                                                <span className={`text-xs ${task.completed ? 'text-stone-400 line-through' : 'text-stone-600'}`}>{task.title}</span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {goals.filter(g => !g.milestoneId).length > 0 && (
            <div className="bg-white rounded-xl border border-stone-200 p-5">
              <h3 className="font-semibold text-stone-700 mb-4">Standalone Goals (not linked to milestones)</h3>
              <div className="flex flex-wrap gap-4">
                {goals.filter(g => !g.milestoneId).map(goal => {
                  const category = categories.find(c => c.id === goal.categoryId);
                  const gTasks = getTasksForGoal(goal.id);
                  const completedTasks = gTasks.filter(t => t.completed).length;
                  const isGoalDone = goal.column === 'Done';

                  return (
                    <div key={goal.id} onClick={() => onEditGoal(goal)} className="flex flex-col items-center cursor-pointer group">
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center shadow-md transition-transform group-hover:scale-105 ${isGoalDone ? 'bg-emerald-500 text-white' : 'bg-white border-2'}`} style={{ borderColor: isGoalDone ? undefined : category?.color }}>
                        {isGoalDone ? <Icons.Check size={20} /> : <span className="text-sm font-bold" style={{ color: category?.color }}>{gTasks.length > 0 ? `${completedTasks}/${gTasks.length}` : '0'}</span>}
                      </div>
                      <p className={`mt-2 text-xs text-center max-w-20 ${isGoalDone ? 'text-stone-400 line-through' : 'text-stone-600'}`}>{goal.title}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <Modal isOpen={showRewardModal} onClose={() => setShowRewardModal(false)} title="Manage Rewards" size="md">
        <div className="space-y-4">
          <div className="flex gap-2">
            <input type="text" value={newReward} onChange={(e) => setNewReward(e.target.value)} placeholder="Add a new reward..." className="flex-1 px-4 py-2 rounded-xl border border-stone-200 outline-none" onKeyPress={(e) => e.key === 'Enter' && handleAddReward()} />
            <button onClick={handleAddReward} className="px-4 py-2 bg-stone-800 text-white rounded-xl hover:bg-stone-700">Add</button>
          </div>
          <div className="space-y-2">
            {rewards?.map(reward => (
              <div key={reward.id} className="flex items-center justify-between p-3 bg-stone-50 rounded-xl">
                <span className={reward.claimed ? 'text-stone-400 line-through' : 'text-stone-700'}>{reward.text}</span>
                <button onClick={() => onDeleteReward(reward.id)} className="text-stone-400 hover:text-red-500"><Icons.Trash size={14} /></button>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* Category Modal */}
      <Modal isOpen={showCategoryModal} onClose={() => { setShowCategoryModal(false); setEditingCategory(null); setNewCategory({ name: '', color: CATEGORY_COLORS[0] }); }} title={editingCategory ? 'Edit Category' : 'New Category'} size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-600 mb-2">Category Name</label>
            <input
              type="text"
              value={newCategory.name}
              onChange={(e) => setNewCategory(c => ({ ...c, name: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:border-stone-400 outline-none"
              placeholder="e.g., Work, Personal, Health"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-600 mb-2">Color</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => setNewCategory(c => ({ ...c, color }))}
                  className={`w-8 h-8 rounded-full transition-transform ${newCategory.color === color ? 'ring-2 ring-offset-2 ring-stone-400 scale-110' : 'hover:scale-110'}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            {editingCategory && (
              <button 
                onClick={() => { onDeleteCategory(editingCategory.id); setShowCategoryModal(false); setEditingCategory(null); }} 
                className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-xl"
              >
                Delete
              </button>
            )}
            <div className="flex-1" />
            <button onClick={() => { setShowCategoryModal(false); setEditingCategory(null); }} className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-xl">Cancel</button>
            <button 
              onClick={() => { 
                if (newCategory.name.trim()) {
                  onSaveCategory({ ...newCategory, id: editingCategory?.id }); 
                  setShowCategoryModal(false); 
                  setEditingCategory(null);
                  setNewCategory({ name: '', color: CATEGORY_COLORS[0] });
                }
              }} 
              disabled={!newCategory.name.trim()} 
              className="px-4 py-2 bg-stone-800 text-white rounded-xl hover:bg-stone-700 disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </div>
      </Modal>

      <PastCheckInsModal />
      <HabitModal />
      {showHabitDetail && <HabitDetailModal habit={showHabitDetail} onClose={() => setShowHabitDetail(null)} />}
      {celebration && <Celebration data={celebration} onClose={() => setCelebration(null)} />}
    </div>
  );
};

export default Progress;
