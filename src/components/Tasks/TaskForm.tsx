import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import AnalogClockPicker from './AnalogClockPicker';

export default function TaskForm() {
  const { sections, activeTab, addTask } = useApp();
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState<number | ''>('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [type, setType] = useState(activeTab === 'overview' ? 'study' : activeTab);
  const [tag, setTag] = useState(() => {
    const sec = sections.find(s => s.id === (activeTab === 'overview' ? 'study' : activeTab));
    return sec?.tags?.[0] || '';
  });
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');

  const currentSection = sections.find(s => s.id === type);
  const hasTags = currentSection && currentSection.tags.length > 0;

  const handleTypeChange = (val: string) => {
    setType(val);
    const sec = sections.find(s => s.id === val);
    if (sec?.tags?.length) setTag(sec.tags[0]);
    else setTag('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { alert("Please enter a Task Title"); return; }
    await addTask(title, duration === '' ? null : Number(duration), type, hasTags ? tag : null, priority, scheduledTime || null);
    setTitle('');
    setDuration('');
    setScheduledTime('');
  };

  return (
    <form onSubmit={handleSubmit} className="add-task-container">
      <div className="add-task-row">
        <input type="text" className="form-input" placeholder="What needs to be done?" value={title} onChange={e => setTitle(e.target.value)} />
        <input type="number" className="form-input duration-input" placeholder="Mins" value={duration} onChange={e => setDuration(e.target.value === '' ? '' : Number(e.target.value))} />
        <AnalogClockPicker value={scheduledTime} onChange={setScheduledTime} />
      </div>
      <div className="add-task-row task-options">
        <select className="form-select" value={type} onChange={e => handleTypeChange(e.target.value)}>
          {sections.map(sec => <option key={sec.id} value={sec.id}>{sec.icon} {sec.name}</option>)}
        </select>
        {hasTags && (
          <select className="form-select" value={tag} onChange={e => setTag(e.target.value)}>
            {currentSection?.tags.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>
        )}
        <select className="form-select priority-select" value={priority} onChange={e => setPriority(e.target.value as 'high' | 'medium' | 'low')}>
          <option value="high">🔴 High</option>
          <option value="medium">🟡 Medium</option>
          <option value="low">🟢 Low</option>
        </select>
        <button type="submit" className="btn-primary">
          <Plus size={18} /> Add Task
        </button>
      </div>
    </form>
  );
}
