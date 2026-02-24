import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Overview } from './components/Overview';
import { Settings } from './components/Settings';
import { Logs } from './components/Logs';
import { Skills } from './components/Skills';

function App() {
  const [currentTab, setTab] = useState('overview');

  return (
    <>
      <Sidebar currentTab={currentTab} setTab={setTab} />
      
      <main className="main-content">
        {currentTab === 'overview' && <Overview />}
        {currentTab === 'settings' && <Settings />}
        {currentTab === 'logs' && <Logs />}
        {currentTab === 'skills' && <Skills />}
      </main>
    </>
  );
}

export default App;
