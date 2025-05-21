const persistence = {
  STORAGE_KEY: 'deckBuilder',
  
  save(state) {
    try {
      const serialized = JSON.stringify(state);
      localStorage.setItem(this.STORAGE_KEY, serialized);
      return true;
    } catch (error) {
      console.error('Failed to save state:', error);
      return false;
    }
  },
  
  load() {
    try {
      const serialized = localStorage.getItem(this.STORAGE_KEY);
      if (!serialized) return null;
      return JSON.parse(serialized);
    } catch (error) {
      console.error('Failed to load state:', error);
      return null;
    }
  },
  
  clear() {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      return true;
    } catch (error) {
      console.error('Failed to clear state:', error);
      return false;
    }
  }
};