import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Employee, Activity } from '../types';

interface TasksViewProps {
  employees: Employee[];
}

interface EmployeeTabState {
  [key: string]: 'all' | 'today';
}

// Keep track of tasks of the day in local storage until database schema is updated
interface TasksOfDayState {
  [employeeId: string]: string[]; // employeeId -> array of activityIds
}

// Interface for selected employee modal
interface SelectedEmployeeModal {
  employee: Employee;
  activities: Activity[];
}

const TasksView: React.FC<TasksViewProps> = ({ employees }) => {
  const [employeeActivities, setEmployeeActivities] = useState<{[key: string]: Activity[]}>({});
  const [loading, setLoading] = useState(true);
  const [activeTabs, setActiveTabs] = useState<EmployeeTabState>({});
  const [error, setError] = useState<string | null>(null);
  // Add local state for tasks of day
  const [tasksOfDay, setTasksOfDay] = useState<TasksOfDayState>(() => {
    try {
      const savedTasks = localStorage.getItem('tasksOfDay');
      if (savedTasks) {
        const parsed = JSON.parse(savedTasks);
        
        // Convert from old format (single task) to new format (array of tasks)
        const convertedTasks: TasksOfDayState = {};
        Object.keys(parsed).forEach(employeeId => {
          if (Array.isArray(parsed[employeeId])) {
            // Already in new format
            convertedTasks[employeeId] = parsed[employeeId];
          } else {
            // Convert from old format
            convertedTasks[employeeId] = [parsed[employeeId]];
          }
        });
        
        return convertedTasks;
      }
      return {};
    } catch (e) {
      console.error('Error loading tasks of day from localStorage:', e);
      return {};
    }
  });
  // New state for selected employee modal
  const [selectedEmployee, setSelectedEmployee] = useState<SelectedEmployeeModal | null>(null);
  
  // Use a ref to track if we've loaded from localStorage
  const initializedRef = useRef(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Effect for closing the modal when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (selectedEmployee && modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setSelectedEmployee(null);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [selectedEmployee]);

  // Load saved tab state and tasks of day from localStorage on component mount
  useEffect(() => {
    if (!initializedRef.current) {
      try {
        console.log('Loading saved state from localStorage');
        // Load tab state
        const savedTabs = localStorage.getItem('employeeTabState');
        if (savedTabs) {
          const parsedTabs = JSON.parse(savedTabs);
          const validatedTabs: EmployeeTabState = {};
          Object.keys(parsedTabs).forEach(empId => {
            validatedTabs[empId] = parsedTabs[empId] === 'today' ? 'today' : 'all';
          });
          setActiveTabs(validatedTabs);
        }

        // Load tasks of day
        const savedTasksOfDay = localStorage.getItem('tasksOfDay');
        if (savedTasksOfDay) {
          const parsedTasks = JSON.parse(savedTasksOfDay);
          console.log('Loaded tasks of day from localStorage:', parsedTasks);
          setTasksOfDay(parsedTasks);
        }
        
        initializedRef.current = true;
      } catch (e) {
        console.error('Error loading state from localStorage:', e);
      }
    }
    
    // Initialize any missing tabs
    const initialTabs: EmployeeTabState = {};
    let needsInitialization = false;
    
    employees.forEach(emp => {
      if (!activeTabs[emp.id]) {
        initialTabs[emp.id] = 'all';
        needsInitialization = true;
      }
    });
    
    if (needsInitialization) {
      setActiveTabs(prev => {
        const newTabs: EmployeeTabState = { ...prev, ...initialTabs };
        // Save to localStorage
        try {
          localStorage.setItem('employeeTabState', JSON.stringify(newTabs));
        } catch (e) {
          console.error('Error saving tab state to localStorage:', e);
        }
        return newTabs;
      });
    }
  }, [employees]);

  // Fetch activities after we've loaded state
  useEffect(() => {
    if (initializedRef.current) {
      console.log('Fetching activities with tasksOfDay:', tasksOfDay);
      fetchAllActivities();
    }
  }, [tasksOfDay, employees, initializedRef.current]);

  // Save tab state to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('employeeTabState', JSON.stringify(activeTabs));
    } catch (e) {
      console.error('Error saving tab state to localStorage:', e);
    }
  }, [activeTabs]);

  // Save tasks of day to localStorage whenever it changes
  useEffect(() => {
    if (initializedRef.current && Object.keys(tasksOfDay).length > 0) {
      try {
        console.log('Saving tasks of day to localStorage:', tasksOfDay);
        localStorage.setItem('tasksOfDay', JSON.stringify(tasksOfDay));
      } catch (e) {
        console.error('Error saving tasks of day to localStorage:', e);
      }
    }
  }, [tasksOfDay]);

  const fetchAllActivities = async () => {
    if (employees.length === 0) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('activities')
        .select('*');

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      if (!data || data.length === 0) {
        console.log('No activities found in database at all');
        setError('No activities found in database. Try adding some tasks first.');
        setLoading(false);
        return;
      }

      console.log('Fetched activities, applying tasksOfDay state:', tasksOfDay);
      
      // Group activities by employee
      const activitiesByEmployee: {[key: string]: Activity[]} = {};
      
      // Process all fetched activities
      data.forEach(activity => {
        // Check if this activity is a task of day for its employee
        const employeeTasks = tasksOfDay[activity.employee_id] || [];
        const isTaskOfDay = employeeTasks.includes(activity.id);
        
        if (isTaskOfDay) {
          console.log(`Activity ${activity.id} is task of day for employee ${activity.employee_id}`);
        }
        
        // Convert dates
        const formattedActivity = {
          ...activity,
          created_at: new Date(activity.created_at),
          updated_at: new Date(activity.updated_at),
          completed_at: activity.completed_at ? new Date(activity.completed_at) : null,
          // Add is_task_of_day from our local state
          is_task_of_day: isTaskOfDay
        };

        // Check if this activity belongs to one of our employees
        if (employees.some(emp => emp.id === activity.employee_id)) {
          if (!activitiesByEmployee[activity.employee_id]) {
            activitiesByEmployee[activity.employee_id] = [];
          }
          activitiesByEmployee[activity.employee_id].push(formattedActivity);
        }
      });

      // Switch to Today's Tasks tab for employees who have a task of day
      Object.keys(tasksOfDay).forEach(employeeId => {
        if (employees.some(emp => emp.id === employeeId)) {
          setActiveTabs(prev => ({
            ...prev,
            [employeeId]: 'today'
          }));
        }
      });

      setEmployeeActivities(activitiesByEmployee);
      console.log('Set employee activities with tasks of day applied');
    } catch (error) {
      console.error('Error fetching activities:', error);
      setError('Error fetching activities. Please check console.');
    } finally {
      setLoading(false);
    }
  };

  const setTaskOfDay = async (activityId: string, employeeId: string) => {
    try {
      console.log(`Setting activity ${activityId} as task of day for employee ${employeeId}`);
      
      // First, ensure we're on the Today's Tasks tab and save it
      setActiveTabs(prev => {
        const newTabs: EmployeeTabState = {
          ...prev,
          [employeeId]: 'today'
        };
        
        // Save to localStorage immediately
        try {
          localStorage.setItem('employeeTabState', JSON.stringify(newTabs));
        } catch (e) {
          console.error('Error saving tab state to localStorage:', e);
        }
        
        return newTabs;
      });
      
      // CRITICAL: Force proper type checking in production
      const safeUpdateTasksOfDay = (prevTasksOfDay: TasksOfDayState) => {
        // Make defensive copies of everything
        const prevState = { ...prevTasksOfDay };
        const employeeTasks = Array.isArray(prevState[employeeId]) 
          ? [...prevState[employeeId]] 
          : [];
        
        // Check if this task is already a task of day
        const isAlreadyTaskOfDay = employeeTasks.includes(activityId);
        
        // If it's already a task of day, we'll remove it (toggle behavior)
        const newEmployeeTasks = isAlreadyTaskOfDay
          ? employeeTasks.filter(id => id !== activityId)
          : [...employeeTasks, activityId];
        
        // Create a new state object to ensure React detects the change
        return { ...prevState, [employeeId]: newEmployeeTasks };
      };
      
      // Update local state for tasks of day with our safe function
      setTasksOfDay(prev => {
        const newTasksOfDay = safeUpdateTasksOfDay(prev);
        
        // Save to localStorage immediately
        try {
          console.log('Saving tasks of day immediately:', newTasksOfDay);
          localStorage.setItem('tasksOfDay', JSON.stringify(newTasksOfDay));
        } catch (e) {
          console.error('Error saving tasks of day to localStorage:', e);
        }
        return newTasksOfDay;
      });
      
      // Update our local state for immediate UI feedback - use defensive copying
      setEmployeeActivities(prevActivities => {
        // Make a fresh copy of the entire state
        const updatedActivities = { ...prevActivities };
        
        // Defensively update the activities for this employee
        if (updatedActivities[employeeId]) {
          // Ensure we have an array before operating on it
          if (!Array.isArray(updatedActivities[employeeId])) {
            console.warn('Employee activities not an array:', updatedActivities[employeeId]);
            return prevActivities; // Return unchanged if not an array
          }
          
          // Create a fresh copy of the employee's activities array
          updatedActivities[employeeId] = [...updatedActivities[employeeId]].map(activity => {
            if (activity.id === activityId) {
              // Toggle the is_task_of_day flag with a fresh activity object
              return {
                ...activity,
                is_task_of_day: !activity.is_task_of_day
              };
            }
            return activity;
          });
        }
        
        return updatedActivities;
      });

      console.log(`Successfully updated task of day status for activity ${activityId} (using local storage)`);
      
    } catch (error) {
      console.error('Error setting task of day:', error);
      // Don't show alert since we're using local storage approach successfully
      refreshActivitiesOnly();
    }
  };

  // Refresh activities without affecting tab state
  const refreshActivitiesOnly = async () => {
    if (employees.length === 0) return;

    try {
      const { data, error } = await supabase
        .from('activities')
        .select('*');

      if (error) throw error;
      
      if (!data) return;

      console.log('Refreshing activities with tasksOfDay:', tasksOfDay);
      
      // Same logic as fetchAllActivities but without tab initialization
      const activitiesByEmployee: {[key: string]: Activity[]} = {};
      
      data.forEach(activity => {
        const employeeTasks = tasksOfDay[activity.employee_id] || [];
        const isTaskOfDay = employeeTasks.includes(activity.id);
        
        const formattedActivity = {
          ...activity,
          created_at: new Date(activity.created_at),
          updated_at: new Date(activity.updated_at),
          completed_at: activity.completed_at ? new Date(activity.completed_at) : null,
          // Add is_task_of_day from our local state
          is_task_of_day: isTaskOfDay
        };

        if (employees.some(emp => emp.id === activity.employee_id)) {
          if (!activitiesByEmployee[activity.employee_id]) {
            activitiesByEmployee[activity.employee_id] = [];
          }
          activitiesByEmployee[activity.employee_id].push(formattedActivity);
        }
      });

      setEmployeeActivities(activitiesByEmployee);
    } catch (error) {
      console.error('Error refreshing activities:', error);
    }
  };

  const toggleTab = (employeeId: string, tab: 'all' | 'today') => {
    setActiveTabs(prev => {
      const newTabs: EmployeeTabState = {
        ...prev,
        [employeeId]: tab
      };
      
      // Save to localStorage
      try {
        localStorage.setItem('employeeTabState', JSON.stringify(newTabs));
      } catch (e) {
        console.error('Error saving tab state to localStorage:', e);
      }
      
      return newTabs;
    });
  };

  // Helper function to get the status indicator color
  const getStatusColor = (status: string): string => {
    const colors: {[key: string]: string} = {
      'in-office': '#4CAF50',
      'on-job': '#2196F3',
      'wfh': '#9C27B0',
      'off': '#757575'
    };
    return colors[status] || '#757575';
  };

  // Helper function to get status label
  const getStatusLabel = (status: string): string => {
    const labels: {[key: string]: string} = {
      'in-office': 'In Office',
      'on-job': 'Out on Job',
      'wfh': 'Work from Home',
      'off': 'Off for the Day'
    };
    return labels[status] || status;
  };

  // Get icon based on task status
  const getTaskIcon = (activity: Activity): string => {
    if (activity.is_task_of_day) return '🔥';
    if (activity.is_recurring) return '🔁';
    if (activity.status === 'completed') return '✅';
    if (activity.status === 'deferred') return '⏳';
    return '🔄';
  };

  // Format the due date
  const formatDueDate = (date?: Date): string => {
    if (!date) return '';
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const taskDate = new Date(date);
    taskDate.setHours(0, 0, 0, 0);
    
    // Check if the date is today
    if (taskDate.getTime() === today.getTime()) {
      return 'Today';
    }
    
    // Check if the date is tomorrow
    if (taskDate.getTime() === tomorrow.getTime()) {
      return 'Tomorrow';
    }
    
    // Otherwise return the formatted date
    return taskDate.toLocaleDateString();
  };

  // Get a formatted string description of the recurrence pattern
  const getRecurrenceDescription = (activity: Activity): string => {
    if (!isActivityRecurring(activity) || !activity.recurrence_pattern) return '';
    
    const pattern = activity.recurrence_pattern;
    
    switch (pattern.type) {
      case 'daily':
        return pattern.interval === 1 
          ? 'Every day' 
          : `Every ${pattern.interval} days`;
      
      case 'weekly':
        if (!pattern.daysOfWeek || pattern.daysOfWeek.length === 0) {
          return pattern.interval === 1 
            ? 'Every week' 
            : `Every ${pattern.interval} weeks`;
        } else {
          const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          const days = pattern.daysOfWeek.map(d => dayNames[d]).join(', ');
          return pattern.interval === 1 
            ? `Every week on ${days}` 
            : `Every ${pattern.interval} weeks on ${days}`;
        }
      
      case 'monthly':
        const dayText = pattern.dayOfMonth ? `day ${pattern.dayOfMonth}` : 'same day';
        return pattern.interval === 1 
          ? `Every month on ${dayText}` 
          : `Every ${pattern.interval} months on ${dayText}`;
      
      default:
        return 'Recurring';
    }
  };

  // Helper function to check if activity is recurring by checking localStorage
  const isActivityRecurring = (activity: Activity): boolean => {
    // Check localStorage first
    const localStorageKey = `recurrence_pattern_${activity.id}`;
    const storedPattern = localStorage.getItem(localStorageKey);
    
    if (storedPattern) {
      try {
        const pattern = JSON.parse(storedPattern);
        return !!pattern.isRecurring;
      } catch (e) {
        console.error('Error parsing stored recurrence pattern:', e);
      }
    }
    
    // If no localStorage data, check properties if they exist
    return activity.is_recurring || !!activity.recurrence_pattern?.isRecurring;
  };

  // Function to open the employee details modal
  const openEmployeeModal = (employee: Employee) => {
    const activities = employeeActivities[employee.id] || [];
    setSelectedEmployee({
      employee,
      activities
    });
  };

  // Update the button text based on whether this is already a task of day
  const getTaskOfDayButtonText = (activity: Activity) => {
    return activity.is_task_of_day 
      ? "Remove from Today's Tasks" 
      : "Add to Today's Tasks";
  };

  if (loading) {
    return <div className="loading-tasks">Loading tasks...</div>;
  }

  if (error) {
    return <div className="error-tasks">{error}</div>;
  }

  return (
    <div className="tasks-view glass-effect">
      <h2>Employee Tasks</h2>
      
      {employees.length === 0 ? (
        <div className="no-employees">No employees to display</div>
      ) : (
        <div className="tasks-container">
          {employees.map(employee => {
            const activities = employeeActivities[employee.id] || [];
            
            // Filter out completed tasks for the "Active Tasks" tab
            const activeTasks = activities.filter(activity => activity.status !== 'completed');
            
            // Today's tasks can include completed ones if they're marked as today's task
            const todayTasks = activities.filter(activity => activity.is_task_of_day);
            
            // Get the tasks to display based on active tab
            const displayTasks = activeTabs[employee.id] === 'today' ? todayTasks : activeTasks;
            
            return (
              <div key={employee.id} className="employee-tasks-card">
                <div className="employee-tasks-header">
                  <div className="employee-info">
                    <h3 
                      className="employee-name"
                      onClick={() => openEmployeeModal(employee)}
                      style={{ cursor: 'pointer' }}
                    >
                      {employee.name}
                    </h3>
                    <span 
                      className="status-pill"
                      style={{ backgroundColor: getStatusColor(employee.status) }}
                    >
                      {getStatusLabel(employee.status)}
                    </span>
                  </div>
                </div>
                
                <div className="employee-tasks-tabs">
                  <button 
                    className={`employee-tab-button ${activeTabs[employee.id] === 'all' ? 'active' : ''}`}
                    onClick={() => toggleTab(employee.id, 'all')}
                  >
                    Active Tasks <span className="task-count">{activeTasks.length}</span>
                  </button>
                  <button 
                    className={`employee-tab-button ${activeTabs[employee.id] === 'today' ? 'active' : ''}`}
                    onClick={() => toggleTab(employee.id, 'today')}
                  >
                    Today's Tasks <span className="task-count">{todayTasks.length}</span>
                  </button>
                </div>
                
                <div className="employee-tasks-list">
                  {displayTasks.length === 0 ? (
                    <div className="no-tasks">
                      {activeTabs[employee.id] === 'today' 
                        ? "No tasks set for today" 
                        : "No active tasks found - Add tasks in the Activities tab"}
                    </div>
                  ) : (
                    <ul className="tasks-list">
                      {displayTasks.map(activity => (
                        <li 
                          key={activity.id} 
                          className={`task-item ${activity.is_task_of_day ? 'task-of-day' : ''} ${isActivityRecurring(activity) ? 'recurring-task' : ''}`}
                        >
                          <div className="task-content">
                            <span className="task-icon">
                              {getTaskIcon(activity)}
                            </span>
                            <span className="task-description">{activity.description}</span>
                            {activity.is_task_of_day && (
                              <span className="task-day-badge">TODAY</span>
                            )}
                            {isActivityRecurring(activity) && (
                              <span className="task-recurring-badge">RECURRING</span>
                            )}
                          </div>
                          <div className="task-actions">
                            {activity.due_date && (
                              <span className={`task-due-date ${
                                formatDueDate(activity.due_date) === 'Today' ? 'due-today' : 
                                (new Date(activity.due_date) < new Date() ? 'overdue' : '')
                              }`}>
                                Due: {formatDueDate(activity.due_date)}
                              </span>
                            )}
                            <span className="task-date">
                              {activity.created_at.toLocaleDateString()}
                            </span>
                            {activity.status === 'active' && !activity.is_task_of_day && (
                              <button 
                                className="set-today-button"
                                onClick={(e) => {
                                  // Prevent event propagation to avoid bubbling
                                  e.stopPropagation();
                                  
                                  // First, capture necessary IDs before any state updates
                                  const activityId = activity.id;
                                  const employeeId = employee.id;
                                  
                                  // First update the UI to show changes immediately
                                  if (selectedEmployee && selectedEmployee.activities) {
                                    setSelectedEmployee(prev => {
                                      // Safety check - if prev is null, don't update
                                      if (!prev) return null;
                                      
                                      // IMPORTANT: Make sure we have a valid activities array before mapping
                                      if (!Array.isArray(prev.activities)) {
                                        return prev; // Return unchanged if not an array
                                      }
                                      
                                      // Create a defensive copy of the activities array with proper type checking
                                      const updatedActivities = prev.activities.map(a => 
                                        a.id === activityId ? { ...a, is_task_of_day: true } : a
                                      );
                                      
                                      return {
                                        ...prev,
                                        activities: updatedActivities
                                      };
                                    });
                                  }
                                  
                                  // Add a small delay to ensure state updates complete first
                                  setTimeout(() => {
                                    // Now update the underlying data by calling setTaskOfDay
                                    setTaskOfDay(activityId, employeeId);
                                  }, 10);
                                }}
                              >
                                {getTaskOfDayButtonText(activity)}
                              </button>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {/* Employee Task Details Modal */}
      {selectedEmployee && (
        <div className="modal-overlay">
          <div className="employee-modal glass-effect" ref={modalRef}>
            <div className="modal-header">
              <h3>{selectedEmployee.employee.name}'s Tasks</h3>
              <span 
                className="status-pill"
                style={{ backgroundColor: getStatusColor(selectedEmployee.employee.status) }}
              >
                {getStatusLabel(selectedEmployee.employee.status)}
              </span>
              <button 
                className="close-modal-btn"
                onClick={() => setSelectedEmployee(null)}
              >
                ×
              </button>
            </div>
            
            <div className="modal-content">
              {/* Today's Task Section */}
              <div className="task-category-section">
                <h4 className="task-category-title">
                  <span className="category-icon">🔥</span> Today's Focus Tasks
                </h4>
                <div className="category-tasks">
                  {selectedEmployee.activities.some(a => a.is_task_of_day) ? (
                    <ul className="modal-tasks-list">
                      {selectedEmployee.activities
                        .filter(a => a.is_task_of_day)
                        .map(activity => (
                          <li key={activity.id} className={`modal-task-item task-of-day ${isActivityRecurring(activity) ? 'recurring-task' : ''}`}>
                            <div className="modal-task-content">
                              <span className="task-icon">🔥</span>
                              <span className="task-description">{activity.description}</span>
                              {isActivityRecurring(activity) && (
                                <span className="task-recurring-badge">RECURRING</span>
                              )}
                            </div>
                            <div className="task-meta">
                              {activity.due_date && (
                                <span className={`task-due-date ${
                                  formatDueDate(activity.due_date) === 'Today' ? 'due-today' : 
                                  (new Date(activity.due_date) < new Date() ? 'overdue' : '')
                                }`}>
                                  Due: {formatDueDate(activity.due_date)}
                                </span>
                              )}
                              <span className="task-date">{activity.created_at.toLocaleDateString()}</span>
                              <button 
                                className="set-today-button remove-today-button"
                                onClick={(e) => {
                                  // Prevent event propagation to avoid bubbling
                                  e.stopPropagation();
                                  
                                  // CRITICAL: First, capture all necessary IDs before any state changes
                                  const activityId = activity.id;
                                  const employeeId = selectedEmployee.employee.id;
                                  const activityDescription = activity.description;
                                  
                                  // IMPORTANT: Use a local variable to track if we need to update the database
                                  // This prevents race conditions during state updates
                                  const needsDatabaseUpdate = true;
                                  
                                  // Update the UI optimistically and very defensively
                                  try {
                                    if (selectedEmployee && selectedEmployee.activities) {
                                      setSelectedEmployee(prev => {
                                        // Safety check - if prev is null, don't update
                                        if (!prev) return null;
                                        
                                        // Explicit array check before any operation
                                        if (!Array.isArray(prev.activities)) {
                                          console.warn('Activities is not an array:', prev.activities);
                                          return prev; // Return unchanged state
                                        }
                                        
                                        // Create a defensive copy with explicit array creation
                                        const updatedActivities = [...prev.activities].map(a => 
                                          a.id === activityId ? { ...a, is_task_of_day: false } : a
                                        );
                                        
                                        return {
                                          ...prev,
                                          activities: updatedActivities
                                        };
                                      });
                                    }
                                  } catch (error) {
                                    console.error('Error updating UI state:', error);
                                    // Continue with database update even if UI update fails
                                  }
                                  
                                  // Add a safety delay to ensure React has processed state changes
                                  setTimeout(() => {
                                    // Now update the underlying data by calling setTaskOfDay
                                    if (needsDatabaseUpdate) {
                                      console.log(`Updating task of day status for: ${activityDescription}`);
                                      setTaskOfDay(activityId, employeeId);
                                    }
                                  }, 50); // Longer timeout for production
                                }}
                              >
                                Remove from Today's Tasks
                              </button>
                            </div>
                          </li>
                        ))}
                    </ul>
                  ) : (
                    <div className="empty-category">No tasks set for today - Add tasks from below</div>
                  )}
                </div>
              </div>
              
              {/* Recurring Tasks Section */}
              <div className="task-category-section">
                <h4 className="task-category-title">
                  <span className="category-icon">🔁</span> Recurring Tasks
                </h4>
                <div className="category-tasks">
                  {selectedEmployee.activities.some(a => isActivityRecurring(a) && !a.is_task_of_day) ? (
                    <ul className="modal-tasks-list">
                      {selectedEmployee.activities
                        .filter(a => isActivityRecurring(a) && !a.is_task_of_day)
                        .map(activity => (
                          <li key={activity.id} className="modal-task-item recurring-task">
                            <div className="modal-task-content">
                              <span className="task-icon">🔁</span>
                              <span className="task-description">{activity.description}</span>
                              <span className={`task-status-badge ${activity.status}`}>{activity.status}</span>
                            </div>
                            <div className="task-meta">
                              <span className="task-recurrence">
                                {getRecurrenceDescription(activity)}
                              </span>
                              {activity.due_date && (
                                <span className={`task-due-date ${
                                  formatDueDate(activity.due_date) === 'Today' ? 'due-today' : 
                                  (new Date(activity.due_date) < new Date() ? 'overdue' : '')
                                }`}>
                                  Next due: {formatDueDate(activity.due_date)}
                                </span>
                              )}
                              <span className="task-date">{activity.created_at.toLocaleDateString()}</span>
                              {activity.status === 'active' && !activity.is_task_of_day && (
                                <button 
                                  className="set-today-button"
                                  onClick={(e) => {
                                    // Prevent event propagation to avoid bubbling
                                    e.stopPropagation();
                                    
                                    // First, capture necessary IDs before any state updates
                                    const activityId = activity.id;
                                    const employeeId = selectedEmployee.employee.id;
                                    
                                    // First update the UI to show changes immediately
                                    if (selectedEmployee && selectedEmployee.activities) {
                                      setSelectedEmployee(prev => {
                                        // Safety check - if prev is null, don't update
                                        if (!prev) return null;
                                        
                                        // IMPORTANT: Make sure we have a valid activities array before mapping
                                        if (!Array.isArray(prev.activities)) {
                                          return prev; // Return unchanged if not an array
                                        }
                                        
                                        // Create a defensive copy of the activities array with proper type checking
                                        const updatedActivities = prev.activities.map(a => 
                                          a.id === activityId ? { ...a, is_task_of_day: true } : a
                                        );
                                        
                                        return {
                                          ...prev,
                                          activities: updatedActivities
                                        };
                                      });
                                    }
                                    
                                    // Add a small delay to ensure state updates complete first
                                    setTimeout(() => {
                                      // Now update the underlying data by calling setTaskOfDay
                                      setTaskOfDay(activityId, employeeId);
                                    }, 10);
                                  }}
                                >
                                  {getTaskOfDayButtonText(activity)}
                                </button>
                              )}
                            </div>
                          </li>
                        ))}
                    </ul>
                  ) : (
                    <div className="empty-category">No recurring tasks</div>
                  )}
                </div>
              </div>
              
              {/* Active Tasks Section */}
              <div className="task-category-section">
                <h4 className="task-category-title">
                  <span className="category-icon">🔄</span> Active Tasks
                </h4>
                <div className="category-tasks">
                  {selectedEmployee.activities.some(a => a.status === 'active' && !a.is_task_of_day && !isActivityRecurring(a)) ? (
                    <ul className="modal-tasks-list">
                      {selectedEmployee.activities
                        .filter(a => a.status === 'active' && !a.is_task_of_day && !isActivityRecurring(a))
                        .map(activity => (
                          <li key={activity.id} className="modal-task-item">
                            <div className="modal-task-content">
                              <span className="task-icon">🔄</span>
                              <span className="task-description">{activity.description}</span>
                            </div>
                            <div className="task-meta">
                              {activity.due_date && (
                                <span className={`task-due-date ${
                                  formatDueDate(activity.due_date) === 'Today' ? 'due-today' : 
                                  (new Date(activity.due_date) < new Date() ? 'overdue' : '')
                                }`}>
                                  Due: {formatDueDate(activity.due_date)}
                                </span>
                              )}
                              <span className="task-date">{activity.created_at.toLocaleDateString()}</span>
                              {activity.status === 'active' && !activity.is_task_of_day && (
                                <button 
                                  className="set-today-button"
                                  onClick={(e) => {
                                    // Prevent event propagation to avoid bubbling
                                    e.stopPropagation();
                                    
                                    // First, capture necessary IDs before any state updates
                                    const activityId = activity.id;
                                    const employeeId = selectedEmployee.employee.id;
                                    
                                    // First update the UI to show changes immediately
                                    if (selectedEmployee && selectedEmployee.activities) {
                                      setSelectedEmployee(prev => {
                                        // Safety check - if prev is null, don't update
                                        if (!prev) return null;
                                        
                                        // IMPORTANT: Make sure we have a valid activities array before mapping
                                        if (!Array.isArray(prev.activities)) {
                                          return prev; // Return unchanged if not an array
                                        }
                                        
                                        // Create a defensive copy of the activities array with proper type checking
                                        const updatedActivities = prev.activities.map(a => 
                                          a.id === activityId ? { ...a, is_task_of_day: true } : a
                                        );
                                        
                                        return {
                                          ...prev,
                                          activities: updatedActivities
                                        };
                                      });
                                    }
                                    
                                    // Add a small delay to ensure state updates complete first
                                    setTimeout(() => {
                                      // Now update the underlying data by calling setTaskOfDay
                                      setTaskOfDay(activityId, employeeId);
                                    }, 10);
                                  }}
                                >
                                  {getTaskOfDayButtonText(activity)}
                                </button>
                              )}
                            </div>
                          </li>
                        ))}
                    </ul>
                  ) : (
                    <div className="empty-category">No active tasks</div>
                  )}
                </div>
              </div>
              
              {/* Deferred Tasks Section */}
              <div className="task-category-section">
                <h4 className="task-category-title">
                  <span className="category-icon">⏳</span> Deferred Tasks
                </h4>
                <div className="category-tasks">
                  {selectedEmployee.activities.some(a => a.status === 'deferred') ? (
                    <ul className="modal-tasks-list">
                      {selectedEmployee.activities
                        .filter(a => a.status === 'deferred')
                        .map(activity => (
                          <li key={activity.id} className={`modal-task-item ${isActivityRecurring(activity) ? 'recurring-task' : ''}`}>
                            <div className="modal-task-content">
                              <span className="task-icon">⏳</span>
                              <span className="task-description">{activity.description}</span>
                              {isActivityRecurring(activity) && (
                                <span className="task-recurring-badge">RECURRING</span>
                              )}
                            </div>
                            <div className="task-meta">
                              {isActivityRecurring(activity) && (
                                <span className="task-recurrence">
                                  {getRecurrenceDescription(activity)}
                                </span>
                              )}
                              {activity.due_date && (
                                <span className={`task-due-date ${
                                  formatDueDate(activity.due_date) === 'Today' ? 'due-today' : 
                                  (new Date(activity.due_date) < new Date() ? 'overdue' : '')
                                }`}>
                                  Due: {formatDueDate(activity.due_date)}
                                </span>
                              )}
                              <span className="task-date">{activity.created_at.toLocaleDateString()}</span>
                            </div>
                          </li>
                        ))}
                    </ul>
                  ) : (
                    <div className="empty-category">No deferred tasks</div>
                  )}
                </div>
              </div>
              
              {/* Completed Tasks Section */}
              <div className="task-category-section">
                <h4 className="task-category-title">
                  <span className="category-icon">✅</span> Completed Tasks
                </h4>
                <div className="category-tasks">
                  {selectedEmployee.activities.some(a => a.status === 'completed') ? (
                    <ul className="modal-tasks-list">
                      {selectedEmployee.activities
                        .filter(a => a.status === 'completed')
                        .map(activity => (
                          <li key={activity.id} className={`modal-task-item ${isActivityRecurring(activity) ? 'recurring-task' : ''}`}>
                            <div className="modal-task-content">
                              <span className="task-icon">✅</span>
                              <span className="task-description">{activity.description}</span>
                              {isActivityRecurring(activity) && (
                                <span className="task-recurring-badge">RECURRING</span>
                              )}
                            </div>
                            <div className="task-meta">
                              {isActivityRecurring(activity) && (
                                <span className="task-recurrence">
                                  {getRecurrenceDescription(activity)}
                                </span>
                              )}
                              <span className="task-date">
                                {activity.completed_at 
                                  ? `Completed: ${activity.completed_at.toLocaleDateString()}`
                                  : `Created: ${activity.created_at.toLocaleDateString()}`}
                              </span>
                            </div>
                          </li>
                        ))}
                    </ul>
                  ) : (
                    <div className="empty-category">No completed tasks</div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                className="close-btn"
                onClick={() => setSelectedEmployee(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TasksView; 