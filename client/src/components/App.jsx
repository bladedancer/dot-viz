import React, { useState, useEffect } from 'react';
import GraphContainer from './GraphContainer.jsx';
import GraphSource from './GraphSource.jsx';
import WithLoading from './WithLoading.jsx';

const App = () => {
  const GraphWithLoading = WithLoading(GraphContainer)
  const [appState, setAppState] = useState({
    loading: true
  });

  useEffect(() => {
    setAppState({ loading: true });
    fetch('/api/wait')
      .then(() => {
        setAppState({ loading: false });
      });
  }, [setAppState]);

  return (
      <GraphWithLoading isLoading={appState.loading} >
        <GraphSource />
      </GraphWithLoading>
  );
}

export default App;
