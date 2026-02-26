import React, { useState, useEffect } from 'react';
import Modal from '../Modal';
import { KANBAN_COLUMNS } from '../../constants';
import { generateId } from '../../utils';

const GoalModal = ({ isOpen, onClose, goal, milestones, categories, onSave, onDelete }) => {
  const defaultCategoryId = categories && categories.length > 0 ? categories[0].id : 'uncategorized';
  
  const [form, setForm] = useState({
    title: '', categoryId: defaultCategoryId, milestoneId: null, column: 'Not Started', description: '',
  });

  useEffect(() => {
    if (goal) setForm(goal);
    else setForm({ title: '', categoryId: defaultCategoryId, milestoneId: null, column: 'Not Started', description: '' });
  }, [goal, isOpen, defaultCategoryId]);

  const handleMilestoneChange = (milestoneId) => {
    if (milestoneId) {
      const milestone = milestones.find(m => m.id === milestoneId);
      if (milestone) { setForm(f => ({ ...f, milestoneId, categoryId: milestone.categoryId })); return; }
    }
    setForm(f => ({ ...f, milestoneId: null }));
  };

  const handleSave = () => {
    onSave({ ...form, id: goal?.id || generateId() });
    onClose();
  };

  const category = categories.find(c => c.id === form.categoryId);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={goal ? 'Edit Goal' : 'New Goal'}>
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-stone-600 mb-2">Goal Title</label>
          <input type="text" value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:border-stone-400 outline-none"
            placeholder="What do you want to achieve?" autoFocus />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-600 mb-2">Category</label>
            <select value={form.categoryId} onChange={(e) => setForm(f => ({ ...f, categoryId: e.target.value, milestoneId: null }))}
              disabled={!!form.milestoneId} className="w-full px-4 py-3 rounded-xl border border-stone-200 outline-none bg-white disabled:opacity-50">
              {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-600 mb-2">Link to Milestone</label>
            <select value={form.milestoneId || ''} onChange={(e) => handleMilestoneChange(e.target.value || null)}
              className="w-full px-4 py-3 rounded-xl border border-stone-200 outline-none bg-white">
              <option value="">No milestone</option>
              {milestones.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
            </select>
          </div>
        </div>
        <div className="h-9 rounded-lg flex items-center justify-center text-white text-sm font-medium" style={{ backgroundColor: category?.color }}>{category?.name}</div>
        <div>
          <label className="block text-sm font-medium text-stone-600 mb-2">Status</label>
          <select value={form.column} onChange={(e) => setForm(f => ({ ...f, column: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl border border-stone-200 outline-none bg-white">
            {KANBAN_COLUMNS.map(col => <option key={col} value={col}>{col}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-600 mb-2">Description (optional)</label>
          <textarea value={form.description || ''} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:border-stone-400 outline-none resize-none"
            rows={3} placeholder="Add details..." />
        </div>
        <div className="flex gap-3 pt-4 border-t border-stone-100">
          {goal && <button onClick={() => { onDelete(goal.id); onClose(); }} className="px-6 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors">Delete</button>}
          <div className="flex-1" />
          <button onClick={onClose} className="px-6 py-3 text-stone-600 hover:bg-stone-100 rounded-xl transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={!form.title.trim()} className="px-6 py-3 bg-stone-800 text-white rounded-xl hover:bg-stone-700 transition-colors font-medium disabled:opacity-50">Save</button>
        </div>
      </div>
    </Modal>
  );
};

export default GoalModal;
