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
  [employeeId: string]: string; // employeeId -> activityId
}

const TasksView: React.FC<TasksViewProps> = ({ employees }) => {
  const [employeeActivities, setEmployeeActivities] = useState<{[key: string]: Activity[]}>({});
  const [loading, setLoading] = useState(true);
  const [activeTabs, setActiveTabs] = useState<EmployeeTabState>({});
  const [error, setError] = useState<string | null>(null);
  // Add local state for tasks of day
  const [tasksOfDay, setTasksOfDay] = useState<TasksOfDayState>({});
  
  // Use a ref to track if we've loaded from localStorage
  const initializedRef = useRef(false);

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
        const isTaskOfDay = tasksOfDay[activity.employee_id] === activity.id;
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
      
      // Update local state for tasks of day
      setTasksOfDay(prev => {
        const newTasksOfDay = { ...prev, [employeeId]: activityId };
        // Save to localStorage immediately
        try {
          console.log('Saving tasks of day immediately:', newTasksOfDay);
          localStorage.setItem('tasksOfDay', JSON.stringify(newTasksOfDay));
        } catch (e) {
          console.error('Error saving tasks of day to localStorage:', e);
        }
        return newTasksOfDay;
      });
      
      // Update our local state for immediate UI feedback
      setEmployeeActivities(prevActivities => {
        const updatedActivities = { ...prevActivities };
        
        // Reset any existing task of day for this employee
        if (updatedActivities[employeeId]) {
          updatedActivities[employeeId] = updatedActivities[employeeId].map(activity => ({
            ...activity,
            is_task_of_day: activity.id === activityId
          }));
        }
        
        return updatedActivities;
      });

      // For now, skip the database operations since the column doesn't exist
      // This will use our local state instead
      console.log(`Successfully set activity ${activityId} as task of day for employee ${employeeId} (using local storage)`);
      
      // Optional: Add a database operation attempt for when the column is added
      try {
        // First, try to reset any existing task of day - commented out until column exists
        /* 
        const { error: resetError } = await supabase
          .from('activities')
          .update({ is_task_of_day: false })
          .match({ employee_id: employeeId, is_task_of_day: true });
        
        if (resetError) {
          console.error('Error resetting existing task of day:', resetError);
          // Continue anyway to try setting the new task of day
        }
        
        // Then set the new task of day
        const { error: updateError } = await supabase
          .from('activities')
          .update({ is_task_of_day: true })
          .match({ id: activityId });
        
        if (updateError) {
          console.error('Error setting new task of day:', updateError);
          throw updateError;
        }
        */
      } catch (dbError) {
        console.error('Database operation failed (expected until schema is updated):', dbError);
        // Continue using local storage approach
      }
      
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
        const isTaskOfDay = tasksOfDay[activity.employee_id] === activity.id;
        
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
    if (activity.status === 'completed') return '✅';
    if (activity.status === 'deferred') return '⏳';
    return '🔄';
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
                    <h3 className="employee-name">{employee.name}</h3>
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
                          className={`task-item ${activity.is_task_of_day ? 'task-of-day' : ''}`}
                        >
                          <div className="task-content">
                            <span className="task-icon">
                              {getTaskIcon(activity)}
                            </span>
                            <span className="task-description">{activity.description}</span>
                            {activity.is_task_of_day && (
                              <span className="task-day-badge">TODAY</span>
                            )}
                          </div>
                          <div className="task-actions">
                            <span className="task-date">
                              {activity.created_at.toLocaleDateString()}
                            </span>
                            {activity.status === 'active' && !activity.is_task_of_day && (
                              <button 
                                className="set-today-button"
                                onClick={() => setTaskOfDay(activity.id, employee.id)}
                                title="Set as today's focus"
                              >
                                Make Today's Task
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
    </div>
  );
};

export default TasksView; 