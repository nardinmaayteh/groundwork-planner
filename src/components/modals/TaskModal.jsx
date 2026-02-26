import React, { useState, useEffect } from 'react';
import Modal from '../Modal';
import { HOURS } from '../../constants';
import { generateId, formatHour } from '../../utils';

const TaskModal = ({ isOpen, onClose, task, defaults = {}, goals, categories, onSave, onDelete }) => {
  const defaultCategoryId = categories && categories.length > 0 ? categories[0].id : 'uncategorized';
  
  const [form, setForm] = useState({
    title: '', categoryId: defaultCategoryId, goalId: null, scheduledDate: '',
    startHour: null, startMinute: 0, duration: 1, completed: false, isTask: true,
  });

  useEffect(() => {
    if (task) setForm({ ...task, isTask: true });
    else setForm({
      title: '', categoryId: defaults.categoryId || defaultCategoryId, goalId: defaults.goalId || null,
      scheduledDate: defaults.scheduledDate || '', startHour: defaults.startHour ?? null,
      startMinute: defaults.startMinute || 0, duration: defaults.duration || 1, completed: false, isTask: true,
    });
  }, [task, defaults, isOpen, defaultCategoryId]);

  const handleGoalChange = (goalId) => {
    if (goalId) {
      const goal = goals.find(g => g.id === goalId);
      if (goal) { setForm(f => ({ ...f, goalId, categoryId: goal.categoryId })); return; }
    }
    setForm(f => ({ ...f, goalId: null }));
  };

  const handleSave = () => {
    const data = { ...form, id: task?.id || generateId(), isTask: true };
    if (form.scheduledDate) data.date = form.scheduledDate;
    onSave(data);
    onClose();
  };

  const category = categories.find(c => c.id === form.categoryId);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={task ? 'Edit Action' : 'New Action'}>
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-stone-600 mb-2">Action</label>
          <input type="text" value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:border-stone-400 outline-none"
            placeholder="What do you need to do?" autoFocus />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-600 mb-2">Category</label>
            <select value={form.categoryId} onChange={(e) => setForm(f => ({ ...f, categoryId: e.target.value, goalId: null }))}
              disabled={!!form.goalId} className="w-full px-4 py-3 rounded-xl border border-stone-200 outline-none bg-white disabled:opacity-50">
              {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-600 mb-2">Link to Goal</label>
            <select value={form.goalId || ''} onChange={(e) => handleGoalChange(e.target.value || null)}
              className="w-full px-4 py-3 rounded-xl border border-stone-200 outline-none bg-white">
              <option value="">No goal</option>
              {goals.map(goal => <option key={goal.id} value={goal.id}>{goal.title}</option>)}
            </select>
          </div>
        </div>
        <div className="h-9 rounded-lg flex items-center justify-center text-white text-sm font-medium" style={{ backgroundColor: category?.color }}>{category?.name}</div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-stone-600">Assign to Day (optional)</label>
            {form.scheduledDate && <button onClick={() => setForm(f => ({ ...f, scheduledDate: '', startHour: null }))} className="text-xs text-stone-400 hover:text-stone-600">Clear date</button>}
          </div>
          <p className="text-xs text-stone-400 mb-2">Add a date to show this action in your schedule</p>
          <div className="grid grid-cols-4 gap-3">
            <input type="date" value={form.scheduledDate} onChange={(e) => setForm(f => ({ ...f, scheduledDate: e.target.value }))} className="col-span-2 px-4 py-3 rounded-xl border border-stone-200 outline-none" />
            <select value={form.startHour ?? ''} onChange={(e) => setForm(f => ({ ...f, startHour: e.target.value ? parseInt(e.target.value) : null }))} className="px-3 py-3 rounded-xl border border-stone-200 outline-none bg-white">
              <option value="">Time</option>
              {HOURS.map(h => <option key={h} value={h}>{formatHour(h)}</option>)}
            </select>
            <input type="number" min="0.25" max="8" step="0.25" value={form.duration} onChange={(e) => setForm(f => ({ ...f, duration: parseFloat(e.target.value) || 0.5 }))} placeholder="Hrs" className="px-3 py-3 rounded-xl border border-stone-200 outline-none" />
          </div>
        </div>
        <div className="flex gap-3 pt-4 border-t border-stone-100">
          {task && <button onClick={() => { onDelete(task.id); onClose(); }} className="px-6 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors">Delete</button>}
          <div className="flex-1" />
          <button onClick={onClose} className="px-6 py-3 text-stone-600 hover:bg-stone-100 rounded-xl transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={!form.title.trim()} className="px-6 py-3 bg-stone-800 text-white rounded-xl hover:bg-stone-700 transition-colors font-medium disabled:opacity-50">Save</button>
        </div>
      </div>
    </Modal>
  );
};

export default TaskModal;
