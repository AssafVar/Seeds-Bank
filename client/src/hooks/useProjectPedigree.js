import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  createLine as apiCreateLine,
  createPlants as apiCreatePlants,
  createPopulation as apiCreatePopulation,
  deleteLine as apiDeleteLine,
  deletePopulation as apiDeletePopulation,
  deleteProjectPlant,
  getPlantCounts,
  getPlants,
  getProjectOverview,
  renameLine as apiRenameLine,
  setLineStable,
  updatePlantParents,
  updatePlantTraits,
} from "../services/serverCalls";

export const SEARCH_DEBOUNCE_MS = 300;
const POSITIVE_INT = /^[1-9]\d{0,8}$/;

// URL state is untrusted: `line` must be a positive integer, `latest` exactly
// "1". Anything else is ignored.
export const parseFilterParams = (searchParams) => {
  const rawLine = searchParams.get("line");
  return {
    lineId: rawLine !== null && POSITIVE_INT.test(rawLine) ? Number(rawLine) : null,
    latestOnly: searchParams.get("latest") === "1",
  };
};

const EMPTY_COUNTS = { total: 0, byLine: {}, byPopulation: {} };

const toCounts = (data) => ({
  total: data?.total ?? 0,
  byLine: Object.fromEntries((data?.lines ?? []).map((l) => [l.lineId, l.count])),
  byPopulation: Object.fromEntries((data?.populations ?? []).map((p) => [p.populationId, p.count])),
});

// Maps a failed overview load to a state that never echoes the response body.
const toLoadError = (err) => {
  const status = err?.response?.status;
  if (status === 403 || status === 404) return { kind: "no-access", status };
  return { kind: "failed", status: status ?? null };
};

const replaceLine = (lines, line) =>
  lines.some((l) => l.id === line.id) ? lines.map((l) => (l.id === line.id ? line : l)) : [...lines, line];

