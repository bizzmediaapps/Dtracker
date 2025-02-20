import React, { useState } from 'react';
import { Employee, WorkStatus } from '../types';

interface EmployeeListProps {
    employees: Employee[];
    onDeleteEmployee: (id: string) => void;
}

const EmployeeList: React.FC<EmployeeListProps> = ({ employees, onDeleteEmployee }) => {
    const [employeeToDelete, setEmployeeToDelete] = useState<string | null>(null);

    const handleDelete = (id: string) => {
        setEmployeeToDelete(id);
    };

    const confirmDelete = () => {
        if (employeeToDelete) {
            onDeleteEmployee(employeeToDelete);
            setEmployeeToDelete(null);
        }
    };

    const cancelDelete = () => {
        setEmployeeToDelete(null);
    };

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
                        <div className="employee-info">
                            <span className="employee-name">{employee.name}</span>
                            <span 
                                className="status-indicator"
                                style={{ backgroundColor: getStatusColor(employee.status) }}
                            >
                                {getStatusLabel(employee.status)}
                            </span>
                        </div>
                        <button
                            className="delete-button"
                            onClick={() => handleDelete(employee.id)}
                        >
                            ×
                        </button>
                    </div>
                ))}
            </div>

            {/* Confirmation Dialog */}
            {employeeToDelete && (
                <div className="confirmation-dialog-overlay">
                    <div className="confirmation-dialog">
                        <h3>Confirm Delete</h3>
                        <p>Are you sure you want to remove this employee?</p>
                        <div className="dialog-buttons">
                            <button 
                                className="confirm-button"
                                onClick={confirmDelete}
                            >
                                Yes, Remove
                            </button>
                            <button 
                                className="cancel-button"
                                onClick={cancelDelete}
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

export default EmployeeList; 