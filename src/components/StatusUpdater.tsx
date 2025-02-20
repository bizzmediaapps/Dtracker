import React, { useState } from 'react';
import { WorkStatus } from '../types';

interface StatusUpdaterProps {
    currentStatus: WorkStatus;
    onStatusUpdate: (newStatus: WorkStatus) => void;
}

const StatusUpdater: React.FC<StatusUpdaterProps> = ({ currentStatus, onStatusUpdate }) => {
    const [hoveredStatus, setHoveredStatus] = useState<WorkStatus | null>(null);

    const statusOptions: { value: WorkStatus; label: string; color: string }[] = [
        { value: 'in-office', label: 'In Office', color: '#4CAF50' },
        { value: 'on-job', label: 'Out on Job', color: '#2196F3' },
        { value: 'wfh', label: 'Work from Home', color: '#9C27B0' },
        { value: 'off', label: 'Off for the Day', color: '#757575' },
    ];

    return (
        <div className="status-updater">
            <h2>Update Your Status</h2>
            <div className="status-buttons">
                {statusOptions.map((option) => (
                    <button
                        key={option.value}
                        onClick={() => onStatusUpdate(option.value)}
                        onMouseEnter={() => setHoveredStatus(option.value)}
                        onMouseLeave={() => setHoveredStatus(null)}
                        className={`status-button ${currentStatus === option.value ? 'active' : ''}`}
                        style={{
                            backgroundColor: currentStatus === option.value ? option.color : 'transparent',
                            color: currentStatus === option.value ? 'white' : option.color,
                            border: `2px solid ${option.color}`,
                            transform: hoveredStatus === option.value ? 'scale(1.05)' : 'scale(1)',
                        }}
                    >
                        {option.label}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default StatusUpdater; 