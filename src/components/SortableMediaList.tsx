"use client";

import { useCallback, useMemo } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
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
import type { Media } from "@/types/media";

type Props = {
  fullOrderedIds: string[];
  filteredItems: Media[];
  optimisticReorder: (orderedIds: string[]) => void;
  refetch: () => Promise<void>;
  containerClass: string;
  isList: boolean;
  renderItem: (media: Media, reorderMode: boolean) => React.ReactNode;
};

function SortableItem({
  id,
  media,
  isList,
  renderItem,
}: {
  id: string;
  media: Media;
  isList: boolean;
  renderItem: (media: Media, reorderMode: boolean) => React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  if (isDragging) {
    style.zIndex = 50;
    style.scale = "1.05";
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`select-none ${isDragging ? "opacity-90 shadow-2xl shadow-[#8b5cf6]/30 touch-none" : "reorder-jiggle"}`}
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
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 10 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 220, tolerance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (over == null || active.id === over.id) {
        return;
      }

      const oldIndex = filteredItems.findIndex((m) => m.id === active.id);
      const newIndex = filteredItems.findIndex((m) => m.id === over.id);
      if (oldIndex === -1 || newIndex === -1) {
        return;
      }

      const reorderedFiltered = arrayMove(
        filteredItems.map((m) => m.id),
        oldIndex,
        newIndex
      );
      const filteredSet = new Set(reorderedFiltered);

      // Build new global order: keep non-filtered ids in place; put reordered filtered ids into their original indices
      const indicesOfFiltered = fullOrderedIds
        .map((id, i) => (filteredSet.has(id) ? i : -1))
        .filter((i) => i >= 0);
      const newOrder = fullOrderedIds.slice();
      reorderedFiltered.forEach((id, j) => {
        newOrder[indicesOfFiltered[j]] = id;
      });

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
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={itemIds} strategy={strategy}>
        <div className={containerClass}>
          {filteredItems.map((m) => (
            <SortableItem
              key={m.id}
              id={m.id}
              media={m}
              isList={isList}
              renderItem={renderItem}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
