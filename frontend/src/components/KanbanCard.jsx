import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export default function KanbanCard({ id, data, renderCard, onClick, disabled }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
  };

  if (disabled) {
    return (
      <div
        ref={setNodeRef}
        style={{ ...style, cursor: 'not-allowed' }}
        className="kanban-card kanban-card-disabled"
        onClick={(e) => {
          e.stopPropagation();
          onClick?.(e);
        }}
      >
        {renderCard ? renderCard(data) : null}
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        if (isDragging) return;
        onClick?.(e);
      }}
      className="kanban-card"
    >
      {renderCard ? renderCard(data) : null}
    </div>
  );
}
