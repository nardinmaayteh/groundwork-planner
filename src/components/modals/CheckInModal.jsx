import React, { useState } from 'react';
import Modal from '../Modal';
import { formatDateKey } from '../../utils';

const CheckInModal = ({ isOpen, onClose, type, onSave }) => {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    rating: 3, wins: '', happyAbout: '', wentWell: '', obstacles: '',
    priorities: '', makeTimeFor: '', careerProgress: '', freeformReflection: '',
  });

  const weeklyPrompts = [
    { key: 'rating', label: 'How would you rate this week?', type: 'rating' },
    { key: 'wins', label: 'What were your wins this week?', type: 'textarea' },
    { key: 'wentWell', label: 'What went well?', type: 'textarea' },
    { key: 'obstacles', label: 'What obstacles did you face?', type: 'textarea' },
    { key: 'priorities', label: 'What are your priorities for next week?', type: 'textarea' },
  ];

  const monthlyPrompts = [
    { key: 'rating', label: 'How would you rate this month?', type: 'rating' },
    { key: 'wins', label: 'What were your biggest wins this month?', type: 'textarea' },
    { key: 'careerProgress', label: 'How did you progress toward your goals?', type: 'textarea' },
    { key: 'makeTimeFor', label: 'What do you want to make more time for next month?', type: 'textarea' },
    { key: 'freeformReflection', label: 'Any other reflections?', type: 'textarea' },
  ];

  const prompts = type === 'weekly' ? weeklyPrompts : monthlyPrompts;
  const currentPrompt = prompts[step];

  const handleNext = () => {
    if (step < prompts.length - 1) setStep(step + 1);
    else handleSave();
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleSave = () => {
    onSave({ ...form, type, date: formatDateKey(new Date()) });
    setForm({ rating: 3, wins: '', happyAbout: '', wentWell: '', obstacles: '', priorities: '', makeTimeFor: '', careerProgress: '', freeformReflection: '' });
    setStep(0);
    onClose();
  };

  const RatingInput = () => (
    <div className="flex justify-center gap-4">
      {[
        { value: 1, emoji: '😔', label: 'Rough' },
        { value: 2, emoji: '😕', label: 'Meh' },
        { value: 3, emoji: '😐', label: 'Okay' },
        { value: 4, emoji: '🙂', label: 'Good' },
        { value: 5, emoji: '😊', label: 'Great' },
      ].map(({ value, emoji, label }) => (
        <button
          key={value}
          onClick={() => setForm(f => ({ ...f, rating: value }))}
          className={`flex flex-col items-center p-3 rounded-xl transition-all ${form.rating === value ? 'bg-stone-100 scale-110' : 'hover:bg-stone-50'}`}
        >
          <span className="text-3xl mb-1">{emoji}</span>
          <span className="text-xs text-stone-500">{label}</span>
        </button>
      ))}
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={type === 'weekly' ? 'Weekly Check-in' : 'Monthly Check-in'} size="md">
      <div className="space-y-6">
        <div className="flex justify-center gap-1">
          {prompts.map((_, idx) => (
            <div key={idx} className={`w-8 h-1 rounded-full transition-colors ${idx <= step ? 'bg-stone-800' : 'bg-stone-200'}`} />
          ))}
        </div>

        <div className="min-h-[200px]">
          <h3 className="text-lg font-medium text-stone-800 mb-4 text-center">{currentPrompt.label}</h3>
          {currentPrompt.type === 'rating' ? (
            <RatingInput />
          ) : (
            <textarea
              value={form[currentPrompt.key] || ''}
              onChange={(e) => setForm(f => ({ ...f, [currentPrompt.key]: e.target.value }))}
              className="w-full h-32 px-4 py-3 rounded-xl border border-stone-200 focus:border-stone-400 outline-none resize-none"
              placeholder="Type your response..."
              autoFocus
            />
          )}
        </div>

        <div className="flex gap-3">
          {step > 0 && (
            <button onClick={handleBack} className="px-6 py-3 text-stone-600 hover:bg-stone-100 rounded-xl transition-colors">Back</button>
          )}
          <div className="flex-1" />
          <button onClick={onClose} className="px-6 py-3 text-stone-600 hover:bg-stone-100 rounded-xl transition-colors">Cancel</button>
          <button onClick={handleNext} className="px-6 py-3 bg-stone-800 text-white rounded-xl hover:bg-stone-700 transition-colors font-medium">
            {step === prompts.length - 1 ? 'Complete' : 'Next'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default CheckInModal;
