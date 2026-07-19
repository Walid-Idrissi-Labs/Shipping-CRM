import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import KanbanCard from './KanbanCard';
import { statusVariant } from '../lib/statuses';

const VARIANT_ACCENT = {
  success: 'var(--color-vivid-green-dark)',
  warning: 'var(--color-warning)',
  danger: 'var(--color-danger)',
  info: 'var(--color-primary)',
  neutral: 'var(--color-smoke)',
};

export default function KanbanColumn({ column, renderCard, onCardClick, isDraggable }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const accent = VARIANT_ACCENT[statusVariant(column.id)] || VARIANT_ACCENT.neutral;

  return (
    <div
      style={{
        minWidth: 280,
        width: 280,
        flexShrink: 0,
        background: 'var(--color-bone)',
        borderRadius: 12,
        borderTop: `3px solid ${accent}`,
        borderRight: isOver ? '2px dashed var(--color-primary)' : '1px solid var(--color-ash)',
        borderBottom: isOver ? '2px dashed var(--color-primary)' : '1px solid var(--color-ash)',
        borderLeft: isOver ? '2px dashed var(--color-primary)' : '1px solid var(--color-ash)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'border 160ms ease',
      }}
    >
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--color-ash)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--color-graphite)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          {column.title}
        </span>
        <span
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: accent,
            background: 'var(--color-paper-white)',
            borderRadius: 9999,
            padding: '2px 8px',
            minWidth: 20,
            textAlign: 'center',
          }}
        >
          {column.items.length}
        </span>
      </div>
      <SortableContext
        id={column.id}
        items={column.items.map((i) => i.id)}
        strategy={verticalListSortingStrategy}
      >
        <div
          ref={setNodeRef}
          style={{
            padding: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            flex: 1,
            minHeight: 60,
          }}
        >
          {column.items.map((item) => (
            <KanbanCard
              key={item.id}
              id={item.id}
              data={item}
              renderCard={renderCard}
              onClick={() => onCardClick?.(item)}
              disabled={isDraggable ? !isDraggable(item) : false}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}
