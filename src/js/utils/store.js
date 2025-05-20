const createStore = (initialState) => {
  let state = { ...initialState };
  const listeners = [];
  
  return {
    getState: () => ({ ...state }),
    setState: (newState) => {
      state = { ...state, ...newState };
      console.log('Store state updated:', state);
      listeners.forEach(listener => listener(state));
    },
    subscribe: (listener) => {
      listeners.push(listener);
      return () => {
        const index = listeners.indexOf(listener);
        if (index > -1) listeners.splice(index, 1);
      };
    }
  };
};