import { useState, useEffect, useCallback } from "react";
import {
  subscribeLeads, addLead, updateLead as fbUpdate,
  deleteLead as fbDelete, addSearchHistory, trackEvent
} from "../lib/firebase";
import { useAuth } from "./useAuth";

export function useLeads() {
  const { user } = useAuth();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLeads([]); setLoading(false); return; }
    const unsub = subscribeLeads(user.uid, (data) => {
      setLeads(data);
      setLoading(false);
    });
    return unsub;
  }, [user]);

  const saveLead = useCallback(async (lead) => {
    if (!user) return;
    const id = await addLead(user.uid, lead);
    return id;
  }, [user]);

  const saveLeads = useCallback(async (newLeads) => {
    if (!user) return;
    const saved = await Promise.all(newLeads.map(l => addLead(user.uid, l)));
    trackEvent("bulk_leads_saved", { count: newLeads.length });
    return saved;
  }, [user]);

  const updateLead = useCallback(async (id, updates) => {
    if (!user) return;
    await fbUpdate(user.uid, id, updates);
  }, [user]);

  const deleteLead = useCallback(async (id) => {
    if (!user) return;
    await fbDelete(user.uid, id);
  }, [user]);

  const saveSearch = useCallback(async (searchParams, resultCount) => {
    if (!user) return;
    await addSearchHistory(user.uid, { ...searchParams, resultCount });
  }, [user]);

  return { leads, loading, saveLead, saveLeads, updateLead, deleteLead, saveSearch };
}
