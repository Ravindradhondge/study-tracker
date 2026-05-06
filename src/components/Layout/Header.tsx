import { Calendar } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function Header() {
  const { user, selectedViewDate, setSelectedViewDate, todayStr } = useApp();
  if (!user) return null;

  const formatDateDisplay = (dateStr: string) => {
    if (dateStr === todayStr) return 'Today';
    const parts = dateStr.split('-');
    return new Date(`${parts[0]}-${parts[1]}-${parts[2]}`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Morning';
    if (hour < 18) return 'Afternoon';
    return 'Evening';
  };

  return (
    <header className="header-top">
      <div className="greeting">
        <h1>Good {getGreeting()}, {user.name?.split(' ')[0]}</h1>
        <p>Here's your agenda for {selectedViewDate === todayStr ? 'today' : 'this date'}.</p>
      </div>
      <div className="date-picker-btn">
        <Calendar size={16} />
        {formatDateDisplay(selectedViewDate)}
        <input type="date" className="date-picker-input" value={selectedViewDate} onChange={e => setSelectedViewDate(e.target.value || todayStr)} />
      </div>
    </header>
  );
}
