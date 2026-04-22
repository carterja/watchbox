"use client";

import { useCallback, useMemo, useRef } from "react";
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCorners,
  pointerWithin,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import { mergeFilteredReorder } from "@/lib/reorderFiltered";
import type { Media } from "@/types/media";

/** Prefer droppables under the pointer; grids fall back to corners (better than center-only). */
const sortableCollision: CollisionDetection = (args) => {
  const pointerHits = pointerWithin(args);
  if (pointerHits.length > 0) return pointerHits;
  return closestCorners(args);
};

type Props = {
  fullOrderedIds: string[];
  filteredItems: Media[];
  optimisticReorder: (orderedIds: string[]) => void;
  refetch: () => Promise<void>;
  containerClass: string;
  /** Compact list vs grid/poster — controls sortable strategy. */
  isList: boolean;
  renderItem: (media: Media, reorderMode: boolean) => React.ReactNode;
};

function SortableItem({
  id,
  media,
  renderItem,
}: {
  id: string;
  media: Media;
  renderItem: (media: Media, reorderMode: boolean) => React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
    active,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const activeId = active?.id ?? null;
  const isDropTarget =
    Boolean(activeId) && activeId !== id && isOver && !isDragging;

  if (isDragging) {
    style.zIndex = 50;
    style.scale = "1.03";
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`select-none ${
        isDragging
          ? "touch-none rounded-xl opacity-95 shadow-2xl shadow-[#8b5cf6]/35 ring-2 ring-[#a78bfa]"
          : "reorder-jiggle"
      } ${isDropTarget ? "reorder-swap-target" : ""}`}
      {...attributes}
      {...listeners}
    >
      {renderItem(media, true)}
    </div>
  );
}

export function SortableMediaList({
  fullOrderedIds,
  filteredItems,
  optimisticReorder,
  refetch,
  containerClass,
  isList,
  renderItem,
}: Props) {
  /** Touch / overlay drops often yield `over: null`; keep last collision target. */
  const lastOverIdRef = useRef<string | null>(null);

  const handleDragStart = useCallback((_event: DragStartEvent) => {
    lastOverIdRef.current = null;
  }, []);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active } = event;
      const activeIdStr = String(active.id);
      let overIdStr: string | null =
        event.over?.id != null ? String(event.over.id) : null;
      if (overIdStr == null && lastOverIdRef.current != null) {
        overIdStr = lastOverIdRef.current;
      }
      lastOverIdRef.current = null;

      if (overIdStr == null || activeIdStr === overIdStr) {
        return;
      }

      const oldIndex = filteredItems.findIndex((m) => m.id === activeIdStr);
      const newIndex = filteredItems.findIndex((m) => m.id === overIdStr);
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
        return;
      }

      const filteredIdsInOrder = filteredItems.map((m) => m.id);
      const reorderedFiltered = arrayMove(filteredIdsInOrder, oldIndex, newIndex);

      const newOrder = mergeFilteredReorder(
        fullOrderedIds,
        filteredIdsInOrder,
        reorderedFiltered
      );

      const unchanged = newOrder.every((id, i) => id === fullOrderedIds[i]);
      if (unchanged) {
        return;
      }

      optimisticReorder(newOrder);
      try {
        const res = await fetch("/api/media/reorder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderedIds: newOrder }),
        });
        if (res.ok) {
          await refetch();
          toast.success("Order saved");
        } else {
          await refetch();
          toast.error("Could not save order");
        }
      } catch {
        await refetch();
        toast.error("Could not save order");
      }
    },
    [filteredItems, fullOrderedIds, optimisticReorder, refetch]
  );

  const strategy = isList ? verticalListSortingStrategy : rectSortingStrategy;
  const itemIds = useMemo(() => filteredItems.map((m) => m.id), [filteredItems]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={sortableCollision}
      onDragStart={handleDragStart}
      onDragOver={({ over }) => {
        if (over?.id != null) {
          lastOverIdRef.current = String(over.id);
        }
      }}
      onDragCancel={() => {
        lastOverIdRef.current = null;
      }}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={itemIds} strategy={strategy}>
        <div className={containerClass}>
          {filteredItems.map((m) => (
            <SortableItem key={m.id} id={m.id} media={m} renderItem={renderItem} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
