import React, { useState, useCallback, useMemo } from 'react';
import { useAuth } from './hooks/useAuth';
import { useSupabaseData, usePomodoroSettings, useUserNotes, useWeeklyFocus } from './hooks/useSupabaseData';
import { Icons } from './components/Icons';
import Auth from './components/Auth';
import MindSpace from './components/MindSpace';
import Goals from './components/Goals';
import Progress from './components/Progress';
import Focus from './components/Focus';
import { TaskModal, GoalModal, MilestoneModal, CheckInModal } from './components/modals';
import { TABS, CATEGORIES as FALLBACK_CATEGORIES, DEFAULT_CATEGORIES } from './constants';
import { generateId } from './utils';

// Transform functions for database
const taskTransform = {
  toDb: (item) => ({
    id: item.id, user_id: item.user_id, title: item.title, category_id: item.categoryId,
    goal_id: item.goalId, scheduled_date: item.scheduledDate, scheduled_week: item.scheduledWeek,
    start_hour: item.startHour, start_minute: item.startMinute || 0, duration: item.duration || 1, 
    completed: item.completed || false, completed_at: item.completedAt, is_task: true, 
    date: item.date || item.scheduledDate, order_index: item.order || 0,
  }),
  fromDb: (row) => ({
    id: row.id, title: row.title, categoryId: row.category_id, goalId: row.goal_id,
    scheduledDate: row.scheduled_date, scheduledWeek: row.scheduled_week, startHour: row.start_hour, 
    startMinute: row.start_minute, duration: row.duration, completed: row.completed, 
    completedAt: row.completed_at, isTask: true, date: row.date, order: row.order_index || 0,
  }),
};

const goalTransform = {
  toDb: (item) => ({
    id: item.id, user_id: item.user_id, title: item.title, category_id: item.categoryId,
    milestone_id: item.milestoneId, column_name: item.column, description: item.description,
    completed: item.completed || false,
  }),
  fromDb: (row) => ({
    id: row.id, title: row.title, categoryId: row.category_id, milestoneId: row.milestone_id,
    column: row.column_name, description: row.description, completed: row.completed,
  }),
};

const milestoneTransform = {
  toDb: (item) => ({ id: item.id, user_id: item.user_id, title: item.title, category_id: item.categoryId, deadline: item.deadline, notes: item.notes }),
  fromDb: (row) => ({ id: row.id, title: row.title, categoryId: row.category_id, deadline: row.deadline, notes: row.notes }),
};

const checkInTransform = {
  toDb: (item) => ({
    id: item.id, user_id: item.user_id, type: item.type, date: item.date, rating: item.rating,
    wins: item.wins, happy_about: item.happyAbout, went_well: item.wentWell, obstacles: item.obstacles,
    priorities: item.priorities, make_time_for: item.makeTimeFor, career_progress: item.careerProgress,
    freeform_reflection: item.freeformReflection,
  }),
  fromDb: (row) => ({
    id: row.id, type: row.type, date: row.date, rating: row.rating, wins: row.wins,
    happyAbout: row.happy_about, wentWell: row.went_well, obstacles: row.obstacles,
    priorities: row.priorities, makeTimeFor: row.make_time_for, careerProgress: row.career_progress,
    freeformReflection: row.freeform_reflection,
  }),
};

const rewardTransform = {
  toDb: (item) => ({ id: item.id, user_id: item.user_id, text: item.text, claimed: item.claimed || false }),
  fromDb: (row) => ({ id: row.id, text: row.text, claimed: row.claimed }),
};

const habitTransform = {
  toDb: (item) => ({ id: item.id, user_id: item.user_id, name: item.name, frequency: item.frequency }),
  fromDb: (row) => ({ id: row.id, name: row.name, frequency: row.frequency }),
};

const habitLogTransform = {
  toDb: (item) => ({ id: item.id, user_id: item.user_id, habit_id: item.habitId, date: item.date }),
  fromDb: (row) => ({ id: row.id, habitId: row.habit_id, date: row.date }),
};

const categoryTransform = {
  toDb: (item) => ({ id: item.id, user_id: item.user_id, name: item.name, color: item.color }),
  fromDb: (row) => ({ id: row.id, name: row.name, color: row.color }),
};

