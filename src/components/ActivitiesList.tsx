import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Activity, ActivityStatus, RecurrenceType, RecurrencePattern } from '../types';

interface ActivitiesListProps {
  employeeId: string;
}

const ActivitiesList: React.FC<ActivitiesListProps> = ({ employeeId }) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [newActivity, setNewActivity] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'list' | 'table'>('list');
  const [activeFilter, setActiveFilter] = useState<ActivityStatus | 'all'>('all');
  const [savingRecurrence, setSavingRecurrence] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  
  // Recurring task form state
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>('none');
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);
  const [dueDate, setDueDate] = useState<string>('');
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [dayOfMonth, setDayOfMonth] = useState<number>(1);

  // Edit existing task recurrence state
  const [showRecurrenceModal, setShowRecurrenceModal] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [editRecurrenceType, setEditRecurrenceType] = useState<RecurrenceType>('none');
  const [editRecurrenceInterval, setEditRecurrenceInterval] = useState(1);
  const [editSelectedDays, setEditSelectedDays] = useState<number[]>([]);
  const [editDayOfMonth, setEditDayOfMonth] = useState<number>(1);
  const [editDueDate, setEditDueDate] = useState<string>('');

  useEffect(() => {
    if (employeeId) {
      fetchActivities();
    }
  }, [employeeId]);

  // Set default due date to today when form is opened
  useEffect(() => {
    if (showForm) {
      const today = new Date();
      // Format to YYYY-MM-DD for input[type="date"]
      const formattedDate = today.toISOString().split('T')[0];
      setDueDate(formattedDate);
    }
  }, [showForm]);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      // Convert string dates to Date objects and add recurrence info from localStorage
      const formattedActivities = data.map(activity => {
        const formattedActivity = {
          ...activity,
          created_at: new Date(activity.created_at),
          updated_at: new Date(activity.updated_at),
          completed_at: activity.completed_at ? new Date(activity.completed_at) : null,
          due_date: activity.due_date ? new Date(activity.due_date) : undefined,
          last_completed_date: activity.last_completed_date ? new Date(activity.last_completed_date) : undefined
        };
        
        // Always try to load recurrence pattern from localStorage
        const localStorageKey = `recurrence_pattern_${activity.id}`;
        const storedPattern = localStorage.getItem(localStorageKey);
        
        if (storedPattern) {
          try {
            formattedActivity.recurrence_pattern = JSON.parse(storedPattern);
            // If the pattern includes a due date, and the task doesn't have one, use it
            if (formattedActivity.recurrence_pattern.nextDueDate && !formattedActivity.due_date) {
              formattedActivity.due_date = new Date(formattedActivity.recurrence_pattern.nextDueDate);
            }
            console.info("Loaded recurrence pattern from localStorage:", localStorageKey);
          } catch (parseError) {
            console.error("Error parsing stored recurrence pattern:", parseError);
          }
        }
        
        return formattedActivity;
      });

      setActivities(formattedActivities);
      
      // Check and update any recurring tasks that need to be updated
      updateRecurringTasksDueDates(formattedActivities);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  // Function to update due dates for recurring tasks
  const updateRecurringTasksDueDates = async (activityList: Activity[]) => {
    const tasksToUpdate: Activity[] = [];

    // Get current date at beginning of day (for comparison)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find tasks that need their due date updated
    activityList.forEach(activity => {
      if (isActivityRecurring(activity) && activity.recurrence_pattern && activity.status !== 'completed') {
        // Check due date from either property or recurrence pattern
        const dueDate = getActivityDueDate(activity);
        
        // If the task has a due date and it's in the past or today, or it has been completed
        if (dueDate && (dueDate <= today || activity.last_completed_date)) {
          // Calculate the next due date based on the recurrence pattern
          const nextDueDate = calculateNextDueDate(activity);
          if (nextDueDate) {
            // Create updated recurrence pattern with new due date
            const updatedRecurrencePattern = {
              ...activity.recurrence_pattern,
              nextDueDate: nextDueDate
            };
            
            tasksToUpdate.push({
              ...activity,
              recurrence_pattern: updatedRecurrencePattern
            });
          }
        }
      }
    });

    // Update tasks using localStorage
    if (tasksToUpdate.length > 0) {
      for (const task of tasksToUpdate) {
        try {
          // Store the updated recurrence pattern in localStorage
          const localStorageKey = `recurrence_pattern_${task.id}`;
          localStorage.setItem(localStorageKey, JSON.stringify(task.recurrence_pattern));
          console.info("Updated recurrence pattern in localStorage:", localStorageKey);
        } catch (err) {
          console.error('Error updating recurring task:', err);
        }
      }

      // Refresh activities after updates
      fetchActivities();
    }
  };

  // Calculate the next due date based on recurrence pattern
  const calculateNextDueDate = (activity: Activity): Date | null => {
    // Check both possible sources of due date
    const dueDate = activity.recurrence_pattern?.nextDueDate || activity.due_date;
    if (!activity.recurrence_pattern || !dueDate) return null;

    const pattern = activity.recurrence_pattern;
    let baseDate = new Date();
    
    // If the task was completed, use the completion date as the base
    if (activity.last_completed_date) {
      baseDate = new Date(activity.last_completed_date);
    } else {
      // Otherwise use the existing due date
      baseDate = new Date(dueDate);
    }

    let nextDate = new Date(baseDate);

    switch (pattern.type) {
      case 'daily':
        nextDate.setDate(baseDate.getDate() + pattern.interval);
        break;

      case 'weekly':
        // For weekly recurrence, advance to the next week
        nextDate.setDate(baseDate.getDate() + (pattern.interval * 7));
        
        // If specific days of week are set, find the next occurrence
        if (pattern.daysOfWeek && pattern.daysOfWeek.length > 0) {
          // Sort days to ensure we find the next one
          const sortedDays = [...pattern.daysOfWeek].sort((a, b) => a - b);
          const currentDayOfWeek = nextDate.getDay();
          
          // Find the next day of week
          let found = false;
          for (const day of sortedDays) {
            if (day > currentDayOfWeek) {
              // Adjust to the specified day this week
              nextDate.setDate(nextDate.getDate() + (day - currentDayOfWeek));
              found = true;
              break;
            }
          }
          
          // If no day was found (we're past all specified days), go to the first day next week
          if (!found && sortedDays.length > 0) {
            // 7 days to next week, then adjust to the first specified day
            nextDate.setDate(nextDate.getDate() + (7 - currentDayOfWeek) + sortedDays[0]);
          }
        }
        break;

      case 'monthly':
        // For monthly recurrence, advance to the next month
        nextDate.setMonth(nextDate.getMonth() + pattern.interval);
        
        // If a specific day of month is set
        if (pattern.dayOfMonth) {
          // Set to the specified day of month, handling month length
          const daysInMonth = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
          nextDate.setDate(Math.min(pattern.dayOfMonth, daysInMonth));
        }
        break;

      default:
        return null;
    }

    return nextDate;
  };

  const addActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActivity.trim()) return;

    try {
      // Prepare the activity record
      const activityData: any = {
        employee_id: employeeId,
        description: newActivity,
        status: 'active'
      };

      // Add the activity to the database (without recurrence info)
      const { data, error } = await supabase
        .from('activities')
        .insert(activityData)
        .select();

      if (error) {
        console.error('Error adding activity:', error);
        alert(`Failed to add activity: ${error.message}`);
        throw error;
      }

      // If this is a recurring task, store the pattern in localStorage
      if (isRecurring && recurrenceType !== 'none' && data && data.length > 0) {
        const activityId = data[0].id;
        const recurrencePattern: RecurrencePattern = {
          type: recurrenceType,
          interval: recurrenceInterval,
          isRecurring: true
        };

        // Add specific recurrence details based on type
        if (recurrenceType === 'weekly' && selectedDays.length > 0) {
          recurrencePattern.daysOfWeek = selectedDays;
        } else if (recurrenceType === 'monthly' && dayOfMonth) {
          recurrencePattern.dayOfMonth = dayOfMonth;
        }

        // Store due date in recurrence pattern
        if (dueDate) {
          recurrencePattern.nextDueDate = new Date(dueDate);
        }

        // Save to localStorage
        const localStorageKey = `recurrence_pattern_${activityId}`;
        localStorage.setItem(localStorageKey, JSON.stringify(recurrencePattern));
        console.info("Saved recurrence pattern to localStorage:", localStorageKey);
      }

      // Reset form state
      setNewActivity('');
      setIsRecurring(false);
      setRecurrenceType('none');
      setRecurrenceInterval(1);
      setSelectedDays([]);
      setDayOfMonth(1);
      
      // Set new due date to today
      const today = new Date();
      setDueDate(today.toISOString().split('T')[0]);

      // Close the form
      setShowForm(false);
      
      // Refresh activities list
      await fetchActivities();
    } catch (error) {
      console.error('Error adding activity:', error);
    }
  };

  const updateActivityStatus = async (activityId: string, newStatus: ActivityStatus) => {
    try {
      const activity = activities.find(a => a.id === activityId);
      if (!activity) return;

      const updates: any = {
        status: newStatus
      };

      // If marking as completed, set the completed_at timestamp
      if (newStatus === 'completed') {
        const now = new Date();
        updates.completed_at = now.toISOString();
        
        // If it's a recurring task, also update last_completed_date
        if (activity.is_recurring) {
          updates.last_completed_date = now.toISOString();
          updates.status = 'active'; // Keep recurring tasks active
        }
      } else if (newStatus === 'active') {
        updates.completed_at = null;
      }

      const { error } = await supabase
        .from('activities')
        .update(updates)
        .eq('id', activityId);

      if (error) throw error;

      await fetchActivities();
    } catch (error) {
      console.error('Error updating activity status:', error);
    }
  };

  const setTaskOfDay = async (activityId: string) => {
    try {
      // First, reset any existing task of day for this employee
      await supabase
        .from('activities')
        .update({ is_task_of_day: false })
        .eq('employee_id', employeeId)
        .eq('is_task_of_day', true);
      
      // Then set the new task of day
      await supabase
        .from('activities')
        .update({ is_task_of_day: true })
        .eq('id', activityId);
      
      await fetchActivities();
    } catch (error) {
      console.error('Error setting task of day:', error);
    }
  };

  const getStatusIcon = (status: ActivityStatus) => {
    switch (status) {
      case 'active': return '🔄';
      case 'completed': return '✅';
      case 'deferred': return '⏳';
      default: return '•';
    }
  };

  // Helper function to consistently get the due date from an activity
  const getActivityDueDate = (activity: Activity): Date | undefined => {
    if (activity.due_date) {
      return new Date(activity.due_date);
    } else if (activity.recurrence_pattern?.nextDueDate) {
      return new Date(activity.recurrence_pattern.nextDueDate);
    }
    return undefined;
  };

  // Helper function to check if activity is recurring
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

  // Format the due date
  const formatDueDate = (activity?: Activity): string => {
    if (!activity) return '';
    
    const dueDate = getActivityDueDate(activity);
    if (!dueDate) return '';
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const taskDate = new Date(dueDate);
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

  const filteredActivities = activeFilter === 'all' 
    ? activities 
    : activities.filter(activity => activity.status === activeFilter);

  // Days of week for the weekly recurrence selector
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Handle day selection for weekly recurrence
  const toggleDaySelection = (dayIndex: number) => {
    setSelectedDays(prevDays => {
      if (prevDays.includes(dayIndex)) {
        return prevDays.filter(d => d !== dayIndex);
      } else {
        return [...prevDays, dayIndex];
      }
    });
  };

  // Open the recurrence modal for editing a task
  const openRecurrenceModal = (activity: Activity) => {
    setEditingActivity(activity);
    setEditRecurrenceType(activity.recurrence_pattern?.type || 'none');
    setEditRecurrenceInterval(activity.recurrence_pattern?.interval || 1);
    setEditSelectedDays(activity.recurrence_pattern?.daysOfWeek || []);
    setEditDayOfMonth(activity.recurrence_pattern?.dayOfMonth || 1);
    
    // Set due date if it exists
    if (activity.due_date) {
      const formattedDate = new Date(activity.due_date).toISOString().split('T')[0];
      setEditDueDate(formattedDate);
    } else {
      // Default to today
      const today = new Date();
      const formattedDate = today.toISOString().split('T')[0];
      setEditDueDate(formattedDate);
    }
    
    setShowRecurrenceModal(true);
  };

  // Save recurrence settings for an existing task
  const saveRecurrenceSettings = async () => {
    if (!editingActivity) return;

    // Validate required fields before saving
    if (editRecurrenceType !== 'none') {
      // Validate interval
      if (editRecurrenceInterval < 1) {
        alert('Please enter a valid interval (minimum 1)');
        return;
      }
      
      // Validate that at least one day is selected for weekly recurrence
      if (editRecurrenceType === 'weekly' && editSelectedDays.length === 0) {
        alert('Please select at least one day of the week for weekly recurrence');
        return;
      }
      
      // Validate day of month for monthly recurrence
      if (editRecurrenceType === 'monthly' && (editDayOfMonth < 1 || editDayOfMonth > 31)) {
        alert('Please enter a valid day of month (1-31)');
        return;
      }
      
      // Validate due date is provided
      if (!editDueDate) {
        alert('Please select a due date for the recurring task');
        return;
      }
    }

    try {
      setSavingRecurrence(true);
      
      // Create recurrence pattern object
      const recurrencePattern: RecurrencePattern = {
        type: editRecurrenceType,
        interval: editRecurrenceInterval,
        isRecurring: editRecurrenceType !== 'none'
      };

      // Add specific recurrence details based on type
      if (editRecurrenceType === 'weekly' && editSelectedDays.length > 0) {
        recurrencePattern.daysOfWeek = editSelectedDays;
      } else if (editRecurrenceType === 'monthly' && editDayOfMonth) {
        recurrencePattern.dayOfMonth = editDayOfMonth;
      }

      // Store the due date inside the recurrence_pattern object
      if (editDueDate) {
        // Convert to a Date object for better handling
        const dueDateObj = new Date(editDueDate);
        recurrencePattern.nextDueDate = dueDateObj;
      }

      // Since neither column exists, always store in localStorage
      const localStorageKey = `recurrence_pattern_${editingActivity.id}`;
      localStorage.setItem(localStorageKey, JSON.stringify(recurrencePattern));
      console.info("Saved recurrence pattern to localStorage:", localStorageKey);

      // Show success message
      setSaveSuccess('Recurrence settings saved successfully!');
      
      // Hide the success message after a delay
      setTimeout(() => {
        setSaveSuccess(null);
      }, 3000);

      // Reset modal state
      closeRecurrenceModal();
      
      // Refresh activities to show the changes
      await fetchActivities();
    } catch (error) {
      console.error('Error updating activity recurrence:', error);
    } finally {
      setSavingRecurrence(false);
    }
  };

  // Close the recurrence modal
  const closeRecurrenceModal = () => {
    setShowRecurrenceModal(false);
    setEditingActivity(null);
    setEditRecurrenceType('none');
    setEditRecurrenceInterval(1);
    setEditSelectedDays([]);
    setEditDayOfMonth(1);
    setEditDueDate('');
  };

  // Toggle day selection for weekly recurrence in edit mode
  const toggleEditDaySelection = (dayIndex: number) => {
    setEditSelectedDays(prevDays => {
      if (prevDays.includes(dayIndex)) {
        return prevDays.filter(d => d !== dayIndex);
      } else {
        return [...prevDays, dayIndex];
      }
    });
  };

  // Function to convert activities to CSV format and download
  const exportToCSV = () => {
    // Use the filtered activities based on current filter selection
    const dataToExport = filteredActivities;
    
    if (dataToExport.length === 0) {
      alert('No activities to export');
      return;
    }

    // Define CSV headers
    const headers = [
      'ID',
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
    const csvData = dataToExport.map(activity => {
      const recurrenceDescription = activity.is_recurring ? 
        getRecurrenceDescription(activity) : 'Not Recurring';
      
      // Properly escape fields for CSV
      return [
        activity.id,
        // Escape quotes in description to avoid breaking CSV format
        `"${activity.description.replace(/"/g, '""')}"`,
        activity.status,
        activity.due_date ? new Date(activity.due_date).toLocaleDateString() : 
        (activity.recurrence_pattern?.nextDueDate ? new Date(activity.recurrence_pattern.nextDueDate).toLocaleDateString() : ''),
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
    
    // Include filter info in the filename if a filter is active
    const filterInfo = activeFilter !== 'all' ? `-${activeFilter}` : '';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `activities${filterInfo}-${timestamp}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper to check if a task is due today
  const isDueToday = (activity: Activity): boolean => {
    const dueDate = getActivityDueDate(activity);
    if (!dueDate) return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const taskDate = new Date(dueDate);
    taskDate.setHours(0, 0, 0, 0);
    
    return taskDate.getTime() === today.getTime();
  };

  // Helper to check if a task is overdue
  const isOverdue = (activity: Activity): boolean => {
    const dueDate = getActivityDueDate(activity);
    if (!dueDate) return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const taskDate = new Date(dueDate);
    taskDate.setHours(0, 0, 0, 0);
    
    return taskDate < today;
  };

  return (
    <div className="activities-list glass-effect">
      {saveSuccess && (
        <div className="success-notification">
          {saveSuccess}
        </div>
      )}
      <div className="activities-header">
        <h2>Activities & Tasks</h2>
        <div className="activities-header-buttons">
          <button 
            className="export-csv-button"
            onClick={exportToCSV}
            title="Export tasks to CSV"
          >
            📥 Export Tasks
          </button>
          <button 
            className="add-activity-button"
            onClick={() => setShowForm(true)}
          >
            + New Activity
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={addActivity} className="activity-add-form">
          <textarea
            value={newActivity}
            onChange={(e) => setNewActivity(e.target.value)}
            placeholder="What are you working on?"
            className="activity-textarea"
            rows={3}
            autoFocus
          />
          
          <div className="form-row">
            <div className="form-group date-group">
              <label htmlFor="dueDate">Due Date:</label>
              <input
                type="date"
                id="dueDate"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="date-input"
              />
            </div>
            
            <div className="form-group checkbox-group">
              <input
                type="checkbox"
                id="isRecurring"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="checkbox-input"
              />
              <label htmlFor="isRecurring">Recurring Task</label>
            </div>
          </div>
          
          {isRecurring && (
            <div className="recurrence-options">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="recurrenceType">Repeats:</label>
                  <select
                    id="recurrenceType"
                    value={recurrenceType}
                    onChange={(e) => setRecurrenceType(e.target.value as RecurrenceType)}
                    className="select-input"
                  >
                    <option value="none">Select Frequency</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label htmlFor="recurrenceInterval">Every:</label>
                  <div className="interval-group">
                    <input
                      type="number"
                      id="recurrenceInterval"
                      value={recurrenceInterval}
                      onChange={(e) => setRecurrenceInterval(Math.max(1, parseInt(e.target.value) || 1))}
                      min="1"
                      className="number-input"
                    />
                    <span className="interval-label">
                      {recurrenceType === 'daily' ? 'day(s)' : 
                       recurrenceType === 'weekly' ? 'week(s)' : 
                       recurrenceType === 'monthly' ? 'month(s)' : ''}
                    </span>
                  </div>
                </div>
              </div>
              
              {recurrenceType === 'weekly' && (
                <div className="days-of-week-selector">
                  <label>Repeat on:</label>
                  <div className="days-buttons">
                    {daysOfWeek.map((day, index) => (
                      <button
                        key={day}
                        type="button"
                        className={`day-button ${selectedDays.includes(index) ? 'selected' : ''}`}
                        onClick={() => toggleDaySelection(index)}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {recurrenceType === 'monthly' && (
                <div className="form-group">
                  <label htmlFor="dayOfMonth">Day of month:</label>
                  <input
                    type="number"
                    id="dayOfMonth"
                    value={dayOfMonth}
                    onChange={(e) => setDayOfMonth(Math.min(31, Math.max(1, parseInt(e.target.value) || 1)))}
                    min="1"
                    max="31"
                    className="number-input"
                  />
                </div>
              )}
            </div>
          )}
          
          <div className="button-group">
            <button 
              type="submit" 
              className="submit-button"
              disabled={!newActivity.trim()}
            >
              Add Activity
            </button>
            <button 
              type="button" 
              className="cancel-button"
              onClick={() => {
                setNewActivity('');
                setIsRecurring(false);
                setRecurrenceType('none');
                setShowForm(false);
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="activities-tabs">
        <button 
          className={`tab-button ${activeTab === 'list' ? 'active' : ''}`}
          onClick={() => setActiveTab('list')}
        >
          List View
        </button>
        <button 
          className={`tab-button ${activeTab === 'table' ? 'active' : ''}`}
          onClick={() => setActiveTab('table')}
        >
          Table View
        </button>
      </div>

      <div className="activities-filters">
        <button 
          className={`filter-button ${activeFilter === 'all' ? 'active' : ''}`}
          onClick={() => setActiveFilter('all')}
        >
          All
        </button>
        <button 
          className={`filter-button ${activeFilter === 'active' ? 'active' : ''}`}
          onClick={() => setActiveFilter('active')}
        >
          Active
        </button>
        <button 
          className={`filter-button ${activeFilter === 'completed' ? 'active' : ''}`}
          onClick={() => setActiveFilter('completed')}
        >
          Completed
        </button>
        <button 
          className={`filter-button ${activeFilter === 'deferred' ? 'active' : ''}`}
          onClick={() => setActiveFilter('deferred')}
        >
          Deferred
        </button>
      </div>

      {loading ? (
        <div className="loading-activities">Loading activities...</div>
      ) : filteredActivities.length === 0 ? (
        <div className="no-activities">
          <p>No activities found.</p>
        </div>
      ) : activeTab === 'list' ? (
        <ul className="activities-items">
          {filteredActivities.map(activity => (
            <li key={activity.id} className={`activity-item status-${activity.status} ${activity.is_task_of_day ? 'is-task-of-day' : ''}`}>
              <div className="activity-content">
                <div className="activity-status-icon">{getStatusIcon(activity.status)}</div>
                <div className="activity-details">
                  <p className="activity-description">{activity.description}</p>
                  <div className="activity-meta">
                    {activity.is_recurring && (
                      <span className="activity-recurrence">
                        <span className="recurrence-icon">🔁</span> {getRecurrenceDescription(activity)}
                      </span>
                    )}
                    {getActivityDueDate(activity) && (
                      <span className={`activity-due-date ${
                        isDueToday(activity) ? 'due-today' : 
                        isOverdue(activity) ? 'overdue' : ''
                      }`}>
                        <span className="due-date-icon">📅</span> Due: {formatDueDate(activity)}
                      </span>
                    )}
                    <span className="activity-date">
                      {activity.status === 'completed' 
                        ? `Completed: ${activity.completed_at?.toLocaleDateString()}` 
                        : `Added: ${activity.created_at.toLocaleDateString()}`}
                    </span>
                  </div>
                </div>
              </div>
              <div className="activity-actions">
                {activity.status !== 'completed' && (
                  <button 
                    className="complete-button" 
                    onClick={() => updateActivityStatus(activity.id, 'completed')}
                    title="Mark as completed"
                  >
                    ✓
                  </button>
                )}
                {activity.status !== 'active' && (
                  <button 
                    className="reactivate-button" 
                    onClick={() => updateActivityStatus(activity.id, 'active')}
                    title="Mark as active"
                  >
                    ↻
                  </button>
                )}
                {activity.status !== 'deferred' && (
                  <button 
                    className="defer-button" 
                    onClick={() => updateActivityStatus(activity.id, 'deferred')}
                    title="Defer this activity"
                  >
                    ⏱
                  </button>
                )}
                {activity.status === 'active' && !activity.is_task_of_day && (
                  <button 
                    className="today-button" 
                    onClick={() => setTaskOfDay(activity.id)}
                    title="Set as today's focus task"
                  >
                    🔥
                  </button>
                )}
                <button 
                  className="recurrence-button" 
                  onClick={() => openRecurrenceModal(activity)}
                  title={activity.is_recurring ? "Edit recurrence" : "Set as recurring"}
                >
                  🔁
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="activities-table-container">
          <table className="activities-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Description</th>
                <th>Due</th>
                <th>Recurrence</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredActivities.map(activity => (
                <tr key={activity.id} className={`table-row status-${activity.status}`}>
                  <td className="status-cell">
                    <span className="status-badge">{getStatusIcon(activity.status)}</span>
                  </td>
                  <td className="description-cell">{activity.description}</td>
                  <td className="date-cell">
                    {getActivityDueDate(activity) && formatDueDate(activity)}
                  </td>
                  <td className="date-cell">
                    {activity.is_recurring && (
                      <span className="recurrence-info">
                        <span className="recurrence-icon">🔁</span>
                        {getRecurrenceDescription(activity)}
                      </span>
                    )}
                  </td>
                  <td className="date-cell">{activity.created_at.toLocaleDateString()}</td>
                  <td className="actions-cell">
                    {activity.status !== 'completed' && (
                      <button 
                        className="table-action-button complete-button" 
                        onClick={() => updateActivityStatus(activity.id, 'completed')}
                        title="Mark as completed"
                      >
                        ✓
                      </button>
                    )}
                    {activity.status !== 'active' && (
                      <button 
                        className="table-action-button reactivate-button" 
                        onClick={() => updateActivityStatus(activity.id, 'active')}
                        title="Mark as active"
                      >
                        ↻
                      </button>
                    )}
                    {activity.status !== 'deferred' && (
                      <button 
                        className="table-action-button defer-button" 
                        onClick={() => updateActivityStatus(activity.id, 'deferred')}
                        title="Defer this activity"
                      >
                        ⏱
                      </button>
                    )}
                    {activity.status === 'active' && !activity.is_task_of_day && (
                      <button 
                        className="table-action-button today-button" 
                        onClick={() => setTaskOfDay(activity.id)}
                        title="Set as today's focus task"
                      >
                        🔥
                      </button>
                    )}
                    <button 
                      className="table-action-button recurrence-button" 
                      onClick={() => openRecurrenceModal(activity)}
                      title={activity.is_recurring ? "Edit recurrence" : "Set as recurring"}
                    >
                      🔁
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Recurrence Modal */}
      {showRecurrenceModal && editingActivity && (
        <div className="modal-overlay">
          <div className="recurrence-modal">
            <div className="modal-header">
              <h3>{editingActivity.is_recurring ? "Edit Recurrence" : "Set as Recurring"}</h3>
              <button className="close-modal" onClick={closeRecurrenceModal}>×</button>
            </div>
            <div className="modal-content">
              <div className="edit-activity-description">
                <strong>Task:</strong> {editingActivity.description}
              </div>
              
              <div className="form-row">
                <div className="form-group date-group">
                  <label htmlFor="editDueDate">Due Date:</label>
                  <input
                    type="date"
                    id="editDueDate"
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    className="date-input"
                  />
                </div>
              </div>
              
              <div className="recurrence-options">
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="editRecurrenceType">Repeats:</label>
                    <select
                      id="editRecurrenceType"
                      value={editRecurrenceType}
                      onChange={(e) => setEditRecurrenceType(e.target.value as RecurrenceType)}
                      className="select-input"
                    >
                      <option value="none">Not Recurring</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                  
                  {editRecurrenceType !== 'none' && (
                    <div className="form-group">
                      <label htmlFor="editRecurrenceInterval">Every:</label>
                      <div className="interval-group">
                        <input
                          type="number"
                          id="editRecurrenceInterval"
                          value={editRecurrenceInterval}
                          onChange={(e) => setEditRecurrenceInterval(Math.max(1, parseInt(e.target.value) || 1))}
                          min="1"
                          className="number-input"
                        />
                        <span className="interval-label">
                          {editRecurrenceType === 'daily' ? 'day(s)' : 
                           editRecurrenceType === 'weekly' ? 'week(s)' : 
                           editRecurrenceType === 'monthly' ? 'month(s)' : ''}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                
                {editRecurrenceType === 'weekly' && (
                  <div className="days-of-week-selector">
                    <label>Repeat on:</label>
                    <div className="days-buttons">
                      {daysOfWeek.map((day, index) => (
                        <button
                          key={day}
                          type="button"
                          className={`day-button ${editSelectedDays.includes(index) ? 'selected' : ''}`}
                          onClick={() => toggleEditDaySelection(index)}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                {editRecurrenceType === 'monthly' && (
                  <div className="form-group">
                    <label htmlFor="editDayOfMonth">Day of month:</label>
                    <input
                      type="number"
                      id="editDayOfMonth"
                      value={editDayOfMonth}
                      onChange={(e) => setEditDayOfMonth(Math.min(31, Math.max(1, parseInt(e.target.value) || 1)))}
                      min="1"
                      max="31"
                      className="number-input"
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="save-button" 
                onClick={saveRecurrenceSettings}
                disabled={savingRecurrence}
              >
                {savingRecurrence ? 'Saving...' : 'Save Recurrence'}
              </button>
              <button 
                className="cancel-button" 
                onClick={closeRecurrenceModal}
                disabled={savingRecurrence}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivitiesList; 