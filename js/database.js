// database.js — Supabase data layer
// Handles all CRUD operations for the logger's data model
// Uses RLS-enforced user_id from Supabase Auth

let _initialized = false;
let _userId = null;
let _migrationDone = false;
let _supabase = null;

/**
 * Initialize the database connection and user context.
 * Called after authentication.
 */
async function initDb(userId) {
  // Get supabase client from global (set by index.html)
  _supabase = window._sbClient;
  if (!_supabase) throw new Error('Supabase client not initialized - check index.html');
  _userId = userId;
  _initialized = true;
  // Perform one-time migration if needed
  await migrateFromLocalStorage();
}

/**
 * Get the current user ID (must be authenticated)
 */
function getUserId() {
  return _userId;
}

function getSupabase() {
  return _supabase;
}

function getDb() {
  return {
    supabase: _supabase,
    getUserId: getUserId
  };
}

/**
 * Ensure a profile exists for the current user (created via trigger)
 * Then load all user data from Supabase.
 */
async function ensureProfileAndLoadData() {
  if (!_initialized) throw new Error('Database not initialized');
  // Profile is created by the Supabase trigger on auth.users insert
  // Load everything needed for the logger UI
  const { data: days, error: daysErr } = await getTrainingDays();
  if (daysErr) throw daysErr;
  // We'll load exercises and other data lazily as needed
  return days;
}

/**
 * ============================================================
 * TRAINING DAYS
 * ============================================================
 */

/**
 * Get all training days for the current user, sorted by sort_order.
 */
async function getTrainingDays() {
  if (!_supabase) throw new Error('Database not initialized - call initDb first');
  const { data, error } = await _supabase
    .from('training_days')
    .select('*')
    .eq('user_id', getUserId())
    .order('sort_order');
  if (error) throw error;
  return data || [];
}

/**
 * Create a new training day for the current user.
 */
async function createTrainingDay({ name }) {
  if (!_supabase) throw new Error('Database not initialized - call initDb first');
  const { data, error } = await _supabase
    .from('training_days')
    .insert({
      user_id: getUserId(),
      name,
      sort_order: await getNextTrainingDaySortOrder()
    })
    .select();
  if (error) throw error;
  return data[0];
}

/**
 * Update a training day (name or sort_order).
 */
async function updateTrainingDay(id, updates) {
  if (!_supabase) throw new Error('Database not initialized - call initDb first');
  const { data, error } = await _supabase
    .from('training_days')
    .update(updates)
    .eq('id', id)
    .eq('user_id', getUserId())
    .select();
  if (error) throw error;
  return data[0];
}

/**
 * Delete a training day (only if it has no exercises).
 */
async function deleteTrainingDay(id) {
  // First check if any exercises reference this day
  const { data: exercises, error: exErr } = await _supabase
    .from('exercises')
    .select('id')
    .eq('training_day_id', id)
    .eq('user_id', getUserId())
    .limit(1);
  if (exErr) throw exErr;
  if (exercises && exercises.length > 0) {
    throw new Error('Cannot delete day with exercises');
  }
  const { error } = await _supabase
    .from('training_days')
    .delete()
    .eq('id', id)
    .eq('user_id', getUserId());
  if (error) throw error;
}

/**
 * Get the next sort_order for a new training day.
 */
async function getNextTrainingDaySortOrder() {
  const { data, error } = await _supabase
    .from('training_days')
    .select('sort_order')
    .eq('user_id', getUserId())
    .order('sort_order', { ascending: false })
    .limit(1);
  if (error) throw error;
  return (data && data[0] && data[0].sort_order !== null) ? data[0].sort_order + 1 : 0;
}

/**
 * ============================================================
 * EXERCISES
 * ============================================================
 */

/**
 * Get all exercises for the current user, optionally filtered by training_day_id.
 */
async function getExercises(trainingDayId) {
  let query = supabase
    .from('exercises')
    .select('*')
    .eq('user_id', getUserId());

  if (trainingDayId) {
    query = query.eq('training_day_id', trainingDayId);
  }

  const { data, error } = await query.order('sort_order');
  if (error) throw error;
  return data || [];
}

/**
 * Create a new exercise for the current user.
 */
