"use client";

import { useCallback, useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
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
import { GripVertical } from "lucide-react";
import type { Media } from "@/types/media";

type Props = {
  fullOrderedIds: string[];
  filteredItems: Media[];
  onReorderSuccess: () => void;
  containerClass: string;
  isList: boolean;
  renderItem: (media: Media) => React.ReactNode;
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
  renderItem: (media: Media) => React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative ${isDragging ? "z-50 opacity-80" : ""}`}
    >
      <div
        className={`absolute left-0 top-0 z-10 flex items-center justify-center cursor-grab active:cursor-grabbing touch-none text-shelf-muted hover:text-white ${isList ? "h-full w-8" : "h-10 w-10 rounded-br"}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical size={18} className="shrink-0" />
      </div>
      <div className={isList ? "pl-8" : "pt-6"}>
        {renderItem(media)}
      </div>
    </div>
  );
}

export function SortableMediaList({
  fullOrderedIds,
  filteredItems,
  onReorderSuccess,
  containerClass,
  isList,
  renderItem,
}: Props) {
  const [isReordering, setIsReordering] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (over == null || active.id === over.id) {
        setIsReordering(false);
        return;
      }

      const oldIndex = filteredItems.findIndex((m) => m.id === active.id);
      const newIndex = filteredItems.findIndex((m) => m.id === over.id);
      if (oldIndex === -1 || newIndex === -1) {
        setIsReordering(false);
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

      setIsReordering(true);
      try {
        const res = await fetch("/api/media/reorder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderedIds: newOrder }),
        });
        if (res.ok) {
          onReorderSuccess();
        }
      } finally {
        setIsReordering(false);
      }
    },
    [filteredItems, fullOrderedIds, onReorderSuccess]
  );

  const strategy = isList ? verticalListSortingStrategy : rectSortingStrategy;
  const itemIds = filteredItems.map((m) => m.id);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={() => setIsReordering(true)}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setIsReordering(false)}
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
