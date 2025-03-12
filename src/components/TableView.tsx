import React from 'react';
import { Employee } from '../types';

interface TableViewProps {
    employees: Employee[];
    onDeleteEmployee?: (id: string) => void;
}

const TableView: React.FC<TableViewProps> = ({ employees, onDeleteEmployee }) => {
    const getStatusColor = (status: string): string => {
        switch (status) {
            case 'in-office': return '#4CAF50';
            case 'on-job': return '#2196F3';
            case 'wfh': return '#9C27B0';
            case 'off': return '#757575';
            default: return '#757575';
        }
    };

    const getStatusLabel = (status: string): string => {
        const labels: { [key: string]: string } = {
            'in-office': 'In Office',
            'on-job': 'Out on Job',
            'wfh': 'Work from Home',
            'off': 'Off for the Day'
        };
        return labels[status] || status;
    };

    return (
        <div className="table-view glass-effect">
            <table>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Status</th>
                        <th>Activity</th>
                        <th>Last Updated</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {employees.map((employee) => (
                        <tr key={employee.id}>
                            <td>{employee.name}</td>
                            <td>
                                <span 
                                    className="status-badge"
                                    style={{ 
                                        backgroundColor: getStatusColor(employee.status),
                                        color: 'white',
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        fontSize: '0.9em'
                                    }}
                                >
                                    {getStatusLabel(employee.status)}
                                </span>
                            </td>
                            <td className="activity-cell">
                                {employee.activity || <em>No activity set</em>}
                            </td>
                            <td>{new Date(employee.lastUpdated).toLocaleString()}</td>
                            <td>
                                {onDeleteEmployee && (
                                    <button
                                        onClick={() => onDeleteEmployee(employee.id)}
                                        className="delete-button"
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: '#dc3545',
                                            cursor: 'pointer',
                                            fontSize: '1.2em',
                                            padding: '4px 8px'
                                        }}
                                    >
                                        ×
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default TableView; 