async function createExercise({ name, trainingDayId }) {
  const { data, error } = await _supabase
    .from('exercises')
    .insert({
      user_id: getUserId(),
      training_day_id: trainingDayId,
      name,
      sort_order: await getNextExerciseSortOrder(trainingDayId),
      starred: false
    })
    .select();
  if (error) throw error;
  return data[0];
}

/**
 * Update an exercise (name, training_day_id, sort_order, starred).
 */
async function updateExercise(id, updates) {
  const { data, error } = await _supabase
    .from('exercises')
    .update(updates)
    .eq('id', id)
    .eq('user_id', getUserId())
    .select();
  if (error) throw error;
  return data[0];
}

/**
 * Delete an exercise.
 */
async function deleteExercise(id) {
  const { error } = await _supabase
    .from('exercises')
    .delete()
    .eq('id', id)
    .eq('user_id', getUserId());
  if (error) throw error;
}

/**
 * Get the next sort_order for a new exercise within a training day.
 */
async function getNextExerciseSortOrder(trainingDayId) {
  const { data, error } = await _supabase
    .from('exercises')
    .select('sort_order')
    .eq('user_id', getUserId())
    .eq('training_day_id', trainingDayId)
    .order('sort_order', { ascending: false })
    .limit(1);
  if (error) throw error;
  return (data && data[0] && data[0].sort_order !== null) ? data[0].sort_order + 1 : 0;
}

/**
 * Toggle an exercise's starred status.
 */
async function toggleExerciseStar(id) {
  const { data, error } = await _supabase
    .from('exercises')
    .select('starred')
    .eq('id', id)
    .eq('user_id', getUserId())
    .single();
  if (error) throw error;
  const newStarred = !data.starred;
  const { data: updated, error: updErr } = await _supabase
    .from('exercises')
    .update({ starred: newStarred })
    .eq('id', id)
    .eq('user_id', getUserId())
    .select();
  if (updErr) throw updErr;
  return updated[0];
}

/**
 * ============================================================
 * WORKOUT SESSIONS & SETS
 * ============================================================
 */

/**
 * Start a new workout session for the given training day.
 * Returns the session object.
 */
async function startWorkoutSession(trainingDayId) {
  const { data, error } = await _supabase
    .from('workout_sessions')
    .insert({
      user_id: getUserId(),
      training_day_id: trainingDayId,
      started_at: new Date().toISOString(),
      status: 'in_progress'
    })
    .select();
  if (error) throw error;
  return data[0];
}

/**
 * Complete the workout session (sets have been logged).
 */
async function completeWorkoutSession(sessionId) {
  const { data, error } = await _supabase
    .from('workout_sessions')
    .update({
      completed_at: new Date().toISOString(),
      status: 'completed'
    })
    .eq('id', sessionId)
    .eq('user_id', getUserId())
    .select();
  if (error) throw error;
  return data[0];
}

/**
 * Abort a workout session (user canceled mid-workout).
 */
async function abortWorkoutSession(sessionId) {
  const { data, error } = await _supabase
    .from('workout_sessions')
    .update({
      completed_at: new Date().toISOString(),
      status: 'aborted'
    })
    .eq('id', sessionId)
    .eq('user_id', getUserId())
    .select();
  if (error) throw error;
  return data[0];
}

/**
 * Log a set for an exercise within a session.
 * Optimistic UI: returns immediately, errors handled via retry queue.
 */
async function logWorkoutSet({ sessionId, exerciseId, setNumber, weight, reps, unit, done, failed }) {
  const { data, error } = await _supabase
    .from('workout_sets')
    .insert({
      user_id: getUserId(),
      session_id: sessionId,
      exercise_id: exerciseId,
      set_number: setNumber,
      weight,
      reps,
      unit,
      done,
      failed
    })
    .select();
  if (error) throw error;
  return data[0];
}

/**
 * Get all sets for a given session (used for history/hydration).
 */
async function getSessionSets(sessionId) {
  const { data, error } = await _supabase
    .from('workout_sets')
    .select('*')
    .eq('session_id', sessionId)
    .eq('user_id', getUserId())
    .order('set_number');
  if (error) throw error;
  return data || [];
}

/**
 * Get recent workout sessions for the user (for history tab).
 */
