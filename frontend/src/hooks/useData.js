import { useState, useEffect, useCallback } from "react";
import { sessionsApi, insightsApi } from "../services/api";

// ── useSessions ───────────────────────────────────────────────────────────────
export function useSessions(params = {}) {
  const [data, setData] = useState({ sessions: [], pagination: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const key = JSON.stringify(params);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    sessionsApi.list(params)
      .then((res) => {
        if (!cancelled) setData(res.data.data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.error || "Failed to load sessions");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  return { ...data, loading, error };
}

// ── useSession ────────────────────────────────────────────────────────────────
export function useSession(id) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);

    sessionsApi.get(id)
      .then((res) => { if (!cancelled) setSession(res.data.data.session); })
      .catch((err) => { if (!cancelled) setError(err.response?.data?.error || "Failed to load session"); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [id]);

  return { session, loading, error };
}

// ── useStats ──────────────────────────────────────────────────────────────────
export function useStats(params = {}) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    sessionsApi.stats(params)
      .then((res) => setStats(res.data.data.stats))
      .catch((err) => setError(err.response?.data?.error || "Failed to load stats"))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { stats, loading, error };
}

// ── useInsight ────────────────────────────────────────────────────────────────
export function useInsight(sessionId) {
  const [insight, setInsight] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!sessionId) return;
    setLoading(true);
    insightsApi.get(sessionId)
      .then((res) => setInsight(res.data.data.insight))
      .catch(() => setInsight(null))
      .finally(() => setLoading(false));
  }, [sessionId]);

  const generate = useCallback(async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await insightsApi.generate(sessionId);
      setInsight(res.data.data.insight);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to generate insight");
    } finally {
      setGenerating(false);
    }
  }, [sessionId]);

  return { insight, loading, generating, error, generate };
}

// ── useInsights list ──────────────────────────────────────────────────────────
export function useInsights(params = {}) {
  const [data, setData] = useState({ insights: [], pagination: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    insightsApi.list(params)
      .then((res) => setData(res.data.data))
      .catch((err) => setError(err.response?.data?.error || "Failed to load insights"))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { ...data, loading, error };
}
