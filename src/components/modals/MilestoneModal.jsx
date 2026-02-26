import React, { useState, useEffect } from 'react';
import Modal from '../Modal';
import { generateId } from '../../utils';

const MilestoneModal = ({ isOpen, onClose, milestone, categories, onSave, onDelete }) => {
  const defaultCategoryId = categories && categories.length > 0 ? categories[0].id : 'uncategorized';
  
  const [form, setForm] = useState({
    title: '', categoryId: defaultCategoryId, deadline: '', notes: '',
  });

  useEffect(() => {
    if (milestone) setForm(milestone);
    else setForm({ title: '', categoryId: defaultCategoryId, deadline: '', notes: '' });
  }, [milestone, isOpen, defaultCategoryId]);

  const handleSave = () => {
    onSave({ ...form, id: milestone?.id || generateId() });
    onClose();
  };

  const category = categories.find(c => c.id === form.categoryId);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={milestone ? 'Edit Milestone' : 'New Milestone'}>
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-stone-600 mb-2">Milestone Title</label>
          <input type="text" value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:border-stone-400 outline-none"
            placeholder="A major achievement to work toward" autoFocus />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-600 mb-2">Category</label>
            <select value={form.categoryId} onChange={(e) => setForm(f => ({ ...f, categoryId: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-stone-200 outline-none bg-white">
              {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-600 mb-2">Target Date (optional)</label>
            <input type="date" value={form.deadline || ''} onChange={(e) => setForm(f => ({ ...f, deadline: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-stone-200 outline-none" />
          </div>
        </div>
        <div className="h-9 rounded-lg flex items-center justify-center text-white text-sm font-medium" style={{ backgroundColor: category?.color }}>{category?.name}</div>
        <div>
          <label className="block text-sm font-medium text-stone-600 mb-2">Notes (optional)</label>
          <textarea value={form.notes || ''} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:border-stone-400 outline-none resize-none"
            rows={3} placeholder="Add any notes..." />
        </div>
        <div className="flex gap-3 pt-4 border-t border-stone-100">
          {milestone && <button onClick={() => { onDelete(milestone.id); onClose(); }} className="px-6 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors">Delete</button>}
          <div className="flex-1" />
          <button onClick={onClose} className="px-6 py-3 text-stone-600 hover:bg-stone-100 rounded-xl transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={!form.title.trim()} className="px-6 py-3 bg-stone-800 text-white rounded-xl hover:bg-stone-700 transition-colors font-medium disabled:opacity-50">Save</button>
        </div>
      </div>
    </Modal>
  );
};

export default MilestoneModal;
