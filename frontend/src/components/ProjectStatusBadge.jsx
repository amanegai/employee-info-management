import { projectStatusLabel } from '../utils/projectWorkflow';

export default function ProjectStatusBadge({ status, className = '' }) {
  if (!status) return null;
  const statusClass = status.toLowerCase();
  return (
    <span className={`project-status-badge project-status-${statusClass}${className ? ` ${className}` : ''}`}>
      {projectStatusLabel(status)}
    </span>
  );
}
