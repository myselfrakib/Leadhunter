import { useState, useEffect, useCallback } from "react";
import {
  subscribeLeads, addLead as fbAdd, updateLead as fbUpdate,
  deleteLead as fbDelete, addSearchHistory, trackEvent
} from "../lib/firebase";

export function useLeads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeLeads((data) => {
      setLeads(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  const saveLead = useCallback(async (lead) => {
    return await fbAdd(lead);
  }, []);

  const saveLeads = useCallback(async (newLeads) => {
    const saved = await Promise.all(newLeads.map(l => fbAdd(l)));
    trackEvent("bulk_leads_saved", { count: newLeads.length });
    return saved;
  }, []);

  const updateLead = useCallback(async (id, updates) => {
    await fbUpdate(id, updates);
  }, []);

  const deleteLead = useCallback(async (id) => {
    await fbDelete(id);
  }, []);

  const saveSearch = useCallback(async (searchParams, resultCount) => {
    await addSearchHistory({ ...searchParams, resultCount });
  }, []);

  return { leads, loading, saveLead, saveLeads, updateLead, deleteLead, saveSearch };
}
