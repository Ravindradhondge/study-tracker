import { Flame, BookOpen, TrendingUp } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { calculateWeeklyProgress } from '../../utils/helpers';

export default function StatsWidget() {
  const { tasks, completedCount, streak } = useApp();
  const { days } = calculateWeeklyProgress(tasks);
  const maxTasks = Math.max(...days.map(d => d.total), 1);

  return (
    <div className="widget-card">
      <div className="widget-header">Your Stats</div>
      <div className="stat-item">
        <div className="stat-icon"><Flame size={20} /></div>
        <div>
          <div className="stat-value">{streak}</div>
          <div className="stat-label">Day Streak</div>
        </div>
      </div>
      <div className="stat-item">
        <div className="stat-icon" style={{ color: 'var(--success)' }}><BookOpen size={20} /></div>
        <div>
          <div className="stat-value">{completedCount}</div>
          <div className="stat-label">Tasks Done Today</div>
        </div>
      </div>
      <div className="weekly-chart">
        <div className="chart-header">
          <TrendingUp size={14} /> This Week
        </div>
        <div className="chart-bars">
          {days.map(day => {
            const height = day.total > 0 ? Math.max((day.completed / maxTasks) * 100, 8) : 4;
            const dayName = new Date(day.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' }).charAt(0);
            return (
              <div key={day.date} className="chart-bar-group">
                <div className="chart-bar-track">
                  <div className="chart-bar" style={{ height: `${height}%` }} data-tooltip={`${day.completed}/${day.total}`}></div>
                </div>
                <span className="chart-label">{dayName}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