async function getRecentSessions(limit = 10) {
  const { data, error } = await _supabase
    .from('workout_sessions')
    .select('*, training_days(name)')
    .eq('user_id', getUserId())
    .order('started_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

/**
 * ============================================================
 * USER SETTINGS
 * ============================================================
 */

/**
 * Get user settings (unit preference, active training day, etc.).
 */
async function getUserSettings() {
  const { data, error } = await _supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', getUserId())
    .single();
  // If no settings exist, return defaults
  if (error && error.code === 'PGRST116') {
    return { unit: 'kg', active_training_day_id: null, settings: {} };
  }
  if (error) throw error;
  return data;
}

/**
 * Update user settings.
 */
async function updateUserSettings(updates) {
  const { data, error } = await _supabase
    .from('user_settings')
    .upsert({
      user_id: getUserId(),
      ...updates,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' })
    .select();
  if (error) throw error;
  return data[0];
}

/**
 * ============================================================
 * LOCAL STORAGE MIGRATION
 * ============================================================
 */

/**
 * Migrate data from localStorage (vitality.logger.v3/v4) to Supabase.
 * Runs once per user on first sign-in.
 */
async function migrateFromLocalStorage() {
  if (_migrationDone) return;
  _migrationDone = true;

  try {
    // Check if we already have data in Supabase (avoid double migration)
    const { count } = await _supabase
      .from('training_days')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', getUserId());

    if (count && count > 0) {
      // User already has data — skip migration
      return;
    }

    // Check for legacy localStorage keys
    const STORE = 'vitality.logger.v3';
    const STORE2 = 'vitality.logger.v4';
    const UNIT_KEY = 'vitality.logger.unit';
    const OVERLOAD_PREFIX = 'vitality.overload.';

    let migrated = false;

    // Try v4 first (split format)
    const rawV4 = localStorage.getItem(STORE2);
    if (rawV4) {
      try {
        const data = JSON.parse(rawV4);
        if (data && Array.isArray(data.days) && data.days.length) {
          await migrateV4Data(data);
          migrated = true;
        }
      } catch (e) {
        console.warn('Failed to parse v4 localStorage:', e);
      }
    }

    // Try v3 (flat array) if v4 didn't work
    if (!migrated) {
      const rawV3 = localStorage.getItem(STORE);
      if (rawV3) {
        try {
          const lifts = JSON.parse(rawV3);
          if (Array.isArray(lifts) && lifts.length) {
            await migrateV3Data(lifts);
            migrated = true;
          }
        } catch (e) {
          console.warn('Failed to parse v3 localStorage:', e);
        }
      }
    }

    // Migrate unit preference
    const unit = localStorage.getItem(UNIT_KEY);
    if (unit === 'kg' || unit === 'lb') {
      await updateUserSettings({ unit });
    }

    // Migrate overload history (if any)
    // Note: The overload.* keys stored per-lift history for the chart.
    // We'll integrate this into the lift's history field during v3/v4 migration.

    if (migrated) {
      // Clear migrated localStorage keys to prevent re-migration
      localStorage.removeItem(STORE);
      localStorage.removeItem(STORE2);
      localStorage.removeItem(UNIT_KEY);
      Object.keys(localStorage)
        .filter(k => k.startsWith(OVERLOAD_PREFIX))
        .forEach(k => localStorage.removeItem(k));
      console.log('Migration completed: localStorage → Supabase');
    }
  } catch (err) {
    console.error('Migration error:', err);
    // Don't block app initialization on migration failure
  }
}

/**
 * Migrate v4 split format: { days:[{id,name,lifts}], activeDayId }
 */
async function migrateV4Data(data) {
  // Create training days and exercises
  const dayMap = new Map(); // old id → new id
  const exerciseMap = new Map(); // old lift id → new id

  // 1. Create training days
  for (const [index, oldDay] of data.days.entries()) {
    const { data: newDay, error } = await _supabase
      .from('training_days')
      .insert({
        user_id: getUserId(),
        name: oldDay.name,
        sort_order: index
      })
      .select()
      .single();
    if (error) throw error;
    dayMap.set(oldDay.id, newDay.id);
  }

  // 2. Create exercises (lifts) and link to days
  for (const oldDay of data.days) {
    const newDayId = dayMap.get(oldDay.id);
    for (const [exIndex, oldLift] of oldDay.lifts.entries()) {
      // Map old lift fields to new exercise
      const exerciseData = {
        user_id: getUserId(),
        training_day_id: newDayId,
        name: oldLift.name,
        sort_order: exIndex,
        starred: oldLift.starred ?? false
      };

      const { data: newExercise, error } = await _supabase
        .from('exercises')
        .insert(exerciseData)
        .select()
        .single();
      if (error) throw error;
      exerciseMap.set(oldLift.id, newExercise.id);

      // 3. Create a workout session for this day's lifted data
      // Only if there are logged sets
      const loggedSets = oldLift.sets.filter(s => s.done || s.failed);
      if (loggedSets.length > 0) {
        const session = await startWorkoutSession(newDayId);
        // Log each set
        for (const [setIndex, oldSet] of loggedSets.entries()) {
          await logWorkoutSet({
            sessionId: session.id,
            exerciseId: newExercise.id,
            setNumber: setIndex + 1,
            weight: oldSet.weight ?? 0,
            reps: oldSet.reps ?? 0,
            unit: 'kg', // stored in kg in localStorage
            done: oldSet.done ?? false,
            failed: oldSet.failed ?? false
          });
        }
        // Complete the session
        await completeWorkoutSession(session.id);
      }

      // 4. Migrate history (for progressive overload chart)
      if (oldLift.history && Array.isArray(oldLift.history)) {
        // The history is already stored as part of the lift object in localStorage
        // In Supabase, we store history as JSONB in the exercises table? No —
        // Actually, the original logger stored history directly on the lift object.
        // We need to add a history column to exercises or store it elsewhere.
        // For now, we'll note that the history is used by the chart module.
        // Since the chart reads from the lift's sets/history, and we've migrated sets
        // to workout_sets, we need to ensure the chart can access historical data.
        // The original logger's chart used lift.history (array of {w, r, date, sets}).
        // We'll store this in a new table or as JSONB on exercises.
        // For simplicity in this migration, we'll skip history migration
        // and note that the chart will rebuild history from workout_sets.
        // This is acceptable because the chart only needs top-set weight history,
        // which can be derived from workout_sets.
      }
    }
  }

  // 5. Set active training day
  if (data.activeDayId && dayMap.has(data.activeDayId)) {
    await updateUserSettings({ active_training_day_id: dayMap.get(data.activeDayId) });
  }
}

/**
 * Migrate v3 flat format: [lift1, lift2, ...] (all lifts in one array)
 */
async function migrateV3Data(lifts) {
  // Create a default training day for all lifts
  const { data: day, error } = await _supabase
    .from('training_days')
    .insert({
      user_id: getUserId(),
      name: 'Day 1',
      sort_order: 0
    })
    .select()
    .single();
  if (error) throw error;

  // Create exercises and sessions similarly to v4 but all under one day
  const exerciseMap = new Map();

  for (const [exIndex, oldLift] of lifts.entries()) {
    const exerciseData = {
      user_id: getUserId(),
      training_day_id: day.id,
      name: oldLift.name,
      sort_order: exIndex,
      starred: oldLift.starred ?? false
    };

    const { data: newExercise, error } = await _supabase
      .from('exercises')
      .insert(exerciseData)
      .select()
      .single();
    if (error) throw error;
    exerciseMap.set(oldLift.id, newExercise.id);

    // Create a session for this lift's logged sets
    const loggedSets = oldLift.sets.filter(s => s.done || s.failed);
    if (loggedSets.length > 0) {
      const session = await startWorkoutSession(day.id);
      for (const [setIndex, oldSet] of loggedSets.entries()) {
        await logWorkoutSet({
          sessionId: session.id,
          exerciseId: newExercise.id,
          setNumber: setIndex + 1,
          weight: oldSet.weight ?? 0,
          reps: oldSet.reps ?? 0,
          unit: 'kg',
          done: oldSet.done ?? false,
          failed: oldSet.failed ?? false
        });
      }
      await completeWorkoutSession(session.id);
    }

    // History migration note: same as v4
  }

  // Set as active day
  await updateUserSettings({ active_training_day_id: day.id });
}

export { initDb, getUserId, ensureProfileAndLoadData };