import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Employee, Activity } from '../types';

interface TasksViewProps {
  employees: Employee[];
}

const TasksView: React.FC<TasksViewProps> = ({ employees }) => {
  const [employeeActivities, setEmployeeActivities] = useState<{[key: string]: Activity[]}>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllActivities();
  }, [employees]);

  const fetchAllActivities = async () => {
    if (employees.length === 0) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .in('employee_id', employees.map(e => e.id))
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group activities by employee
      const activitiesByEmployee: {[key: string]: Activity[]} = {};
      data.forEach(activity => {
        // Convert dates
        const formattedActivity = {
          ...activity,
          created_at: new Date(activity.created_at),
          updated_at: new Date(activity.updated_at),
          completed_at: activity.completed_at ? new Date(activity.completed_at) : null
        };

        if (!activitiesByEmployee[activity.employee_id]) {
          activitiesByEmployee[activity.employee_id] = [];
        }
        activitiesByEmployee[activity.employee_id].push(formattedActivity);
      });

      setEmployeeActivities(activitiesByEmployee);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
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

  if (loading) {
    return <div className="loading-tasks">Loading tasks...</div>;
  }

  return (
    <div className="tasks-view glass-effect">
      <h2>Employee Tasks</h2>
      
      {employees.length === 0 ? (
        <div className="no-employees">No employees to display</div>
      ) : (
        <div className="tasks-container">
          {employees.map(employee => (
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
              
              <div className="employee-tasks-list">
                {!employeeActivities[employee.id] || employeeActivities[employee.id].length === 0 ? (
                  <div className="no-tasks">No active tasks</div>
                ) : (
                  <ul className="tasks-list">
                    {employeeActivities[employee.id].map(activity => (
                      <li key={activity.id} className="task-item">
                        <div className="task-content">
                          <span className="task-icon">🔄</span>
                          <span className="task-description">{activity.description}</span>
                        </div>
                        <span className="task-date">
                          {activity.created_at.toLocaleDateString()}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TasksView; 