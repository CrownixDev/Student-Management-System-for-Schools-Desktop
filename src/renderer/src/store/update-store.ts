import { create } from "zustand";
import { UpdateCheckResult } from "../../../types";

interface UpdateStore {
  fetchedUpdate: UpdateCheckResult | null;
  setFetchedUpdate: (data: UpdateCheckResult | null) => void;
}

export const useUpdateStore = create<UpdateStore>((set) => ({
  fetchedUpdate: null,
  setFetchedUpdate: (data: UpdateCheckResult | null) =>
    set({ fetchedUpdate: data }),
}));
