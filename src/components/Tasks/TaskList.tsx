import { useApp } from '../../context/AppContext';
import TaskCard from './TaskCard';

export default function TaskList() {
  const { displayTasks, activeTab, sections } = useApp();

  const sectionName = activeTab === 'overview' ? 'All Tasks' : (sections.find(s => s.id === activeTab)?.name || activeTab) + ' Tasks';

  if (displayTasks.length === 0) {
    return (
      <div className="task-list-section">
        <h3 className="task-list-header">{sectionName}</h3>
        <div className="empty-state">No tasks to show for this view. Enjoy your free time!</div>
      </div>
    );
  }

  const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
  const sortedTasks = [...displayTasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    // Sort by scheduled time (tasks with time come first, earlier times first)
    if (a.time && b.time) {
      if (a.time !== b.time) return a.time.localeCompare(b.time);
    } else if (a.time && !b.time) return -1;
    else if (!a.time && b.time) return 1;
    const pA = a.priority || 'medium';
    const pB = b.priority || 'medium';
    return priorityOrder[pA] - priorityOrder[pB];
  });

  return (
    <div className="task-list-section">
      <h3 className="task-list-header">{sectionName}</h3>
      <div className="task-list">
        {sortedTasks.map(task => <TaskCard key={task.id} task={task} />)}
      </div>
    </div>
  );
}
