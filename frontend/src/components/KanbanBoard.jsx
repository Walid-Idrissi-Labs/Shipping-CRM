import { useEffect, useRef, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import KanbanCard from './KanbanCard';
import KanbanColumn from './KanbanColumn';

const BLOCKED_COLUMN = 'en_mission';

function findContainer(id, columns) {
  if (id == null) return null;
  for (const col of columns) {
    if (col.items.some((i) => i.id === id)) return col.id;
  }
  for (const col of columns) {
    if (col.id === id) return col.id;
  }
  return null;
}

export default function KanbanBoard({ columns, onDragEnd, renderCard, onCardClick, isDraggable }) {
  const [activeId, setActiveId] = useState(null);
  const containerRef = useRef(null);
  const [scrollState, setScrollState] = useState({ left: false, right: false });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;

    const update = () => {
      const { scrollLeft, scrollWidth, clientWidth } = el;
      setScrollState({
        left: scrollLeft > 4,
        right: scrollLeft + clientWidth < scrollWidth - 4,
      });
    };

    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', update);
      ro.disconnect();
    };
  }, [columns]);

  const activeItem = (() => {
    if (activeId == null) return null;
    for (const col of columns) {
      const found = col.items.find((i) => i.id === activeId);
      if (found) return found;
    }
    return null;
  })();

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const activeContainer = findContainer(active.id, columns);
    const overContainer = findContainer(over.id, columns);
    if (!activeContainer || !overContainer) return;
    if (activeContainer === overContainer) return;

    if (activeContainer === BLOCKED_COLUMN || overContainer === BLOCKED_COLUMN) return;

    const sourceColumn = columns.find((c) => c.id === activeContainer);
    if (sourceColumn) {
      const dragged = sourceColumn.items.find((i) => i.id === active.id);
      if (dragged && isDraggable && !isDraggable(dragged)) return;
    }

    onDragEnd?.(active.id, overContainer);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={(e) => setActiveId(e.active.id)}
      onDragCancel={() => setActiveId(null)}
      onDragEnd={handleDragEnd}
    >
      <div style={{ position: 'relative' }}>
        <div
          ref={containerRef}
          style={{
            display: 'flex',
            gap: 16,
            overflowX: 'auto',
            paddingBottom: 12,
            minHeight: 200,
            scrollbarWidth: 'thin',
          }}
        >
          {columns.map((col) => (
            <KanbanColumn
              key={col.id}
              column={col}
              renderCard={renderCard}
              onCardClick={onCardClick}
              isDraggable={isDraggable}
            />
          ))}
        </div>
        {scrollState.left && (
          <div
            aria-hidden
            style={{
              position: 'absolute',
              top: 0,
              bottom: 12,
              left: 0,
              width: 40,
              pointerEvents: 'none',
              background:
                'linear-gradient(to right, rgba(15, 23, 42, 0.18) 0%, rgba(15, 23, 42, 0.06) 60%, transparent 100%)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
              maskImage:
                'linear-gradient(to right, black 0%, black 40%, transparent 100%)',
              WebkitMaskImage:
                'linear-gradient(to right, black 0%, black 40%, transparent 100%)',
            }}
          />
        )}
        {scrollState.right && (
          <div
            aria-hidden
            style={{
              position: 'absolute',
              top: 0,
              bottom: 12,
              right: 0,
              width: 40,
              pointerEvents: 'none',
              background:
                'linear-gradient(to left, rgba(15, 23, 42, 0.18) 0%, rgba(15, 23, 42, 0.06) 60%, transparent 100%)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
              maskImage:
                'linear-gradient(to left, black 0%, black 40%, transparent 100%)',
              WebkitMaskImage:
                'linear-gradient(to left, black 0%, black 40%, transparent 100%)',
            }}
          />
        )}
      </div>
      <DragOverlay dropAnimation={null}>
        {activeItem ? (
          <div
            style={{
              background: 'var(--color-paper-white)',
              border: '1px solid var(--color-ash)',
              borderRadius: 8,
              padding: 12,
              width: 256,
              boxShadow: '0 8px 20px rgba(15, 23, 42, 0.18)',
              transform: 'rotate(2deg)',
            }}
          >
            {renderCard ? renderCard(activeItem) : null}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
