import React from 'react';
import MonitoringDashboard from './components/MonitoringDashboard';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import './App.css';

const theme = createTheme({
  palette: {
    mode: 'dark',
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div className="App">
        <MonitoringDashboard />
      </div>
    </ThemeProvider>
  );
}

export default App;
