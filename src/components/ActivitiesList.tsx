import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Activity, ActivityStatus } from '../types';

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

  useEffect(() => {
    if (employeeId) {
      fetchActivities();
    }
  }, [employeeId]);

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

      // Convert string dates to Date objects
      const formattedActivities = data.map(activity => ({
        ...activity,
        created_at: new Date(activity.created_at),
        updated_at: new Date(activity.updated_at),
        completed_at: activity.completed_at ? new Date(activity.completed_at) : null
      }));

      setActivities(formattedActivities);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const addActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActivity.trim()) return;

    try {
      const { error } = await supabase
        .from('activities')
        .insert({
          employee_id: employeeId,
          description: newActivity,
          status: 'active'
        });

      if (error) throw error;

      setNewActivity('');
      setShowForm(false);
      await fetchActivities();
    } catch (error) {
      console.error('Error adding activity:', error);
    }
  };

  const updateActivityStatus = async (activityId: string, newStatus: ActivityStatus) => {
    try {
      const updates: { status: ActivityStatus; completed_at?: string | null } = {
        status: newStatus
      };

      // If marking as completed, set the completed_at timestamp
      if (newStatus === 'completed') {
        updates.completed_at = new Date().toISOString();
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

  const getStatusIcon = (status: ActivityStatus) => {
    switch (status) {
      case 'active': return '🔄';
      case 'completed': return '✅';
      case 'deferred': return '⏳';
      default: return '•';
    }
  };

  const filteredActivities = activeFilter === 'all' 
    ? activities 
    : activities.filter(activity => activity.status === activeFilter);

  return (
    <div className="activities-list glass-effect">
      <div className="activities-header">
        <h2>Activities & Tasks</h2>
        <button 
          className="add-activity-button"
          onClick={() => setShowForm(true)}
        >
          + New Activity
        </button>
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
            <li key={activity.id} className={`activity-item status-${activity.status}`}>
              <div className="activity-content">
                <div className="activity-status-icon">{getStatusIcon(activity.status)}</div>
                <div className="activity-details">
                  <p className="activity-description">{activity.description}</p>
                  <div className="activity-meta">
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
                <th>Date Added</th>
                <th>Last Update</th>
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
                  <td className="date-cell">{activity.created_at.toLocaleDateString()}</td>
                  <td className="date-cell">{activity.updated_at.toLocaleDateString()}</td>
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ActivitiesList; 