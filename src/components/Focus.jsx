import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Icons } from './Icons';
import Modal from './Modal';
import { DEFAULT_POMODORO } from '../constants';
import { formatTime, formatDateKey, formatHour } from '../utils';

const Focus = ({ scheduleItems, tasks, categories, settings, onUpdateSettings, onLogTime, onTaskUpdate }) => {
  const effectiveSettings = settings || DEFAULT_POMODORO;
  
  // Load persisted state from localStorage
  const getTodayKey = () => formatDateKey(new Date());
  const loadPersistedState = () => {
    try {
      const saved = localStorage.getItem('pomodoro_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Reset if it's a new day
        if (parsed.date !== getTodayKey()) {
          return { sessionsCompleted: 0, date: getTodayKey() };
        }
        return parsed;
      }
    } catch (e) {}
    return { sessionsCompleted: 0, date: getTodayKey() };
  };

  const persistedState = loadPersistedState();
  
  const [timeLeft, setTimeLeft] = useState(effectiveSettings.work * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionType, setSessionType] = useState('work');
  const [sessionsCompleted, setSessionsCompleted] = useState(persistedState.sessionsCompleted);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [localSettings, setLocalSettings] = useState(effectiveSettings);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenDarkMode, setFullscreenDarkMode] = useState(true);
  const [showRandomModal, setShowRandomModal] = useState(false);
  const [randomTask, setRandomTask] = useState(null);
  
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const pausedTimeRef = useRef(null);

  // Persist sessions to localStorage
  useEffect(() => {
    localStorage.setItem('pomodoro_state', JSON.stringify({
      sessionsCompleted,
      date: getTodayKey()
    }));
  }, [sessionsCompleted]);

  // Auto-detect current task
  const currentTask = useMemo(() => {
    const now = new Date();
    const currentHour = now.getHours();
    const todayKey = formatDateKey(now);
    
    return scheduleItems.find(item => 
      item.scheduledDate === todayKey &&
      item.startHour <= currentHour &&
      item.startHour + (item.duration || 1) > currentHour &&
      !item.completed
    ) || tasks.find(t => t.scheduledDate === todayKey && !t.completed);
  }, [scheduleItems, tasks]);

  useEffect(() => {
    if (!selectedTask && currentTask) setSelectedTask(currentTask);
  }, [currentTask, selectedTask]);

  // Timer logic with proper pause/resume
  useEffect(() => {
    if (isRunning) {
      startTimeRef.current = Date.now() - ((getSessionDuration() * 60 - timeLeft) * 1000);
      
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        const remaining = getSessionDuration() * 60 - elapsed;
        
        if (remaining <= 0) {
          handleSessionComplete();
        } else {
          setTimeLeft(remaining);
        }
      }, 100);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRunning, sessionType]);

  // Keyboard shortcuts for fullscreen
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isFullscreen) return;
      
      switch (e.code) {
        case 'Space':
          e.preventDefault();
          toggleTimer();
          break;
        case 'KeyR':
          resetTimer();
          break;
        case 'KeyS':
          skipSession();
          break;
        case 'Escape':
          setIsFullscreen(false);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, isRunning]);

  const getSessionDuration = () => {
    if (sessionType === 'work') return effectiveSettings.work;
    if (sessionType === 'shortBreak') return effectiveSettings.shortBreak;
    return effectiveSettings.longBreak;
  };

  const handleSessionComplete = useCallback(() => {
    setIsRunning(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    if (sessionType === 'work') {
      const newSessions = sessionsCompleted + 1;
      setSessionsCompleted(newSessions);
      
      if (selectedTask) {
        onLogTime({
          categoryId: selectedTask.categoryId,
          minutes: effectiveSettings.work,
          date: formatDateKey(new Date()),
          taskId: selectedTask.id,
        });
      }
      
      if (newSessions % effectiveSettings.sessionsBeforeLong === 0) {
        setSessionType('longBreak');
        setTimeLeft(effectiveSettings.longBreak * 60);
      } else {
        setSessionType('shortBreak');
        setTimeLeft(effectiveSettings.shortBreak * 60);
      }
    } else {
      setSessionType('work');
      setTimeLeft(effectiveSettings.work * 60);
    }
  }, [sessionType, sessionsCompleted, selectedTask, effectiveSettings, onLogTime]);

  const toggleTimer = () => {
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setTimeLeft(getSessionDuration() * 60);
  };

  const skipSession = () => handleSessionComplete();

  const handleSaveSettings = () => {
    onUpdateSettings(localSettings);
    setShowSettings(false);
    if (!isRunning) {
      setTimeLeft(localSettings.work * 60);
    }
  };

  // Random task
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
      setSelectedTask(randomTask);
    }
    setShowRandomModal(false);
    setRandomTask(null);
  };

  const progress = ((getSessionDuration() * 60 - timeLeft) / (getSessionDuration() * 60)) * 100;

  const todaysTasks = useMemo(() => {
    const todayKey = formatDateKey(new Date());
    return tasks.filter(t => t.scheduledDate === todayKey && !t.completed);
  }, [tasks]);

  // Fullscreen view
  if (isFullscreen) {
    const bgColor = fullscreenDarkMode ? 'bg-black' : 'bg-stone-100';
    const textColor = fullscreenDarkMode ? 'text-white' : 'text-stone-800';
    const subtextColor = fullscreenDarkMode ? 'text-stone-400' : 'text-stone-500';
    const buttonBg = fullscreenDarkMode ? 'bg-stone-800 hover:bg-stone-700' : 'bg-stone-200 hover:bg-stone-300';
    const accentColor = sessionType === 'work' ? (fullscreenDarkMode ? '#ffffff' : '#292524') : '#10b981';
    
    return (
      <div className={`fixed inset-0 z-50 ${bgColor} flex flex-col items-center justify-center`}>
        {/* Top controls */}
        <div className="absolute top-6 right-6 flex items-center gap-3">
          <button
            onClick={() => setFullscreenDarkMode(!fullscreenDarkMode)}
            className={`p-3 rounded-full ${buttonBg} ${textColor} transition-colors`}
          >
            {fullscreenDarkMode ? <Icons.Sun size={20} /> : <Icons.Moon size={20} />}
          </button>
          <button
            onClick={() => setIsFullscreen(false)}
            className={`p-3 rounded-full ${buttonBg} ${textColor} transition-colors`}
          >
            <Icons.Minimize size={20} />
          </button>
        </div>

        {/* Session type tabs */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-2">
          {['work', 'shortBreak', 'longBreak'].map(type => (
            <button
              key={type}
              onClick={() => {
                if (!isRunning) {
                  setSessionType(type);
                  setTimeLeft(
                    type === 'work' ? effectiveSettings.work * 60 :
                    type === 'shortBreak' ? effectiveSettings.shortBreak * 60 :
                    effectiveSettings.longBreak * 60
                  );
                }
              }}
              className={`px-4 py-2 rounded-xl text-sm transition-colors ${
                sessionType === type 
                  ? (fullscreenDarkMode ? 'bg-white text-black' : 'bg-stone-800 text-white')
                  : `${subtextColor} ${buttonBg}`
              }`}
            >
              {type === 'work' ? 'Focus' : type === 'shortBreak' ? 'Short' : 'Long'}
            </button>
          ))}
        </div>

        {/* Timer */}
        <div className="relative">
          <svg className="w-80 h-80 transform -rotate-90">
            <circle 
              cx="160" cy="160" r="150" 
              stroke={fullscreenDarkMode ? '#374151' : '#d6d3d1'} 
              strokeWidth="8" 
              fill="none" 
            />
            <circle
              cx="160" cy="160" r="150" 
              stroke={accentColor}
              strokeWidth="8" 
              fill="none"
              strokeDasharray={942}
              strokeDashoffset={942 - (942 * progress) / 100}
              strokeLinecap="round"
              className="transition-all duration-300"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-8xl font-light ${textColor} tabular-nums`}>
              {formatTime(timeLeft)}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-6 mt-12">
          <button 
            onClick={resetTimer} 
            className={`p-4 rounded-full ${buttonBg} ${textColor} transition-colors`}
          >
            <Icons.Reset size={24} />
          </button>
          <button 
            onClick={toggleTimer} 
            className={`w-20 h-20 rounded-full flex items-center justify-center transition-colors ${
              sessionType === 'work' 
                ? (fullscreenDarkMode ? 'bg-white text-black' : 'bg-stone-800 text-white') 
                : 'bg-emerald-500 text-white'
            }`}
          >
            {isRunning ? <Icons.Pause size={32} /> : <Icons.Play size={32} />}
          </button>
          <button 
            onClick={skipSession} 
            className={`p-4 rounded-full ${buttonBg} ${textColor} transition-colors`}
          >
            <Icons.SkipForward size={24} />
          </button>
        </div>

        {/* Session info */}
        <div className={`mt-8 text-sm ${subtextColor}`}>
          Session {sessionsCompleted + 1} • {sessionsCompleted} completed today
        </div>

        {/* Keyboard shortcuts hint */}
        <div className={`absolute bottom-6 ${subtextColor} text-xs flex gap-4`}>
          <span>Space: Play/Pause</span>
          <span>R: Reset</span>
          <span>S: Skip</span>
          <span>Esc: Exit</span>
        </div>
      </div>
    );
  }

  // Random Task Modal
  const RandomTaskModal = () => {
    if (!showRandomModal || !randomTask) return null;
    const category = categories.find(c => c.id === randomTask.categoryId);

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 text-center">
          <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icons.Shuffle size={28} className="text-stone-600" />
          </div>
          <h2 className="text-xl font-bold text-stone-800 mb-2">Your Random Task</h2>
          
          <div className="p-4 bg-stone-50 rounded-xl my-4 text-left">
            <p className="font-medium text-stone-800 text-lg mb-2">{randomTask.title}</p>
            <span className="text-xs px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: category?.color }}>
              {category?.name}
            </span>
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
    <div className="h-full flex flex-col items-center justify-center">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center">
          <div className="flex items-center justify-center gap-4 mb-6">
            {['work', 'shortBreak', 'longBreak'].map(type => (
              <button
                key={type}
                onClick={() => {
                  if (!isRunning) {
                    setSessionType(type);
                    setTimeLeft(
                      type === 'work' ? effectiveSettings.work * 60 :
                      type === 'shortBreak' ? effectiveSettings.shortBreak * 60 :
                      effectiveSettings.longBreak * 60
                    );
                  }
                }}
                className={`px-4 py-2 rounded-xl text-sm transition-colors ${
                  sessionType === type ? 'bg-stone-800 text-white' : 'text-stone-500 hover:bg-stone-100'
                }`}
              >
                {type === 'work' ? 'Focus' : type === 'shortBreak' ? 'Short Break' : 'Long Break'}
              </button>
            ))}
          </div>

          <div className="relative w-48 h-48 mx-auto mb-6">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="96" cy="96" r="88" stroke="#e7e5e4" strokeWidth="8" fill="none" />
              <circle
                cx="96" cy="96" r="88" stroke={sessionType === 'work' ? '#292524' : '#10b981'} strokeWidth="8" fill="none"
                strokeDasharray={553} strokeDashoffset={553 - (553 * progress) / 100} strokeLinecap="round"
                className="transition-all duration-300"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-5xl font-bold text-stone-800 tabular-nums">{formatTime(timeLeft)}</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 mb-6">
            <button onClick={resetTimer} className="p-3 rounded-full hover:bg-stone-100 text-stone-500"><Icons.Reset /></button>
            <button onClick={toggleTimer} className={`w-16 h-16 rounded-full flex items-center justify-center text-white ${sessionType === 'work' ? 'bg-stone-800 hover:bg-stone-700' : 'bg-emerald-500 hover:bg-emerald-400'}`}>
              {isRunning ? <Icons.Pause size={28} /> : <Icons.Play size={28} />}
            </button>
            <button onClick={skipSession} className="p-3 rounded-full hover:bg-stone-100 text-stone-500"><Icons.SkipForward /></button>
          </div>

          <div className="text-sm text-stone-500 mb-4">Session {sessionsCompleted + 1} • {sessionsCompleted} completed today</div>

          {selectedTask && (
            <div className="p-3 bg-stone-50 rounded-xl">
              <p className="text-xs text-stone-400 mb-1">Working on:</p>
              <p className="font-medium text-stone-800">{selectedTask.title}</p>
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <button onClick={() => setShowSettings(true)} className="flex items-center gap-2 text-sm text-stone-500 hover:text-stone-700">
            <Icons.Settings size={16} />Settings
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={pickRandomTask}
              disabled={incompleteTasks.length === 0}
              className="flex items-center gap-2 text-sm text-stone-500 hover:text-stone-700 disabled:opacity-50"
            >
              <Icons.Shuffle size={16} />Random Task
            </button>
            <button onClick={() => setIsFullscreen(true)} className="flex items-center gap-2 text-sm text-stone-500 hover:text-stone-700">
              <Icons.Maximize size={16} />Fullscreen
            </button>
          </div>
        </div>

        {todaysTasks.length > 0 && (
          <div className="mt-6 bg-white rounded-xl border border-stone-200 p-4">
            <h3 className="text-sm font-medium text-stone-700 mb-3">Today's Tasks</h3>
            <div className="space-y-2">
              {todaysTasks.slice(0, 5).map(task => {
                const category = categories.find(c => c.id === task.categoryId);
                return (
                  <button
                    key={task.id}
                    onClick={() => setSelectedTask(task)}
                    className={`w-full text-left p-2 rounded-lg text-sm transition-colors ${selectedTask?.id === task.id ? 'bg-stone-100 border border-stone-300' : 'hover:bg-stone-50'}`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: category?.color }} />
                      <span>{task.title}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <Modal isOpen={showSettings} onClose={() => setShowSettings(false)} title="Timer Settings">
        <div className="space-y-4">
          {[
            { key: 'work', label: 'Focus Duration', unit: 'minutes' },
            { key: 'shortBreak', label: 'Short Break', unit: 'minutes' },
            { key: 'longBreak', label: 'Long Break', unit: 'minutes' },
            { key: 'sessionsBeforeLong', label: 'Sessions Before Long Break', unit: 'sessions' },
          ].map(({ key, label, unit }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-stone-600 mb-2">{label}</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={localSettings[key]}
                  onChange={(e) => setLocalSettings(s => ({ ...s, [key]: parseInt(e.target.value) || 1 }))}
                  min="1" max={key === 'sessionsBeforeLong' ? 10 : 60}
                  className="w-20 px-3 py-2 rounded-xl border border-stone-200 outline-none"
                />
                <span className="text-sm text-stone-500">{unit}</span>
              </div>
            </div>
          ))}
          <div className="flex gap-3 pt-4">
            <button onClick={() => setShowSettings(false)} className="flex-1 px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-xl">Cancel</button>
            <button onClick={handleSaveSettings} className="flex-1 px-4 py-2 bg-stone-800 text-white rounded-xl hover:bg-stone-700">Save</button>
          </div>
        </div>
      </Modal>

      <RandomTaskModal />
    </div>
  );
};

export default Focus;
