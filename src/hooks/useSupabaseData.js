import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export const useSupabaseData = (tableName, transform = {}) => {
  const { user } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const { toDb = (x) => x, fromDb = (x) => x } = transform;

  useEffect(() => {
    if (!user) {
      setData([]);
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      const { data: rows, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        console.error(`Error fetching ${tableName}:`, error);
      } else {
        setData(rows.map(fromDb));
      }
      setLoading(false);
    };

    fetchData();

    const channel = supabase
      .channel(`${tableName}_changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: tableName,
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setData((prev) => {
              // Avoid duplicates if we already added optimistically
              if (prev.some(item => item.id === payload.new.id)) return prev;
              return [...prev, fromDb(payload.new)];
            });
          } else if (payload.eventType === 'UPDATE') {
            setData((prev) =>
              prev.map((item) =>
                item.id === payload.new.id ? fromDb(payload.new) : item
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setData((prev) => prev.filter((item) => item.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, tableName, fromDb]);

  const upsert = useCallback(
    async (item) => {
      if (!user) return { error: 'Not authenticated' };

      const dbItem = toDb({ ...item, user_id: user.id });
      
      // Optimistically update local state
      setData((prev) => {
        const exists = prev.some((i) => i.id === item.id);
        if (exists) {
          return prev.map((i) => (i.id === item.id ? item : i));
        }
        return [...prev, item];
      });

      const { error } = await supabase.from(tableName).upsert(dbItem);

      if (error) {
        console.error(`Error upserting ${tableName}:`, error);
        // Revert on error - refetch data
        const { data: rows } = await supabase
          .from(tableName)
          .select('*')
          .eq('user_id', user.id);
        if (rows) setData(rows.map(fromDb));
      }
      return { error };
    },
    [user, tableName, toDb, fromDb]
  );

  const remove = useCallback(
    async (id) => {
      if (!user) return { error: 'Not authenticated' };

      // Optimistically remove from local state
      setData((prev) => prev.filter((item) => item.id !== id));

      const { error } = await supabase.from(tableName).delete().eq('id', id);

      if (error) {
        console.error(`Error deleting from ${tableName}:`, error);
        // Revert on error - refetch data
        const { data: rows } = await supabase
          .from(tableName)
          .select('*')
          .eq('user_id', user.id);
        if (rows) setData(rows.map(fromDb));
      }
      return { error };
    },
    [user, tableName, fromDb]
  );

  return { data, loading, upsert, remove };
};

export const usePomodoroSettings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState({
    work: 25,
    shortBreak: 5,
    longBreak: 15,
    sessionsBeforeLong: 4,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchSettings = async () => {
      const { data, error } = await supabase
        .from('pomodoro_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setSettings({
          work: data.work,
          shortBreak: data.short_break,
          longBreak: data.long_break,
          sessionsBeforeLong: data.sessions_before_long,
        });
      }
      setLoading(false);
    };

    fetchSettings();
  }, [user]);

  const updateSettings = useCallback(
    async (newSettings) => {
      if (!user) return;

      setSettings(newSettings);

      const { error } = await supabase.from('pomodoro_settings').upsert({
        user_id: user.id,
        work: newSettings.work,
        short_break: newSettings.shortBreak,
        long_break: newSettings.longBreak,
        sessions_before_long: newSettings.sessionsBeforeLong,
      });

      if (error) console.error('Error updating pomodoro settings:', error);
    },
    [user]
  );

  return { settings, loading, updateSettings };
};

export const useUserNotes = () => {
  const { user } = useAuth();
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setNotes('');
      setLoading(false);
      return;
    }

    const fetchNotes = async () => {
      const { data, error } = await supabase
        .from('user_notes')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setNotes(data.content || '');
      }
      setLoading(false);
    };

    fetchNotes();
  }, [user]);

  const saveNotes = useCallback(
    async (content) => {
      if (!user) return;

      setNotes(content);

      const { error } = await supabase.from('user_notes').upsert({
        user_id: user.id,
        content: content,
      });

      if (error) console.error('Error saving notes:', error);
    },
    [user]
  );

  return { notes, loading, saveNotes };
};

export const useWeeklyFocus = () => {
  const { user } = useAuth();
  const [weeklyFocus, setWeeklyFocus] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setWeeklyFocus('');
      setLoading(false);
      return;
    }

    const fetchWeeklyFocus = async () => {
      const { data, error } = await supabase
        .from('weekly_focus')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setWeeklyFocus(data.content || '');
      }
      setLoading(false);
    };

    fetchWeeklyFocus();
  }, [user]);

  const saveWeeklyFocus = useCallback(
    async (content, weekStart) => {
      if (!user) return;

      setWeeklyFocus(content);

      const { error } = await supabase.from('weekly_focus').upsert({
        user_id: user.id,
        content: content,
        week_start: weekStart,
        updated_at: new Date().toISOString(),
      });

      if (error) console.error('Error saving weekly focus:', error);
    },
    [user]
  );

  return { weeklyFocus, loading, saveWeeklyFocus };
};
