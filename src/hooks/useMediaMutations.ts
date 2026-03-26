"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { useMediaList } from "@/contexts/MediaListContext";
import type { MediaUpdatePatch } from "@/types/media";

export function useMediaMutations() {
  const { refetch, optimisticUpdate, optimisticRemove } = useMediaList();

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm("Remove this from your list?")) return;
      optimisticRemove(id);
      try {
        const res = await fetch(`/api/media/${id}`, { method: "DELETE" });
        if (res.ok) {
          toast.success("Removed");
        } else {
          await refetch();
          toast.error("Could not remove");
        }
      } catch {
        await refetch();
        toast.error("Could not remove");
      }
    },
    [refetch, optimisticRemove]
  );

  const handleUpdate = useCallback(
    async (id: string, patch: MediaUpdatePatch) => {
      optimisticUpdate(id, patch);
      try {
        const res = await fetch(`/api/media/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        if (res.ok) {
          await refetch();
          if (patch.status === "finished") toast.success("Marked as finished");
          else toast.success("Updated");
        } else {
          await refetch();
          toast.error("Could not update");
        }
      } catch {
        await refetch();
        toast.error("Could not update");
      }
    },
    [refetch, optimisticUpdate]
  );

  return { handleDelete, handleUpdate };
}
