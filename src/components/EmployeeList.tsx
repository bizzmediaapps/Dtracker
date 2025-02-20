import React from 'react';
import { Employee, WorkStatus } from '../types';

interface EmployeeListProps {
    employees: Employee[];
}

const EmployeeList: React.FC<EmployeeListProps> = ({ employees }) => {
    const getStatusColor = (status: WorkStatus): string => {
        const colors = {
            'in-office': '#4CAF50',
            'on-job': '#2196F3',
            'wfh': '#9C27B0',
            'off': '#757575'
        };
        return colors[status];
    };

    const getStatusLabel = (status: WorkStatus): string => {
        const labels = {
            'in-office': 'In Office',
            'on-job': 'Out on Job',
            'wfh': 'Work from Home',
            'off': 'Off for the Day'
        };
        return labels[status];
    };

    return (
        <div className="employee-list">
            <h2>Employee Status Overview</h2>
            <div className="employee-grid">
                {employees.map((employee) => (
                    <div key={employee.id} className="employee-card">
                        <div className="employee-name">{employee.name}</div>
                        <div 
                            className="employee-status"
                            style={{ 
                                color: getStatusColor(employee.status),
                                borderColor: getStatusColor(employee.status)
                            }}
                        >
                            {getStatusLabel(employee.status)}
                        </div>
                        <div className="last-updated">
                            Last updated: {new Date(employee.lastUpdated).toLocaleString()}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default EmployeeList; 