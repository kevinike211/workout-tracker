const Charts = (() => {
  let liftingChart = null;
  let runningChart = null;

  async function init() {
    await populateExerciseSelect();
    await renderLiftingChart();
    await renderRunningChart();
  }

  async function populateExerciseSelect() {
    const workouts = await WorkoutDB.getByType('lifting');
    const exercises = [...new Set(workouts.map(w => w.exercise))].sort();
    const select = document.getElementById('exercise-select');
    if (!select) return;
    if (exercises.length === 0) {
      select.innerHTML = '<option value="">No lifting data yet</option>';
      return;
    }
    select.innerHTML = exercises.map(e => `<option value="${e}">${e}</option>`).join('');
  }

  async function renderLiftingChart() {
    const canvas = document.getElementById('lifting-chart');
    if (!canvas) return;
    const select = document.getElementById('exercise-select');
    const exercise = select?.value;
    if (!exercise) {
      if (liftingChart) { liftingChart.destroy(); liftingChart = null; }
      return;
    }

    const workouts = await WorkoutDB.getByType('lifting');
    const filtered = workouts
      .filter(w => w.exercise === exercise)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    const labels = filtered.map(w => new Date(w.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
    const maxWeights = filtered.map(w => Math.max(...w.sets.map(s => s.weight)));
    const totalVolumes = filtered.map(w => w.sets.reduce((sum, s) => sum + s.reps * s.weight, 0));

    if (liftingChart) liftingChart.destroy();
    liftingChart = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Max Weight (lbs)',
            data: maxWeights,
            borderColor: '#ff8c42',
            backgroundColor: 'rgba(255, 140, 66, 0.1)',
            tension: 0.3,
            fill: true
          },
          {
            label: 'Total Volume (lbs)',
            data: totalVolumes,
            borderColor: '#ffd166',
            backgroundColor: 'rgba(255, 209, 102, 0.1)',
            tension: 0.3,
            fill: true,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { labels: { color: '#ccc' } }
        },
        scales: {
          x: { ticks: { color: '#999' }, grid: { color: '#777' } },
          y: { position: 'left', ticks: { color: '#ff8c42' }, grid: { color: '#777' }, title: { display: true, text: 'Weight (lbs)', color: '#ff8c42' } },
          y1: { position: 'right', ticks: { color: '#ffd166' }, grid: { display: false }, title: { display: true, text: 'Volume (lbs)', color: '#ffd166' } }
        }
      }
    });
  }

  async function renderRunningChart() {
    const canvas = document.getElementById('running-chart');
    if (!canvas) return;

    const workouts = await WorkoutDB.getByType('running');
    workouts.sort((a, b) => new Date(a.date) - new Date(b.date));

    if (workouts.length === 0) {
      if (runningChart) { runningChart.destroy(); runningChart = null; }
      return;
    }

    const labels = workouts.map(w => new Date(w.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
    const distances = workouts.map(w => w.distance);
    const paces = workouts.map(w => w.pace);

    if (runningChart) runningChart.destroy();
    runningChart = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Distance (mi)',
            data: distances,
            borderColor: '#4ecdc4',
            backgroundColor: 'rgba(78, 205, 196, 0.1)',
            tension: 0.3,
            fill: true
          },
          {
            label: 'Pace (min/mi)',
            data: paces,
            borderColor: '#45b7d1',
            backgroundColor: 'rgba(69, 183, 209, 0.1)',
            tension: 0.3,
            fill: true,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { labels: { color: '#ccc' } }
        },
        scales: {
          x: { ticks: { color: '#999' }, grid: { color: '#777' } },
          y: { position: 'left', ticks: { color: '#4ecdc4' }, grid: { color: '#777' }, title: { display: true, text: 'Distance (mi)', color: '#4ecdc4' } },
          y1: { position: 'right', ticks: { color: '#45b7d1' }, grid: { display: false }, title: { display: true, text: 'Pace (min/mi)', color: '#45b7d1' }, reverse: true }
        }
      }
    });
  }

  return { init, renderLiftingChart, renderRunningChart };
})();
