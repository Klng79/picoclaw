import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Overview } from './components/Overview';
import { Settings } from './components/Settings';
import { Logs } from './components/Logs';
import { Skills } from './components/Skills';
import { Models } from './components/Models';
import { Channels } from './components/Channels';
import { Providers } from './components/Providers';
import { Tools } from './components/Tools';
import { Database } from './components/Database';

function App() {
  const [currentTab, setTab] = useState('overview');

  return (
    <>
      <Sidebar currentTab={currentTab} setTab={setTab} />
      
      <main className="main-content">
        {currentTab === 'overview' && <Overview />}
        {currentTab === 'channels' && <Channels />}
        {currentTab === 'models' && <Models />}
        {currentTab === 'providers' && <Providers />}
        {currentTab === 'tools' && <Tools />}
        {currentTab === 'database' && <Database />}
        {currentTab === 'skills' && <Skills />}
        {currentTab === 'settings' && <Settings />}
        {currentTab === 'logs' && <Logs />}
      </main>
    </>
  );
}

export default App;
