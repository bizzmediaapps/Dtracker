import React, { useState } from 'react';

interface ActivityInputProps {
    currentActivity: string;
    onActivityUpdate: (newActivity: string) => void;
    // We'll keep employeeId in the interface for future use, but mark it as optional
    employeeId?: string;
}

const ActivityInput: React.FC<ActivityInputProps> = ({ 
    currentActivity, 
    onActivityUpdate,
    // employeeId is not used, so we'll remove it from the destructuring
}) => {
    const [activity, setActivity] = useState(currentActivity);
    const [isEditing, setIsEditing] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onActivityUpdate(activity);
        setIsEditing(false);
    };

    return (
        <div className="activity-input glass-effect">
            <h2>What are you working on?</h2>
            
            {!isEditing ? (
                <div className="activity-display">
                    <p className="activity-text">
                        {currentActivity ? currentActivity : "No activity set"}
                    </p>
                    <button 
                        className="edit-activity-button"
                        onClick={() => setIsEditing(true)}
                    >
                        {currentActivity ? "Update" : "Add activity"}
                    </button>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="activity-form">
                    <textarea
                        value={activity}
                        onChange={(e) => setActivity(e.target.value)}
                        placeholder="What are you working on today/this week?"
                        className="activity-textarea"
                        rows={3}
                        autoFocus
                    />
                    <div className="button-group">
                        <button 
                            type="submit" 
                            className="submit-button"
                        >
                            Save
                        </button>
                        <button 
                            type="button" 
                            className="cancel-button"
                            onClick={() => {
                                setActivity(currentActivity);
                                setIsEditing(false);
                            }}
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
};

export default ActivityInput; 