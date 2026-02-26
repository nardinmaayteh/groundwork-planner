import React, { useState } from 'react';
import { Icons } from './Icons';
import { KANBAN_COLUMNS } from '../constants';

const Goals = ({ goals, tasks, milestones, categories, onGoalClick, onAddGoal, onMoveGoal }) => {
  const [draggedGoal, setDraggedGoal] = useState(null);

  const getGoalsByColumn = (column) => goals.filter(g => g.column === column);
  const getTaskCount = (goalId) => {
    const goalTasks = tasks.filter(t => t.goalId === goalId);
    const completed = goalTasks.filter(t => t.completed).length;
    return { total: goalTasks.length, completed };
  };

  const handleDragStart = (e, goal) => {
    setDraggedGoal(goal);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, column) => {
    e.preventDefault();
    if (draggedGoal && draggedGoal.column !== column) {
      onMoveGoal(draggedGoal.id, column);
    }
    setDraggedGoal(null);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-stone-800">Goals</h2>
        <button onClick={onAddGoal} className="flex items-center gap-2 px-4 py-2 bg-stone-800 text-white rounded-xl hover:bg-stone-700 transition-colors">
          <Icons.Plus size={18} /><span className="hidden sm:inline">Add Goal</span>
        </button>
      </div>

      <div className="flex-1 overflow-x-auto">
        <div className="flex gap-3 min-w-max h-full pb-4">
          {KANBAN_COLUMNS.map(column => (
            <div
              key={column}
              className="w-64 flex-shrink-0 bg-stone-100 rounded-xl p-3 flex flex-col"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column)}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-stone-700 text-sm">{column}</h3>
                <span className="text-xs text-stone-400 bg-stone-200 px-2 py-0.5 rounded-full">{getGoalsByColumn(column).length}</span>
              </div>

              <div className="flex-1 space-y-2 overflow-auto">
                {getGoalsByColumn(column).map(goal => {
                  const category = categories.find(c => c.id === goal.categoryId);
                  const milestone = goal.milestoneId ? milestones.find(m => m.id === goal.milestoneId) : null;
                  const taskCount = getTaskCount(goal.id);

                  return (
                    <div
                      key={goal.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, goal)}
                      onClick={() => onGoalClick(goal)}
                      className="p-3 bg-white rounded-lg border border-stone-200 cursor-pointer hover:shadow-sm hover:border-stone-300 transition-all"
                    >
                      <div className="flex items-start gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: category?.color }} />
                        <span className="font-medium text-stone-800 text-sm">{goal.title}</span>
                      </div>
                      {milestone && <p className="text-xs text-stone-400 mb-2 flex items-center gap-1"><Icons.Target size={10} />{milestone.title}</p>}
                      {taskCount.total > 0 && (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${(taskCount.completed / taskCount.total) * 100}%`, backgroundColor: category?.color }} />
                          </div>
                          <span className="text-xs text-stone-400">{taskCount.completed}/{taskCount.total}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Goals;
