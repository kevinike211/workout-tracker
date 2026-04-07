const WorkoutDB = (() => {
  const DB_NAME = 'WorkoutTrackerDB';
  const DB_VERSION = 1;
  const STORE_NAME = 'workouts';
  let db = null;

  function open() {
    return new Promise((resolve, reject) => {
      if (db) return resolve(db);
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (e) => {
        const database = e.target.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          const store = database.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
          store.createIndex('date', 'date', { unique: false });
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('exercise', 'exercise', { unique: false });
        }
      };
      request.onsuccess = (e) => {
        db = e.target.result;
        resolve(db);
      };
      request.onerror = (e) => reject(e.target.error);
    });
  }

  function add(workout) {
    return open().then(db => new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.add(workout);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    }));
  }

  function getAll() {
    return open().then(db => new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    }));
  }

  function getByType(type) {
    return open().then(db => new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('type');
      const request = index.getAll(type);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    }));
  }

  function update(workout) {
    return open().then(db => new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(workout);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    }));
  }

  function remove(id) {
    return open().then(db => new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    }));
  }

  function get(id) {
    return open().then(db => new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    }));
  }

  return { open, add, getAll, getByType, get, update, remove };
})();
