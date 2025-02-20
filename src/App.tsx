import { useState, useEffect } from 'react';
import StatusUpdater from './components/StatusUpdater';
import EmployeeList from './components/EmployeeList';
import EmployeeSelector from './components/EmployeeSelector';
import AddEmployee from './components/AddEmployee';
import TableView from './components/TableView';
import ThemeToggle from './components/ThemeToggle';
import { WorkStatus, Employee } from './types';
import './styles/StatusUpdater.css';
import './styles/EmployeeList.css';
import './styles/EmployeeSelector.css';
import './styles/AddEmployee.css';
import './styles/TableView.css';
import './styles/theme.css';

function App() {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme ? savedTheme === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  
  // Sample employee data - in a real app, this would come from a backend
  const [employees, setEmployees] = useState<Employee[]>([
    {
      id: '1',
      name: 'John Doe',
      status: 'in-office' as WorkStatus,
      lastUpdated: new Date(),
    },
    {
      id: '2',
      name: 'Jane Smith',
      status: 'wfh' as WorkStatus,
      lastUpdated: new Date(),
    },
    {
      id: '3',
      name: 'Mike Johnson',
      status: 'on-job' as WorkStatus,
      lastUpdated: new Date(),
    },
    {
      id: '4',
      name: 'Sarah Wilson',
      status: 'off' as WorkStatus,
      lastUpdated: new Date(),
    },
  ]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const selectedEmployee = employees.find(emp => emp.id === selectedEmployeeId);

  const handleStatusUpdate = (newStatus: WorkStatus) => {
    if (!selectedEmployeeId) return;

    setEmployees(prevEmployees => {
      return prevEmployees.map(emp => 
        emp.id === selectedEmployeeId
          ? { ...emp, status: newStatus, lastUpdated: new Date() }
          : emp
      );
    });
  };

  const handleAddEmployee = (newEmployee: Omit<Employee, 'id'>) => {
    const id = (employees.length + 1).toString();
    setEmployees(prevEmployees => [...prevEmployees, { ...newEmployee, id }]);
  };

  const handleDeleteEmployee = (id: string) => {
    setEmployees(prevEmployees => prevEmployees.filter(emp => emp.id !== id));
  };

  const toggleTheme = () => {
    setIsDarkMode(prev => !prev);
  };

  return (
    <div className="app">
      <ThemeToggle isDark={isDarkMode} onToggle={toggleTheme} />
      <header className="glass-effect">
        <h1>DTracker - Employee Status Tracker</h1>
      </header>
      <main>
        <div className="controls-section glass-effect">
          <EmployeeSelector
            employees={employees}
            selectedEmployeeId={selectedEmployeeId}
            onSelectEmployee={setSelectedEmployeeId}
          />
          <AddEmployee onAddEmployee={handleAddEmployee} />
        </div>
        {selectedEmployee && (
          <StatusUpdater 
            currentStatus={selectedEmployee.status}
            onStatusUpdate={handleStatusUpdate}
          />
        )}
        <div className="view-toggle-section glass-effect">
          <h2>View Options</h2>
          <div className="view-toggle">
            <button 
              className={`toggle-button ${viewMode === 'cards' ? 'active' : ''}`}
              onClick={() => setViewMode('cards')}
            >
              Card View
            </button>
            <button 
              className={`toggle-button ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
            >
              Table View
            </button>
          </div>
        </div>
        {viewMode === 'cards' ? (
          <EmployeeList 
            employees={employees} 
            onDeleteEmployee={handleDeleteEmployee} 
          />
        ) : (
          <TableView 
            employees={employees} 
            onDeleteEmployee={handleDeleteEmployee} 
          />
        )}
      </main>
    </div>
  );
}

export default App; 