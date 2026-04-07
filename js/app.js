const App = (() => {
  let currentTab = 'log';
  let editingId = null;
  let returnToLastWorkout = false;
  let returnToDate = null;

  function init() {
    renderTabs();
    showTab('history');
    document.getElementById('tab-bar').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-tab]');
      if (btn) showTab(btn.dataset.tab);
    });
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').then(() => {
        console.log('Service worker registered');
      });
    }
  }

  function renderTabs() {
    document.getElementById('tab-bar').innerHTML = `
      <button data-tab="log" class="tab-btn">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Log
      </button>
      <button data-tab="history" class="tab-btn active">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        History
      </button>
      <button data-tab="progress" class="tab-btn">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
        Progress
      </button>
    `;
  }

  function showTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    const content = document.getElementById('content');
    if (tab === 'log') renderLogTab(content);
    else if (tab === 'history') renderHistoryTab(content);
    else if (tab === 'progress') renderProgressTab(content);
  }

  function renderLogTab(container) {
    editingId = null;
    container.innerHTML = `
      <h1>Log Workout</h1>
      <div class="workout-type-toggle">
        <button id="type-lifting" class="toggle-btn active" onclick="App.setLogType('lifting')">Lifting</button>
        <button id="type-running" class="toggle-btn" onclick="App.setLogType('running')">Running</button>
      </div>
      <form id="workout-form">
        <div class="field">
          <label>Date</label>
          <input type="date" id="workout-date" value="${new Date().toISOString().slice(0, 10)}" max="${new Date().toISOString().slice(0, 10)}">
        </div>
        <div id="form-fields"></div>
        <button type="submit" class="btn-primary">Save Workout</button>
      </form>
      <div id="save-feedback" class="feedback hidden"></div>
    `;
    document.getElementById('workout-form').addEventListener('submit', (e) => {
      e.preventDefault();
      saveWorkout(e);
    });
    setLogType('lifting');
  }

  function setLogType(type) {
    document.getElementById('type-lifting').classList.toggle('active', type === 'lifting');
    document.getElementById('type-running').classList.toggle('active', type === 'running');
    const fields = document.getElementById('form-fields');
    if (type === 'lifting') {
      fields.innerHTML = `
        <input type="hidden" name="type" value="lifting">
        <div class="field">
          <label>Exercise</label>
          <input type="text" name="exercise" placeholder="e.g. Bench Press" required list="exercise-suggestions">
          <datalist id="exercise-suggestions"></datalist>
        </div>
        <div id="sets-container">
          <label>Sets</label>
          <div class="set-row" data-set="0">
            <input type="number" name="reps[]" placeholder="Reps" min="1" required>
            <span class="multiply">x</span>
            <input type="number" name="weight[]" placeholder="Weight (lbs)" min="0" step="0.5" required>
          </div>
          <div class="set-row" data-set="1">
            <input type="number" name="reps[]" placeholder="Reps" min="1" required>
            <span class="multiply">x</span>
            <input type="number" name="weight[]" placeholder="Weight (lbs)" min="0" step="0.5" required>
            <button type="button" class="btn-remove" onclick="this.parentElement.remove()">x</button>
          </div>
          <div class="set-row" data-set="2">
            <input type="number" name="reps[]" placeholder="Reps" min="1" required>
            <span class="multiply">x</span>
            <input type="number" name="weight[]" placeholder="Weight (lbs)" min="0" step="0.5" required>
            <button type="button" class="btn-remove" onclick="this.parentElement.remove()">x</button>
          </div>
        </div>
        <button type="button" class="btn-secondary" onclick="App.addSet()">+ Add Set</button>
        <div class="field">
          <label>Notes</label>
          <textarea name="notes" placeholder="Optional notes..." rows="2"></textarea>
        </div>
      `;
      populateExerciseSuggestions();
      initSetAutofill();
    } else {
      fields.innerHTML = `
        <input type="hidden" name="type" value="running">
        <div class="field">
          <label>Distance (miles)</label>
          <input type="number" name="distance" placeholder="e.g. 3.1" min="0.1" step="0.01" required>
        </div>
        <div class="field">
          <label>Duration</label>
          <div class="duration-inputs">
            <input type="number" name="hours" placeholder="HH" min="0" max="23">
            <span>:</span>
            <input type="number" name="minutes" placeholder="MM" min="0" max="59" required>
            <span>:</span>
            <input type="number" name="seconds" placeholder="SS" min="0" max="59">
          </div>
        </div>
        <div class="field">
          <label>Notes</label>
          <textarea name="notes" placeholder="Optional notes..." rows="2"></textarea>
        </div>
      `;
    }
  }

  function addSet() {
    const container = document.getElementById('sets-container');
    const row = document.createElement('div');
    row.className = 'set-row';
    row.innerHTML = `
      <input type="number" name="reps[]" placeholder="Reps" min="1" required>
      <span class="multiply">x</span>
      <input type="number" name="weight[]" placeholder="Weight (lbs)" min="0" step="0.5" required>
      <button type="button" class="btn-remove" onclick="this.parentElement.remove()">x</button>
    `;
    container.appendChild(row);
  }

  function initSetAutofill() {
    const firstRow = document.querySelector('.set-row[data-set="0"]');
    if (!firstRow) return;
    const touched = new Set();
    document.getElementById('sets-container').addEventListener('input', (e) => {
      const row = e.target.closest('.set-row');
      if (!row) return;
      if (row.dataset.set === '0') {
        const reps = firstRow.querySelector('input[name="reps[]"]').value;
        const weight = firstRow.querySelector('input[name="weight[]"]').value;
        document.querySelectorAll('.set-row:not([data-set="0"])').forEach(r => {
          const repsInput = r.querySelector('input[name="reps[]"]');
          const weightInput = r.querySelector('input[name="weight[]"]');
          if (!touched.has(repsInput)) repsInput.value = reps;
          if (!touched.has(weightInput)) weightInput.value = weight;
        });
      } else {
        touched.add(e.target);
      }
    });
  }

  const DEFAULT_EXERCISES = [
    // Chest
    'Bench Press', 'Incline Bench Press', 'Decline Bench Press',
    'Dumbbell Bench Press', 'Dumbbell Fly', 'Cable Fly', 'Push-Up',
    // Back
    'Deadlift', 'Barbell Row', 'Dumbbell Row', 'Pull-Up', 'Chin-Up',
    'Lat Pulldown', 'Seated Cable Row', 'T-Bar Row',
    // Shoulders
    'Overhead Press', 'Dumbbell Shoulder Press', 'Lateral Raise',
    'Front Raise', 'Face Pull', 'Upright Row', 'Arnold Press',
    // Legs
    'Squat', 'Front Squat', 'Leg Press', 'Lunge', 'Bulgarian Split Squat',
    'Romanian Deadlift', 'Leg Curl', 'Leg Extension', 'Calf Raise',
    'Hip Thrust', 'Goblet Squat',
    // Arms
    'Barbell Curl', 'Dumbbell Curl', 'Hammer Curl', 'Preacher Curl',
    'Tricep Pushdown', 'Skull Crusher', 'Overhead Tricep Extension',
    'Tricep Dip',
    // Core
    'Plank', 'Hanging Leg Raise', 'Cable Crunch', 'Ab Rollout',
    // Compound / Olympic
    'Clean and Press', 'Power Clean', 'Snatch', 'Thruster'
  ];

  async function populateExerciseSuggestions() {
    const workouts = await WorkoutDB.getByType('lifting');
    const logged = workouts.map(w => w.exercise);
    const all = [...new Set([...logged, ...DEFAULT_EXERCISES])].sort();
    const datalist = document.getElementById('exercise-suggestions');
    if (datalist) {
      datalist.innerHTML = all.map(e => `<option value="${e}">`).join('');
    }
  }

  async function saveWorkout(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const type = formData.get('type');
    const dateInput = document.getElementById('workout-date').value;
    const now = dateInput ? new Date(dateInput + 'T12:00:00') : new Date();

    let workout;
    if (type === 'lifting') {
      const reps = formData.getAll('reps[]').map(Number);
      const weights = formData.getAll('weight[]').map(Number);
      const sets = reps.map((r, i) => ({ reps: r, weight: weights[i] }));
      workout = {
        type: 'lifting',
        exercise: formData.get('exercise').trim(),
        sets,
        notes: formData.get('notes') || '',
        date: now.toISOString(),
        dateStr: now.toLocaleDateString()
      };
    } else {
      const hours = Number(formData.get('hours') || 0);
      const minutes = Number(formData.get('minutes') || 0);
      const seconds = Number(formData.get('seconds') || 0);
      const totalMinutes = hours * 60 + minutes + seconds / 60;
      const distance = Number(formData.get('distance'));
      workout = {
        type: 'running',
        distance,
        durationMinutes: totalMinutes,
        pace: distance > 0 ? totalMinutes / distance : 0,
        notes: formData.get('notes') || '',
        date: now.toISOString(),
        dateStr: now.toLocaleDateString()
      };
    }

    const isEditing = editingId !== null;
    if (isEditing) {
      workout.id = editingId;
      await WorkoutDB.update(workout);
      editingId = null;
    } else {
      await WorkoutDB.add(workout);
    }
    if (returnToLastWorkout) {
      returnToLastWorkout = false;
      const goToDate = returnToDate;
      returnToDate = null;
      showTab('history');
      // renderHistoryTab is async — wait a tick for it to finish, then override the date
      setTimeout(() => {
        if (goToDate) {
          document.getElementById('history-date-filter').value = goToDate;
          document.getElementById('clear-date').classList.remove('hidden');
          loadHistory('all');
        }
      }, 50);
      return;
    }
    const feedback = document.getElementById('save-feedback');
    feedback.textContent = isEditing ? 'Workout updated!' : 'Workout saved!';
    feedback.classList.remove('hidden');
    form.reset();
    setLogType(type);
    document.querySelector('.btn-primary').textContent = 'Save Workout';
    setTimeout(() => feedback.classList.add('hidden'), 2000);
  }

  async function renderHistoryTab(container) {
    const allWorkouts = await WorkoutDB.getAll();
    const exercises = [...new Set(allWorkouts.filter(w => w.type === 'lifting').map(w => w.exercise))].sort();

    // Find the most recent workout date for the "Last Workout" button
    const sorted = [...allWorkouts].sort((a, b) => new Date(b.date) - new Date(a.date));
    const lastDate = sorted.length > 0 ? new Date(sorted[0].date).toISOString().slice(0, 10) : '';

    container.innerHTML = `
      <h1>History</h1>
      <div class="filter-bar">
        <button class="filter-btn" data-filter="all">All</button>
        <button class="filter-btn" data-filter="lifting">Lifting</button>
        <button class="filter-btn" data-filter="running">Running</button>
        <button class="filter-btn active" data-filter="last">Last Workout</button>
      </div>
      <div class="history-filters">
        <div id="exercise-filter" class="exercise-filter hidden">
          <select id="exercise-filter-select">
            <option value="">All Exercises</option>
            ${exercises.map(e => `<option value="${e}">${e}</option>`).join('')}
          </select>
        </div>
        <div class="date-filter">
          <label>Date</label>
          <input type="date" id="history-date-filter" max="${new Date().toISOString().slice(0, 10)}">
          <button class="btn-clear-date hidden" id="clear-date" title="Clear date">x</button>
        </div>
      </div>
      <div id="history-list"><p class="loading">Loading...</p></div>
    `;

    container.querySelector('.filter-bar').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-filter]');
      if (!btn) return;
      container.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const exerciseFilter = document.getElementById('exercise-filter');
      const dateInput = document.getElementById('history-date-filter');
      const clearBtn = document.getElementById('clear-date');

      if (btn.dataset.filter === 'lifting') {
        exerciseFilter.classList.remove('hidden');
      } else {
        exerciseFilter.classList.add('hidden');
        document.getElementById('exercise-filter-select').value = '';
      }

      if (btn.dataset.filter === 'last') {
        dateInput.value = lastDate;
        clearBtn.classList.remove('hidden');
        loadHistory('all');
      } else {
        dateInput.value = '';
        clearBtn.classList.add('hidden');
        loadHistory(btn.dataset.filter);
      }
    });

    document.getElementById('exercise-filter-select').addEventListener('change', () => {
      loadHistory('lifting');
    });

    document.getElementById('history-date-filter').addEventListener('change', (e) => {
      const clearBtn = document.getElementById('clear-date');
      if (e.target.value) {
        clearBtn.classList.remove('hidden');
      } else {
        clearBtn.classList.add('hidden');
      }
      const activeFilter = document.querySelector('.filter-btn.active')?.dataset.filter;
      loadHistory(activeFilter === 'last' ? 'all' : activeFilter || 'all');
    });

    document.getElementById('clear-date').addEventListener('click', () => {
      document.getElementById('history-date-filter').value = '';
      document.getElementById('clear-date').classList.add('hidden');
      // Reset "Last Workout" button to "All" if active
      const activeBtn = document.querySelector('.filter-btn.active');
      if (activeBtn?.dataset.filter === 'last') {
        container.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        container.querySelector('[data-filter="all"]').classList.add('active');
      }
      loadHistory(document.querySelector('.filter-btn.active')?.dataset.filter || 'all');
    });

    // Default to Last Workout view
    if (lastDate) {
      document.getElementById('history-date-filter').value = lastDate;
      document.getElementById('clear-date').classList.remove('hidden');
    }
    loadHistory('all');
  }

  async function loadHistory(filter) {
    const list = document.getElementById('history-list');
    let workouts = filter === 'all' ? await WorkoutDB.getAll() : await WorkoutDB.getByType(filter);

    if (filter === 'lifting') {
      const exerciseVal = document.getElementById('exercise-filter-select')?.value;
      if (exerciseVal) {
        workouts = workouts.filter(w => w.exercise === exerciseVal);
      }
    }

    // Apply date filter
    const dateVal = document.getElementById('history-date-filter')?.value;
    if (dateVal) {
      workouts = workouts.filter(w => new Date(w.date).toISOString().slice(0, 10) === dateVal);
    }

    workouts.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (workouts.length === 0) {
      list.innerHTML = '<p class="empty-state">No workouts yet. Start logging!</p>';
      return;
    }

    list.innerHTML = workouts.map(w => {
      if (w.type === 'lifting') {
        const setsStr = w.sets.map(s => `${s.reps} x ${s.weight} lbs`).join(', ');
        return `
          <div class="workout-card lifting">
            <div class="card-header">
              <span class="card-type lifting-badge">Lifting</span>
              <span class="card-date">${formatDate(w.date)}</span>
              <button class="btn-log" onclick="App.logExercise('lifting', '${escapeAttr(w.exercise)}', '${new Date(w.date).toISOString().slice(0, 10)}')">Log</button>
              <button class="btn-edit" onclick="App.editWorkout(${w.id})">Edit</button>
              <button class="btn-delete" onclick="App.deleteWorkout(${w.id})">Delete</button>
            </div>
            <h3>${escapeHtml(w.exercise)}</h3>
            <p class="card-detail">${setsStr}</p>
            ${w.notes ? `<p class="card-notes">${escapeHtml(w.notes)}</p>` : ''}
          </div>
        `;
      } else {
        const paceMin = Math.floor(w.pace);
        const paceSec = Math.round((w.pace - paceMin) * 60);
        return `
          <div class="workout-card running">
            <div class="card-header">
              <span class="card-type running-badge">Running</span>
              <span class="card-date">${formatDate(w.date)}</span>
              <button class="btn-log" onclick="App.logExercise('running', '', '${new Date(w.date).toISOString().slice(0, 10)}')">Log</button>
              <button class="btn-edit" onclick="App.editWorkout(${w.id})">Edit</button>
              <button class="btn-delete" onclick="App.deleteWorkout(${w.id})">Delete</button>
            </div>
            <h3>${w.distance} mi</h3>
            <p class="card-detail">${formatDuration(w.durationMinutes)} &bull; ${paceMin}:${String(paceSec).padStart(2, '0')} /mi pace</p>
            ${w.notes ? `<p class="card-notes">${escapeHtml(w.notes)}</p>` : ''}
          </div>
        `;
      }
    }).join('');
  }

  async function deleteWorkout(id) {
    await WorkoutDB.remove(id);
    loadHistory(document.querySelector('.filter-btn.active')?.dataset.filter || 'all');
  }

  async function editWorkout(id) {
    const w = await WorkoutDB.get(id);
    if (!w) return;
    showTab('log');
    editingId = id;

    // Set date
    const dateVal = new Date(w.date).toISOString().slice(0, 10);
    document.getElementById('workout-date').value = dateVal;

    // Set type and fill fields
    setLogType(w.type);

    if (w.type === 'lifting') {
      document.querySelector('input[name="exercise"]').value = w.exercise;
      document.querySelector('textarea[name="notes"]').value = w.notes || '';

      // Replace default set rows with the saved sets
      const container = document.getElementById('sets-container');
      const existingRows = container.querySelectorAll('.set-row');
      existingRows.forEach(r => r.remove());

      w.sets.forEach((s, i) => {
        const row = document.createElement('div');
        row.className = 'set-row';
        row.dataset.set = String(i);
        row.innerHTML = `
          <input type="number" name="reps[]" placeholder="Reps" min="1" required value="${s.reps}">
          <span class="multiply">x</span>
          <input type="number" name="weight[]" placeholder="Weight (lbs)" min="0" step="0.5" required value="${s.weight}">
          ${i > 0 ? '<button type="button" class="btn-remove" onclick="this.parentElement.remove()">x</button>' : ''}
        `;
        container.appendChild(row);
      });
      initSetAutofill();
    } else {
      document.querySelector('input[name="distance"]').value = w.distance;
      const totalMin = w.durationMinutes || 0;
      const h = Math.floor(totalMin / 60);
      const m = Math.floor(totalMin % 60);
      const s = Math.round((totalMin % 1) * 60);
      document.querySelector('input[name="hours"]').value = h || '';
      document.querySelector('input[name="minutes"]').value = m;
      document.querySelector('input[name="seconds"]').value = s || '';
      document.querySelector('textarea[name="notes"]').value = w.notes || '';
    }

    // Update button text
    document.querySelector('.btn-primary').textContent = 'Update Workout';
  }

  function renderProgressTab(container) {
    container.innerHTML = `
      <h1>Progress</h1>
      <div class="progress-section">
        <h2>Lifting Progress</h2>
        <div class="field">
          <label>Select Exercise</label>
          <select id="exercise-select" onchange="Charts.renderLiftingChart()">
            <option value="">Loading...</option>
          </select>
        </div>
        <canvas id="lifting-chart"></canvas>
      </div>
      <div class="progress-section">
        <h2>Running Progress</h2>
        <canvas id="running-chart"></canvas>
      </div>
    `;
    Charts.init();
  }

  function formatDate(isoStr) {
    const d = new Date(isoStr);
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  }

  function formatDuration(totalMin) {
    const h = Math.floor(totalMin / 60);
    const m = Math.floor(totalMin % 60);
    const s = Math.round((totalMin % 1) * 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m ${s}s`;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function escapeAttr(str) {
    return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
  }

  function logExercise(type, exerciseName, dateStr) {
    returnToLastWorkout = true;
    returnToDate = dateStr || null;
    showTab('log');
    setLogType(type);
    if (type === 'lifting' && exerciseName) {
      document.querySelector('input[name="exercise"]').value = exerciseName;
    }
  }

  return { init, setLogType, addSet, saveWorkout, deleteWorkout, editWorkout, logExercise, showTab };
})();

document.addEventListener('DOMContentLoaded', App.init);
