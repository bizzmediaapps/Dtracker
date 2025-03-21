import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import StatusUpdater from './components/StatusUpdater';
import EmployeeList from './components/EmployeeList';
import EmployeeSelector from './components/EmployeeSelector';
import AddEmployee from './components/AddEmployee';
import TableView from './components/TableView';
import ThemeToggle from './components/ThemeToggle';
import { WorkStatus, Employee, Activity } from './types';
import './styles/StatusUpdater.css';
import './styles/EmployeeList.css';
import './styles/EmployeeSelector.css';
import './styles/AddEmployee.css';
import './styles/TableView.css';
import './styles/theme.css';
import './styles/ActivityInput.css';
import ActivitiesList from './components/ActivitiesList';
import './styles/ActivitiesList.css';
import TasksView from './components/TasksView';
import './styles/TasksView.css';
import CalendarView from './components/CalendarView';

function App() {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'table' | 'tasks' | 'calendar'>('cards');
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme ? savedTheme === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New state for export functionality
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedEmployeesForExport, setSelectedEmployeesForExport] = useState<string[]>([]);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportStartDate, setExportStartDate] = useState<string>('');
  const [exportEndDate, setExportEndDate] = useState<string>('');
  const [exportTaskType, setExportTaskType] = useState<'all' | 'active' | 'completed' | 'deferred' | 'recurring' | 'task_of_day'>('all');

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
      console.log('Updating status:', selectedEmployeeId, newStatus); // Debug log
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
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status. Please try again.');
    }
  };

  const handleAddEmployee = async (newEmployee: Omit<Employee, 'id'>) => {
    try {
      console.log('Adding employee:', newEmployee); // Debug log
      
      const { data, error } = await supabase
        .from('employees')
        .insert({
          name: newEmployee.name,
          status: newEmployee.status,
          lastUpdated: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Insert error:', error);
        alert(`Failed to add employee: ${error.message}`);
        return;
      }

      console.log('Successfully added employee:', data);
    } catch (error) {
      console.error('Error adding employee:', error);
      alert('Failed to add employee. Please try again.');
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

  // New function to export activities for selected employees
  const exportActivitiesForEmployees = async () => {
    if (selectedEmployeesForExport.length === 0) {
      alert('Please select at least one employee');
      return;
    }

    try {
      setExportLoading(true);
      
      // Build the query
      let query = supabase
        .from('activities')
        .select('*')
        .in('employee_id', selectedEmployeesForExport);
      
      // Add date filtering if dates are provided
      if (exportStartDate) {
        query = query.gte('created_at', new Date(exportStartDate).toISOString());
      }
      
      if (exportEndDate) {
        // Add one day to include the end date fully
        const endDateObj = new Date(exportEndDate);
        endDateObj.setDate(endDateObj.getDate() + 1);
        query = query.lt('created_at', endDateObj.toISOString());
      }
      
      // Execute the query
      const { data, error } = await query;

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        alert('No activities found for the selected criteria');
        setExportLoading(false);
        return;
      }

      // Format activities data
      const formattedActivities = data.map(activity => {
        return {
          ...activity,
          created_at: new Date(activity.created_at),
          updated_at: new Date(activity.updated_at),
          completed_at: activity.completed_at ? new Date(activity.completed_at) : null,
          due_date: activity.due_date ? new Date(activity.due_date) : undefined
        };
      });

      // Filter by task type if not 'all'
      let filteredActivities = formattedActivities;
      if (exportTaskType !== 'all') {
        filteredActivities = formattedActivities.filter(activity => {
          switch (exportTaskType) {
            case 'active':
              return activity.status === 'active';
            case 'completed':
              return activity.status === 'completed';
            case 'deferred':
              return activity.status === 'deferred';
            case 'recurring':
              return activity.is_recurring;
            case 'task_of_day':
              return activity.is_task_of_day;
            default:
              return true;
          }
        });
      }

      // If no activities after filtering, show alert
      if (filteredActivities.length === 0) {
        alert('No activities found matching the selected task type');
        setExportLoading(false);
        return;
      }

      // Get employee names for selected IDs
      const employeeNames = employees
        .filter(emp => selectedEmployeesForExport.includes(emp.id))
        .map(emp => emp.name)
        .join(', ');

      // Build date range string for filename
      let dateRangeString = '';
      if (exportStartDate && exportEndDate) {
        dateRangeString = `-${exportStartDate}-to-${exportEndDate}`;
      } else if (exportStartDate) {
        dateRangeString = `-from-${exportStartDate}`;
      } else if (exportEndDate) {
        dateRangeString = `-until-${exportEndDate}`;
      }

      // Add task type to filename if not 'all'
      let taskTypeString = '';
      if (exportTaskType !== 'all') {
        taskTypeString = `-${exportTaskType}`;
      }

      // Export to CSV
      generateCSV(filteredActivities, employeeNames, dateRangeString + taskTypeString);
    } catch (error) {
      console.error('Error exporting activities:', error);
      alert('Error exporting activities. Please check console.');
    } finally {
      setExportLoading(false);
      setShowExportModal(false);
    }
  };

  // Function to generate and download CSV
  const generateCSV = (activities: Activity[], employeeNames: string, dateRangeString: string = '') => {
    // Define CSV headers
    const headers = [
      'Employee Name',
      'Description',
      'Status',
      'Due Date',
      'Recurring',
      'Recurrence Pattern',
      'Created',
      'Updated',
      'Completed',
      'Is Task of Day'
    ];

    // Format activities data for CSV
    const csvData = activities.map(activity => {
      // Find employee name
      const employee = employees.find(emp => emp.id === activity.employee_id);
      const employeeName = employee ? employee.name : 'Unknown';

      // Format recurrence pattern
      let recurrenceDescription = 'Not Recurring';
      if (activity.is_recurring && activity.recurrence_pattern) {
        const pattern = activity.recurrence_pattern;
        switch (pattern.type) {
          case 'daily':
            recurrenceDescription = pattern.interval === 1 
              ? 'Every day' 
              : `Every ${pattern.interval} days`;
            break;
          case 'weekly':
            if (!pattern.daysOfWeek || pattern.daysOfWeek.length === 0) {
              recurrenceDescription = pattern.interval === 1 
                ? 'Every week' 
                : `Every ${pattern.interval} weeks`;
            } else {
              const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
              const days = pattern.daysOfWeek.map(d => dayNames[d]).join(', ');
              recurrenceDescription = pattern.interval === 1 
                ? `Every week on ${days}` 
                : `Every ${pattern.interval} weeks on ${days}`;
            }
            break;
          case 'monthly':
            const dayText = pattern.dayOfMonth ? `day ${pattern.dayOfMonth}` : 'same day';
            recurrenceDescription = pattern.interval === 1 
              ? `Every month on ${dayText}` 
              : `Every ${pattern.interval} months on ${dayText}`;
            break;
        }
      }
      
      // Properly escape fields for CSV
      return [
        `"${employeeName.replace(/"/g, '""')}"`,
        `"${activity.description.replace(/"/g, '""')}"`,
        activity.status,
        activity.due_date ? new Date(activity.due_date).toLocaleDateString() : '',
        activity.is_recurring ? 'Yes' : 'No',
        `"${recurrenceDescription.replace(/"/g, '""')}"`,
        new Date(activity.created_at).toLocaleDateString(),
        new Date(activity.updated_at).toLocaleDateString(),
        activity.completed_at ? new Date(activity.completed_at).toLocaleDateString() : '',
        activity.is_task_of_day ? 'Yes' : 'No'
      ].join(',');
    });

    // Combine headers and data
    const csvContent = [headers.join(','), ...csvData].join('\n');
    
    // Create a blob and downloadable link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    // Create a temporary link element and trigger download
    const link = document.createElement('a');
    
    // Include employee names and date range in the filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const shortenedNames = employeeNames.length > 30 
      ? employeeNames.slice(0, 30) + '...' 
      : employeeNames;
    
    link.setAttribute('href', url);
    link.setAttribute('download', `activities-${shortenedNames}${dateRangeString}-${timestamp}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Toggle employee selection for export
  const toggleEmployeeSelection = (employeeId: string) => {
    setSelectedEmployeesForExport(prev => {
      if (prev.includes(employeeId)) {
        return prev.filter(id => id !== employeeId);
      } else {
        return [...prev, employeeId];
      }
    });
  };

  // Helper to check if all employees are selected
  const areAllEmployeesSelected = () => {
    return employees.length > 0 && selectedEmployeesForExport.length === employees.length;
  };

  // Toggle all employees selection
  const toggleAllEmployees = () => {
    if (areAllEmployeesSelected()) {
      setSelectedEmployeesForExport([]);
    } else {
      setSelectedEmployeesForExport(employees.map(emp => emp.id));
    }
  };

  // Reset export form when opening modal
  const openExportModal = () => {
    setSelectedEmployeesForExport([]);
    setExportStartDate('');
    setExportEndDate('');
    setExportTaskType('all');
    setShowExportModal(true);
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="app">
      <div className="app-header-container">
        <ThemeToggle isDark={isDarkMode} onToggle={toggleTheme} />
      </div>
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
          <>
            <StatusUpdater 
              currentStatus={selectedEmployee.status}
              onStatusUpdate={handleStatusUpdate}
            />
            <ActivitiesList employeeId={selectedEmployee.id} />
          </>
        )}
        <div className="view-toggle-section glass-effect">
          <h2>View Options</h2>
          <div className="view-toggle-container">
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
              <button 
                className={`toggle-button ${viewMode === 'tasks' ? 'active' : ''}`}
                onClick={() => setViewMode('tasks')}
              >
                Tasks View
              </button>
              <button 
                className={`toggle-button ${viewMode === 'calendar' ? 'active' : ''}`}
                onClick={() => setViewMode('calendar')}
              >
                Calendar View
              </button>
            </div>
            <button 
              className="export-toggle-button"
              onClick={() => openExportModal()}
              title="Export activities from multiple employees"
            >
              📊 Export Data
            </button>
          </div>
        </div>
        {viewMode === 'cards' ? (
          <EmployeeList 
            employees={employees} 
            onDeleteEmployee={handleDeleteEmployee} 
          />
        ) : viewMode === 'table' ? (
          <TableView 
            employees={employees} 
            onDeleteEmployee={handleDeleteEmployee} 
          />
        ) : viewMode === 'tasks' ? (
          <TasksView 
            employees={employees} 
          />
        ) : (
          <CalendarView 
            employees={employees}
          />
        )}
      </main>
      
      {/* Export Modal */}
      {showExportModal && (
        <div className="modal-overlay">
          <div className="export-modal">
            <div className="modal-header">
              <h3>Export Employee Activities</h3>
              <button className="close-modal" onClick={() => setShowExportModal(false)}>×</button>
            </div>
            <div className="modal-content">
              <p>Select employees to export their activities:</p>
              
              <div className="select-all-container">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={areAllEmployeesSelected()}
                    onChange={toggleAllEmployees}
                    className="checkbox-input"
                  />
                  <span>Select All Employees</span>
                </label>
              </div>
              
              <div className="employee-checkboxes">
                {employees.map(employee => (
                  <label key={employee.id} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={selectedEmployeesForExport.includes(employee.id)}
                      onChange={() => toggleEmployeeSelection(employee.id)}
                      className="checkbox-input"
                    />
                    <span>{employee.name}</span>
                  </label>
                ))}
              </div>
              
              <div className="date-filter-section">
                <h4>Optional Date Range Filter</h4>
                <div className="date-range-inputs">
                  <div className="export-date-group">
                    <label htmlFor="export-start-date">Start Date:</label>
                    <input
                      id="export-start-date"
                      type="date"
                      value={exportStartDate}
                      onChange={(e) => setExportStartDate(e.target.value)}
                      className="form-control"
                    />
                  </div>
                  <div className="export-date-group">
                    <label htmlFor="export-end-date">End Date:</label>
                    <input
                      id="export-end-date"
                      type="date"
                      value={exportEndDate}
                      onChange={(e) => setExportEndDate(e.target.value)}
                      className="form-control"
                      min={exportStartDate}
                    />
                  </div>
                </div>
                <p className="date-filter-note">
                  {exportStartDate || exportEndDate ? 
                    "Activities will be filtered based on creation date." : 
                    "Leave both fields empty to export all activities."}
                </p>
              </div>
              
              <div className="task-type-filter-section">
                <h4>Task Type Filter</h4>
                <div className="task-type-select">
                  <label htmlFor="export-task-type">Task Type:</label>
                  <select
                    id="export-task-type"
                    value={exportTaskType}
                    onChange={(e) => setExportTaskType(e.target.value as any)}
                    className="form-control"
                  >
                    <option value="all">All Tasks</option>
                    <option value="active">Active Tasks</option>
                    <option value="completed">Completed Tasks</option>
                    <option value="deferred">Deferred Tasks</option>
                    <option value="recurring">Recurring Tasks</option>
                    <option value="task_of_day">Today's Focus Tasks</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="export-button"
                onClick={exportActivitiesForEmployees}
                disabled={selectedEmployeesForExport.length === 0 || exportLoading}
              >
                {exportLoading ? 'Exporting...' : '📥 Export Selected'}
              </button>
              <button 
                className="cancel-button"
                onClick={() => setShowExportModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App; 