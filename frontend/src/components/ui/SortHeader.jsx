import { ChevronUp, ChevronDown } from 'lucide-react';

export default function SortHeader({ label, col, currentCol, direction, onClick, align = 'left' }) {
  const isActive = col === currentCol;
  return (
    <th
      onClick={() => onClick(col)}
      className="sortable-header"
      style={{
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        textAlign: align,
        userSelect: 'none',
      }}
      data-active={isActive ? 'true' : 'false'}
      data-dir={isActive ? direction : undefined}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, justifyContent: align === 'right' ? 'flex-end' : 'flex-start' }}>
        <span>{label}</span>
        {isActive && (
          direction === 'asc'
            ? <ChevronUp size={14} color="var(--color-primary)" />
            : <ChevronDown size={14} color="var(--color-primary)" />
        )}
      </span>
    </th>
  );
}
