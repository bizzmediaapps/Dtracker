import React from 'react';
import { Employee, WorkStatus } from '../types';

interface TableViewProps {
    employees: Employee[];
}

const TableView: React.FC<TableViewProps> = ({ employees }) => {
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
        <div className="table-view">
            <table className="employee-table">
                <thead>
                    <tr>
                        <th>Status</th>
                        <th>Name</th>
                        <th>Current Status</th>
                        <th>Last Updated</th>
                    </tr>
                </thead>
                <tbody>
                    {employees.map((employee) => (
                        <tr key={employee.id}>
                            <td>
                                <div 
                                    className="status-led"
                                    style={{ 
                                        backgroundColor: getStatusColor(employee.status),
                                        boxShadow: `0 0 10px ${getStatusColor(employee.status)}`
                                    }}
                                    title={getStatusLabel(employee.status)}
                                />
                            </td>
                            <td>{employee.name}</td>
                            <td>{getStatusLabel(employee.status)}</td>
                            <td>{new Date(employee.lastUpdated).toLocaleString()}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default TableView; 