import type { Task, Section } from '../types';

export function exportTasksToCSV(tasks: Task[], sections: Section[]): string {
  const headers = ['Title', 'Completed', 'Section', 'Tag', 'Priority', 'Duration (mins)', 'Date', 'Notes'];
  const rows = tasks.map(task => {
    const section = sections.find(s => s.id === task.type);
    return [
      `"${task.title}"`,
      task.completed ? 'Yes' : 'No',
      section?.name || task.type,
      task.tag || '',
      task.priority || 'medium',
      task.duration?.toString() || '',
      task.date || '',
      `"${(task.notes || '').replace(/"/g, '""')}"`
    ].join(',');
  });
  return [headers.join(','), ...rows].join('\n');
}

export function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function exportTasksToPDF(tasks: Task[], sections: Section[]) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const rows = tasks.map(task => {
    const section = sections.find(s => s.id === task.type);
    return `<tr>
      <td>${task.title}</td>
      <td>${task.completed ? '✅' : '⬜'}</td>
      <td>${section?.name || task.type}</td>
      <td>${task.tag || '-'}</td>
      <td>${task.priority || 'medium'}</td>
      <td>${task.duration ? task.duration + ' min' : '-'}</td>
      <td>${task.date || '-'}</td>
    </tr>`;
  }).join('');

  printWindow.document.write(`<!DOCTYPE html><html><head><title>Study Tracker Export</title>
    <style>
      body { font-family: system-ui, sans-serif; padding: 40px; color: #1a1a1a; }
      h1 { color: #0891b2; margin-bottom: 24px; }
      table { width: 100%; border-collapse: collapse; margin-top: 20px; }
      th, td { border: 1px solid #e2e8f0; padding: 10px 14px; text-align: left; font-size: 14px; }
      th { background: #f1f5f9; font-weight: 600; }
      tr:nth-child(even) { background: #f8fafc; }
      .completed { opacity: 0.6; text-decoration: line-through; }
      @media print { body { padding: 20px; } }
    </style></head><body>
    <h1>📋 Study Tracker Report</h1>
    <p>Generated: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
    <p>Total Tasks: ${tasks.length} | Completed: ${tasks.filter(t => t.completed).length}</p>
    <table><thead><tr><th>Title</th><th>Status</th><th>Section</th><th>Tag</th><th>Priority</th><th>Duration</th><th>Date</th></tr></thead>
    <tbody>${rows}</tbody></table>
    <script>window.onload = () => window.print();</script>
    </body></html>`);
  printWindow.document.close();
}