export default function useProjectPedigree({ userId, projectId, pageSize = 25 }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { lineId, latestOnly } = parseFilterParams(searchParams);

  const [headers, setHeaders] = useState(null);
  const [lines, setLines] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [loadError, setLoadError] = useState(null);
  const [q, setQState] = useState("");
  const [counts, setCounts] = useState(EMPTY_COUNTS);
  const [expandedLineIds, setExpandedLineIds] = useState(() => new Set());
  const [expandedPopulationIds, setExpandedPopulationIds] = useState(() => new Set());
  const [plantsByPopulation, setPlantsByPopulation] = useState({});
  const [drafts, setDrafts] = useState({});
  const [undoQueue, setUndoQueue] = useState([]);

  // Refs hold the latest values for async callbacks (no stale closures).
  const live = useRef({});
  live.current = { userId, projectId, pageSize, q, lineId, latestOnly, expandedPopulationIds, plantsByPopulation };
  const plantTokens = useRef({});
  const countsToken = useRef(0);

  const loadPlants = useCallback(async (populationId, page, { append = false } = {}) => {
    const { userId: u, projectId: p, pageSize: size, q: query, plantsByPopulation: cache } = live.current;
    const nextPage = page ?? cache[populationId]?.page ?? 1;
    const token = (plantTokens.current[populationId] = (plantTokens.current[populationId] ?? 0) + 1);
    setPlantsByPopulation((prev) => ({
      ...prev,
      [populationId]: { items: [], page: nextPage, pageSize: size, totalCount: 0, ...prev[populationId], status: "loading" },
    }));
    try {
      const result = await getPlants(u, p, { populationId, q: query, page: nextPage, pageSize: size });
      if (token !== plantTokens.current[populationId]) return;
      setPlantsByPopulation((prev) => ({
        ...prev,
        [populationId]: {
          items: append ? [...(prev[populationId]?.items ?? []), ...(result.items ?? [])] : result.items ?? [],
          page: result.page ?? nextPage,
          pageSize: result.pageSize ?? size,
          totalCount: result.totalCount ?? 0,
          status: "ready",
        },
      }));
    } catch (err) {
      if (token !== plantTokens.current[populationId]) return;
      setPlantsByPopulation((prev) => ({
        ...prev,
        [populationId]: { items: [], page: nextPage, pageSize: size, totalCount: 0, ...prev[populationId], status: "error" },
      }));
    }
  }, []);

  const reloadExpanded = useCallback(
    (pageOverride) => {
      live.current.expandedPopulationIds.forEach((id) => loadPlants(id, pageOverride));
    },
    [loadPlants]
  );

  const reloadOverview = useCallback(async () => {
    const { userId: u, projectId: p } = live.current;
    const data = await getProjectOverview(u, p);
    setHeaders(data.projectHeaders ?? null);
    setLines(data.lines ?? []);
    return data;
  }, []);

  const reloadCounts = useCallback(async () => {
    const { userId: u, projectId: p, q: query, lineId: line, latestOnly: latest } = live.current;
    const token = ++countsToken.current;
    try {
      const data = await getPlantCounts(u, p, { q: query, lineId: line, latestOnly: latest ? true : undefined });
      if (token !== countsToken.current) return null;
      const next = toCounts(data);
      setCounts(next);
      return next;
    } catch (err) {
      return null;
    }
  }, []);

  const refreshAfterChange = useCallback(async () => {
    await Promise.all([reloadOverview().catch(() => null), reloadCounts()]);
  }, [reloadOverview, reloadCounts]);

  // Initial load, and again when the project changes.
  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setLoadError(null);
    setPlantsByPopulation({});
    setExpandedPopulationIds(new Set());
    setExpandedLineIds(new Set());
    plantTokens.current = {};
    getProjectOverview(userId, projectId)
      .then((data) => {
        if (cancelled) return;
        setHeaders(data.projectHeaders ?? null);
        setLines(data.lines ?? []);
        setStatus("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(toLoadError(err));
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [userId, projectId]);

  // Counts follow filters and (debounced) search. Loaded pages follow them too.
  const firstFilterRun = useRef(true);
  useEffect(() => {
    if (status !== "ready") return undefined;
    const immediate = firstFilterRun.current;
    firstFilterRun.current = false;
    const timer = setTimeout(
      async () => {
        const next = await reloadCounts();
        if (live.current.q && next) {
          const matching = Object.entries(next.byPopulation)
            .filter(([, count]) => count > 0)
            .map(([id]) => Number(id));
          setExpandedPopulationIds((prev) => new Set([...prev, ...matching]));
          matching.forEach((id) => loadPlants(id, 1));
        }
        if (!immediate) reloadExpanded(1);
      },
      immediate ? 0 : live.current.q ? SEARCH_DEBOUNCE_MS : 0
    );
    return () => clearTimeout(timer);
  }, [status, q, lineId, latestOnly, reloadCounts, reloadExpanded, loadPlants]);

  const setSearchText = useCallback((value) => setQState(String(value ?? "").slice(0, 100)), []);

  const updateFilters = useCallback(
    (changes) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if ("lineId" in changes) {
          if (changes.lineId === null || changes.lineId === undefined) next.delete("line");
          else next.set("line", String(changes.lineId));
        }
        if ("latestOnly" in changes) {
          if (changes.latestOnly) next.set("latest", "1");
          else next.delete("latest");
        }
        return next;
      });
    },
    [setSearchParams]
  );
  const clearFilters = useCallback(() => {
    updateFilters({ lineId: null, latestOnly: false });
    setQState("");
  }, [updateFilters]);

  const toggleLine = useCallback((id) => {
    setExpandedLineIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const expandPopulation = useCallback(
    (id) => {
      setExpandedPopulationIds((prev) => new Set(prev).add(id));
      live.current.expandedPopulationIds = new Set(live.current.expandedPopulationIds).add(id);
      loadPlants(id, 1);
    },
    [loadPlants]
  );

  const togglePopulation = useCallback(
    (id) => {
      if (live.current.expandedPopulationIds.has(id)) {
        setExpandedPopulationIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      } else {
        expandPopulation(id);
      }
    },
    [expandPopulation]
  );

  const goToPage = useCallback((populationId, page) => loadPlants(populationId, page), [loadPlants]);
  const loadMore = useCallback(
    (populationId) => {
      const current = live.current.plantsByPopulation[populationId];
      return loadPlants(populationId, (current?.page ?? 1) + 1, { append: true });
    },
    [loadPlants]
  );

  const setDraft = useCallback((plantId, partial) => setDrafts((prev) => ({ ...prev, [plantId]: { ...prev[plantId], ...partial } })), []);
  const clearDraft = useCallback((plantId) => setDrafts((prev) => {
    const { [plantId]: removed, ...rest } = prev;
    return rest;
  }), []);

  // ---- undo slot (single visible, the rest queue) ----
  const pushUndo = useCallback((label, action) => setUndoQueue((prev) => [...prev, { label, action }]), []);
  const dismissUndo = useCallback(() => setUndoQueue((prev) => prev.slice(1)), []);
  const runUndo = useCallback(async () => {
    const [current] = undoQueue;
    if (!current) return;
    setUndoQueue((prev) => prev.slice(1));
    await current.action();
  }, [undoQueue]);

  // ---- mutations (all rethrow; callers show extractErrorMessage) ----
  const createPlants = useCallback(
    async (body) => {
      const { userId: u, projectId: p } = live.current;
      const result = await apiCreatePlants(u, p, body);
      const created = result.plants ?? [];
      if (result.line) setLines((prev) => replaceLine(prev, result.line));
      const touched = [...new Set(created.map((pl) => pl.populationId))];
      await refreshAfterChange();
      touched.forEach((id) => {
        setExpandedPopulationIds((prev) => new Set(prev).add(id));
        live.current.expandedPopulationIds = new Set(live.current.expandedPopulationIds).add(id);
        loadPlants(id, 1);
      });
      if (result.line) setExpandedLineIds((prev) => new Set(prev).add(result.line.id));
      if (created.length === 1) {
        const [plant] = created;
        pushUndo(`Added ${plant.tag}.`, async () => {
          await deleteProjectPlant(u, p, plant.plantId);
          await refreshAfterChange();
          loadPlants(plant.populationId, 1);
        });
      }
      return result;
    },
    [loadPlants, pushUndo, refreshAfterChange]
  );

  const updateTraits = useCallback(
    async (plantId, populationId, body) => {
      const { userId: u, projectId: p } = live.current;
      try {
        const plant = await updatePlantTraits(u, p, plantId, body);
        setPlantsByPopulation((prev) => {
          const page = prev[populationId];
          if (!page) return prev;
          return { ...prev, [populationId]: { ...page, items: page.items.map((i) => (i.plantId === plantId ? plant : i)) } };
        });
        clearDraft(plantId);
        reloadOverview().catch(() => null);
        return plant;
      } catch (err) {
        if (err?.response?.status === 409) loadPlants(populationId);
        throw err;
      }
    },
    [clearDraft, loadPlants, reloadOverview]
  );

  const updateParents = useCallback(
    async (current, body) => {
      const { userId: u, projectId: p } = live.current;
      const { plantId, populationId: oldPopulationId } = current;
      const oldMother = current.mother?.plantId ?? null;
      const oldFather = current.father?.plantId ?? null;
      try {
        const result = await updatePlantParents(u, p, plantId, body);
        const { plant } = result;
        if (result.line) setLines((prev) => replaceLine(prev, result.line));
        await refreshAfterChange();
        [oldPopulationId, plant.populationId].forEach((id) => {
          if (id !== undefined && id !== null && live.current.expandedPopulationIds.has(id)) loadPlants(id);
        });
        // Undo needs both old parents; a plant whose parent was removed cannot be restored.
        if (oldMother && oldFather) {
          pushUndo(`${plant.tag} is now ${plant.label} (was ${result.previousLabel}).`, async () => {
            await updatePlantParents(u, p, plantId, {
              motherPlantId: oldMother,
              fatherPlantId: oldFather,
              lineId: result.previousLineId,
              startNewLine: false,
              version: plant.version, // version after the first write (old version + 1)
            });
            await refreshAfterChange();
            reloadExpanded();
          });
        }
        return result;
      } catch (err) {
        if (err?.response?.status === 409) loadPlants(oldPopulationId);
        throw err;
      }
    },
    [loadPlants, pushUndo, refreshAfterChange, reloadExpanded]
  );

  const deletePlant = useCallback(
    async (plantId, confirm = false) => {
      const { userId: u, projectId: p } = live.current;
      const result = await deleteProjectPlant(u, p, plantId, confirm);
      await refreshAfterChange();
      reloadExpanded();
      return result;
    },
    [reloadExpanded, refreshAfterChange]
  );

  const createLine = useCallback(
    async (body) => {
      const { userId: u, projectId: p } = live.current;
      const line = await apiCreateLine(u, p, body);
      setLines((prev) => replaceLine(prev, line));
      reloadOverview().catch(() => null);
      return line;
    },
    [reloadOverview]
  );

  const renameLine = useCallback(
    async (lineIdToRename, body) => {
      const { userId: u, projectId: p } = live.current;
      const result = await apiRenameLine(u, p, lineIdToRename, body);
      setLines((prev) => replaceLine(replaceLine(prev, result.oldLine), result.newLine));
      pushUndo(`Created ${result.newLine.name} from ${result.oldLine.name}.`, async () => {
        await apiDeleteLine(u, p, result.newLine.id);
        await refreshAfterChange();
      });
      return result;
    },
    [pushUndo, refreshAfterChange]
  );

  const markStable = useCallback(
    async (lineIdToMark, isStable) => {
      const { userId: u, projectId: p } = live.current;
      const line = await setLineStable(u, p, lineIdToMark, isStable);
      setLines((prev) => replaceLine(prev, line));
      pushUndo(isStable ? `${line.name} marked stable.` : `${line.name} marked not stable.`, async () => {
        const reverted = await setLineStable(u, p, lineIdToMark, !isStable);
        setLines((prev) => replaceLine(prev, reverted));
      });
      return line;
    },
    [pushUndo]
  );

  const createPopulation = useCallback(
    async (body) => {
      const { userId: u, projectId: p } = live.current;
      const population = await apiCreatePopulation(u, p, body);
      await reloadOverview().catch(() => null);
      return population;
    },
    [reloadOverview]
  );

  const deletePopulation = useCallback(
    async (populationId) => {
      const { userId: u, projectId: p } = live.current;
      await apiDeletePopulation(u, p, populationId);
      setExpandedPopulationIds((prev) => {
        const next = new Set(prev);
        next.delete(populationId);
        return next;
      });
      await refreshAfterChange();
    },
    [refreshAfterChange]
  );

  const filters = useMemo(() => ({ lineId, latestOnly, q }), [lineId, latestOnly, q]);

  return {
    headers,
    lines,
    status,
    loadError,
    filters,
    counts,
    expandedLineIds,
    expandedPopulationIds,
    plantsByPopulation,
    drafts,
    undo: undoQueue[0] ?? null,
    setSearchText,
    setLineFilter: (id) => updateFilters({ lineId: id }),
    setLatestOnly: (value) => updateFilters({ latestOnly: value }),
    clearFilters,
    toggleLine,
    togglePopulation,
    expandPopulation,
    goToPage,
    loadMore,
    setDraft,
    clearDraft,
    reload: reloadOverview,
    dismissUndo,
    runUndo,
    createPlants,
    updateTraits,
    updateParents,
    deletePlant,
    createLine,
    renameLine,
    markStable,
    createPopulation,
    deletePopulation,
  };
}
