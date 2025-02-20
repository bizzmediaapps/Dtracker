import React from 'react';
import { Employee } from '../types';

interface EmployeeSelectorProps {
    employees: Employee[];
    selectedEmployeeId: string | null;
    onSelectEmployee: (employeeId: string) => void;
}

const EmployeeSelector: React.FC<EmployeeSelectorProps> = ({ 
    employees, 
    selectedEmployeeId, 
    onSelectEmployee 
}) => {
    return (
        <div className="employee-selector">
            <h2>Select Your Name</h2>
            <select 
                value={selectedEmployeeId || ''} 
                onChange={(e) => onSelectEmployee(e.target.value)}
                className="employee-select"
            >
                <option value="">-- Select your name --</option>
                {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                        {employee.name}
                    </option>
                ))}
            </select>
        </div>
    );
};

export default EmployeeSelector; 