const timeLogTransform = {
  toDb: (item) => ({ id: item.id, user_id: item.user_id, category_id: item.categoryId, minutes: item.minutes, date: item.date, task_id: item.taskId }),
  fromDb: (row) => ({ id: row.id, categoryId: row.category_id, minutes: row.minutes, date: row.date, taskId: row.task_id }),
};

function App() {
  const { user, loading: authLoading, signOut } = useAuth();

  const { data: tasks, upsert: upsertTask, remove: removeTask } = useSupabaseData('tasks', taskTransform);
  const { data: goals, upsert: upsertGoal, remove: removeGoal } = useSupabaseData('goals', goalTransform);
  const { data: milestones, upsert: upsertMilestone, remove: removeMilestone } = useSupabaseData('milestones', milestoneTransform);
  const { data: checkIns, upsert: upsertCheckIn } = useSupabaseData('check_ins', checkInTransform);
  const { data: rewards, upsert: upsertReward, remove: removeReward } = useSupabaseData('rewards', rewardTransform);
  const { data: habits, upsert: upsertHabit, remove: removeHabit } = useSupabaseData('habits', habitTransform);
  const { data: habitLogs, upsert: upsertHabitLog, remove: removeHabitLog } = useSupabaseData('habit_logs', habitLogTransform);
  const { data: customCategories, upsert: upsertCategory, remove: removeCategory, loading: categoriesLoading } = useSupabaseData('categories', categoryTransform);
  const { data: timeLogEntries, upsert: upsertTimeLog } = useSupabaseData('time_log_entries', timeLogTransform);
  const { settings: pomodoroSettings, updateSettings: updatePomodoroSettings } = usePomodoroSettings();
  const { notes, saveNotes } = useUserNotes();
  const { weeklyFocus, saveWeeklyFocus } = useWeeklyFocus();

  // Use custom categories if they exist, otherwise use fallback
  const categories = useMemo(() => {
    if (categoriesLoading) return FALLBACK_CATEGORIES;
    if (customCategories && customCategories.length > 0) return customCategories;
    return FALLBACK_CATEGORIES;
  }, [customCategories, categoriesLoading]);

  const [activeTab, setActiveTab] = useState('home');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [taskModal, setTaskModal] = useState({ isOpen: false, task: null, defaults: {} });
  const [goalModal, setGoalModal] = useState({ isOpen: false, goal: null });
  const [milestoneModal, setMilestoneModal] = useState({ isOpen: false, milestone: null });
  const [checkInModal, setCheckInModal] = useState({ isOpen: false, type: null });
  const [pendingRewards, setPendingRewards] = useState(0);
  const [weeklyBannerDismissed, setWeeklyBannerDismissed] = useState(false);
  const [monthlyBannerDismissed, setMonthlyBannerDismissed] = useState(false);

  const handleSaveTask = useCallback(async (task) => {
    await upsertTask({ ...task, id: task.id || generateId(), completedAt: task.completed ? new Date().toISOString() : null });
  }, [upsertTask]);

  const handleDeleteTask = useCallback(async (id) => { await removeTask(id); }, [removeTask]);

  const handleToggleTask = useCallback(async (id) => {
    const task = tasks.find(t => t.id === id);
    if (task) await upsertTask({ ...task, completed: !task.completed, completedAt: !task.completed ? new Date().toISOString() : null });
  }, [tasks, upsertTask]);

  const handleTaskUpdate = useCallback(async (task) => { await upsertTask(task); }, [upsertTask]);

  const handleSaveGoal = useCallback(async (goal) => { await upsertGoal({ ...goal, id: goal.id || generateId() }); }, [upsertGoal]);

  const handleDeleteGoal = useCallback(async (id) => {
    await removeGoal(id);
    for (const task of tasks.filter(t => t.goalId === id)) await upsertTask({ ...task, goalId: null });
  }, [removeGoal, tasks, upsertTask]);

  const handleMoveGoal = useCallback(async (id, column) => {
    const goal = goals.find(g => g.id === id);
    if (goal) await upsertGoal({ ...goal, column, completed: column === 'Done' });
  }, [goals, upsertGoal]);

  const handleSaveMilestone = useCallback(async (milestone) => { await upsertMilestone({ ...milestone, id: milestone.id || generateId() }); }, [upsertMilestone]);

  const handleDeleteMilestone = useCallback(async (id) => {
    await removeMilestone(id);
    for (const goal of goals.filter(g => g.milestoneId === id)) await upsertGoal({ ...goal, milestoneId: null });
  }, [removeMilestone, goals, upsertGoal]);

  const handleSaveCheckIn = useCallback(async (checkIn) => { await upsertCheckIn({ ...checkIn, id: generateId() }); }, [upsertCheckIn]);

  const handleSaveReward = useCallback(async (reward) => { await upsertReward({ ...reward, id: reward.id || generateId() }); }, [upsertReward]);
  const handleDeleteReward = useCallback(async (id) => { await removeReward(id); }, [removeReward]);
  const handleClaimReward = useCallback(async (id) => {
    const reward = rewards.find(r => r.id === id);
    if (reward) await upsertReward({ ...reward, claimed: true });
  }, [rewards, upsertReward]);

  // Habit handlers
  const handleSaveHabit = useCallback(async (habit) => { 
    await upsertHabit({ ...habit, id: habit.id || generateId() }); 
  }, [upsertHabit]);
  
  const handleDeleteHabit = useCallback(async (id) => { 
    // First delete all logs for this habit
    const logsToDelete = habitLogs.filter(l => l.habitId === id);
    for (const log of logsToDelete) {
      try {
        await removeHabitLog(log.id);
      } catch (e) {
        console.error('Failed to delete habit log:', e);
      }
    }
    // Then delete the habit
    try {
      await removeHabit(id);
    } catch (e) {
      console.error('Failed to delete habit:', e);
    }
  }, [removeHabit, habitLogs, removeHabitLog]);
  
  const handleToggleHabitLog = useCallback(async (habitId, date, isLogging) => {
    if (isLogging) {
      await upsertHabitLog({ id: generateId(), habitId, date });
    } else {
      const log = habitLogs.find(l => l.habitId === habitId && l.date === date);
      if (log) await removeHabitLog(log.id);
    }
  }, [upsertHabitLog, habitLogs, removeHabitLog]);

  // Pending rewards handlers
  const handleAddPendingReward = useCallback(() => {
    setPendingRewards(prev => prev + 1);
  }, []);
  
  const handleClaimPendingReward = useCallback(() => {
    setPendingRewards(prev => Math.max(0, prev - 1));
  }, []);

  // Category handlers
  const handleSaveCategory = useCallback(async (category) => {
    await upsertCategory({ ...category, id: category.id || generateId() });
  }, [upsertCategory]);

  const handleDeleteCategory = useCallback(async (id) => {
    // Move tasks/goals with this category to 'uncategorized'
    for (const task of tasks.filter(t => t.categoryId === id)) {
      await upsertTask({ ...task, categoryId: 'uncategorized' });
    }
    for (const goal of goals.filter(g => g.categoryId === id)) {
      await upsertGoal({ ...goal, categoryId: 'uncategorized' });
    }
    for (const milestone of milestones.filter(m => m.categoryId === id)) {
      await upsertMilestone({ ...milestone, categoryId: 'uncategorized' });
    }
    await removeCategory(id);
  }, [removeCategory, tasks, goals, milestones, upsertTask, upsertGoal, upsertMilestone]);

  const handleLogTime = useCallback(async (entry) => { await upsertTimeLog({ ...entry, id: generateId() }); }, [upsertTimeLog]);

  const openAddTaskModal = (defaults = {}) => setTaskModal({ isOpen: true, task: null, defaults });

  const tabIcons = { home: Icons.Home, goals: Icons.Board, progress: Icons.Target, focus: Icons.Timer };

  if (authLoading) return <div className="min-h-screen bg-stone-50 flex items-center justify-center"><div className="text-stone-400">Loading...</div></div>;
  if (!user) return <Auth />;

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      <header className="bg-white border-b border-stone-100 px-4 sm:px-6 py-3 flex-none">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-stone-800 tracking-tight">My Planner</h1>
          <button onClick={signOut} className="px-3 py-2 text-sm text-stone-600 hover:bg-stone-100 rounded-xl transition-colors">Sign Out</button>
        </div>
      </header>

      <div className="bg-emerald-50 border-b border-emerald-100 px-4 py-1 text-center">
        <span className="text-xs text-emerald-600">✓ Synced • {user.email}</span>
      </div>

      <nav className="bg-white border-b border-stone-100 px-4 sm:px-6 py-2 flex-none overflow-x-auto">
        <div className="max-w-7xl mx-auto flex gap-1">
          {TABS.map(tab => {
            const TabIcon = tabIcons[tab.id];
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${activeTab === tab.id ? 'bg-stone-800 text-white' : 'text-stone-600 hover:bg-stone-100'}`}>
                <TabIcon size={18} /><span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <main className={`flex-1 overflow-hidden ${activeTab === 'home' ? '' : 'p-4 sm:p-6'}`}>
        <div className={`h-full ${activeTab === 'home' ? '' : 'max-w-7xl mx-auto'}`}>
          {activeTab === 'home' && (
            <MindSpace 
              selectedDate={selectedDate} 
              setSelectedDate={setSelectedDate} 
              tasks={tasks} 
              goals={goals}
              categories={categories} 
              weeklyFocus={weeklyFocus}
              onTaskUpdate={handleTaskUpdate} 
              onTaskToggle={handleToggleTask} 
              onTaskClick={task => setTaskModal({ isOpen: true, task, defaults: {} })} 
              onAddTask={openAddTaskModal}
              onCreateAction={handleSaveTask}
              onDeleteTask={handleDeleteTask}
              onSaveWeeklyFocus={saveWeeklyFocus}
            />
          )}
          {activeTab === 'goals' && <Goals goals={goals} tasks={tasks} milestones={milestones} categories={categories} onGoalClick={goal => setGoalModal({ isOpen: true, goal })} onAddGoal={() => setGoalModal({ isOpen: true, goal: null })} onMoveGoal={handleMoveGoal} />}
          {activeTab === 'progress' && (
            <Progress 
              tasks={tasks} 
              goals={goals} 
              milestones={milestones} 
              checkIns={checkIns} 
              rewards={rewards}
              habits={habits}
              habitLogs={habitLogs}
              categories={categories}
              pendingRewards={pendingRewards}
              weeklyBannerDismissed={weeklyBannerDismissed}
              monthlyBannerDismissed={monthlyBannerDismissed}
              onDismissWeeklyBanner={() => setWeeklyBannerDismissed(true)}
              onDismissMonthlyBanner={() => setMonthlyBannerDismissed(true)}
              onAddMilestone={() => setMilestoneModal({ isOpen: true, milestone: null })} 
              onEditMilestone={m => setMilestoneModal({ isOpen: true, milestone: m })} 
              onEditGoal={g => setGoalModal({ isOpen: true, goal: g })} 
              onEditTask={t => setTaskModal({ isOpen: true, task: t, defaults: {} })} 
              onAddGoal={() => setGoalModal({ isOpen: true, goal: null })} 
              onOpenCheckIn={type => setCheckInModal({ isOpen: true, type })} 
              onSaveReward={handleSaveReward} 
              onDeleteReward={handleDeleteReward} 
              onClaimReward={handleClaimReward}
              onSaveHabit={handleSaveHabit}
              onDeleteHabit={handleDeleteHabit}
              onToggleHabitLog={handleToggleHabitLog}
              onAddPendingReward={handleAddPendingReward}
              onClaimPendingReward={handleClaimPendingReward}
              onSaveCategory={handleSaveCategory}
              onDeleteCategory={handleDeleteCategory}
            />
          )}
          {activeTab === 'focus' && <Focus scheduleItems={tasks.filter(t => t.scheduledDate)} tasks={tasks} categories={categories} settings={pomodoroSettings} onUpdateSettings={updatePomodoroSettings} onLogTime={handleLogTime} onTaskUpdate={handleTaskUpdate} />}
        </div>
      </main>

      <TaskModal isOpen={taskModal.isOpen} onClose={() => setTaskModal({ isOpen: false, task: null, defaults: {} })} task={taskModal.task} defaults={taskModal.defaults} goals={goals} categories={categories} onSave={handleSaveTask} onDelete={handleDeleteTask} />
      <GoalModal isOpen={goalModal.isOpen} onClose={() => setGoalModal({ isOpen: false, goal: null })} goal={goalModal.goal} milestones={milestones} categories={categories} onSave={handleSaveGoal} onDelete={handleDeleteGoal} />
      <MilestoneModal isOpen={milestoneModal.isOpen} onClose={() => setMilestoneModal({ isOpen: false, milestone: null })} milestone={milestoneModal.milestone} categories={categories} onSave={handleSaveMilestone} onDelete={handleDeleteMilestone} />
      <CheckInModal isOpen={checkInModal.isOpen} onClose={() => setCheckInModal({ isOpen: false, type: null })} type={checkInModal.type} onSave={handleSaveCheckIn} />
    </div>
  );
}

export default App;
