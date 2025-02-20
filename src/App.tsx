import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
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
  
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEmployees();

    // Set up real-time subscription
    const subscription = supabase
      .channel('employees-channel')
      .on(
        'postgres_changes',
        {
          event: '*',  // Listen to all changes (insert, update, delete)
          schema: 'public',
          table: 'employees'
        },
        async (payload) => {
          console.log('Change received!', payload);
          // Refresh the entire list when any change occurs
          await fetchEmployees();
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, []);  // Empty dependency array since we want this to run once on mount

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error fetching:', error);
        throw error;
      }

      // Convert the date strings to Date objects
      const employeesWithDates = (data || []).map(emp => ({
        ...emp,
        lastUpdated: new Date(emp.lastUpdated)
      }));

      setEmployees(employeesWithDates);
    } catch (error) {
      console.error('Error fetching employees:', error);
      setError('Failed to fetch employees');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const selectedEmployee = employees.find(emp => emp.id === selectedEmployeeId);

  const handleStatusUpdate = async (newStatus: WorkStatus) => {
    if (!selectedEmployeeId) return;

    try {
      const { error } = await supabase
        .from('employees')
        .update({ 
          status: newStatus,
          lastUpdated: new Date().toISOString()
        })
        .eq('id', selectedEmployeeId);

      if (error) {
        console.error('Update error:', error);
        throw error;
      }

      // Let the subscription handle the update
    } catch (error) {
      console.error('Error updating status:', error);
      // You might want to show an error message to the user
    }
  };

  const handleAddEmployee = async (newEmployee: Omit<Employee, 'id'>) => {
    try {
      const { error } = await supabase
        .from('employees')
        .insert([{
          ...newEmployee,
          lastUpdated: newEmployee.lastUpdated.toISOString()
        }]);

      if (error) {
        console.error('Insert error:', error);
        throw error;
      }

      // Let the subscription handle the insert
    } catch (error) {
      console.error('Error adding employee:', error);
      // You might want to show an error message to the user
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    try {
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Delete error:', error);
        throw error;
      }

      // Let the subscription handle the delete
      // Also clear the selected employee if it was deleted
      if (selectedEmployeeId === id) {
        setSelectedEmployeeId(null);
      }
    } catch (error) {
      console.error('Error deleting employee:', error);
      // You might want to show an error message to the user
    }
  };

  const toggleTheme = () => {
    setIsDarkMode(prev => !prev);
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

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