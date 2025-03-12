import React, { useState } from 'react';
import { Employee, WorkStatus } from '../types';

interface AddEmployeeProps {
    onAddEmployee: (employee: Omit<Employee, 'id'>) => void;
}

const AddEmployee: React.FC<AddEmployeeProps> = ({ onAddEmployee }) => {
    const [isFormVisible, setIsFormVisible] = useState<boolean>(false);
    const [name, setName] = useState<string>('');

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (name.trim()) {
            try {
                const newEmployee = {
                    name: name.trim(),
                    status: 'in-office' as WorkStatus,
                    lastUpdated: new Date(),
                    activity: '' // Initialize with empty activity
                };
                console.log('Submitting new employee:', newEmployee); // Debug log
                onAddEmployee(newEmployee);
                setName('');
                setIsFormVisible(false);
            } catch (error) {
                console.error('Error in AddEmployee:', error);
                alert('Failed to create employee');
            }
        }
    };

    return (
        <div className="add-employee">
            {!isFormVisible ? (
                <button 
                    type="button"
                    className="add-button"
                    onClick={() => setIsFormVisible(true)}
                >
                    + Add New Employee
                </button>
            ) : (
                <form onSubmit={handleSubmit} className="add-employee-form">
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter employee name"
                        className="employee-input"
                        autoFocus
                    />
                    <div className="button-group">
                        <button 
                            type="submit" 
                            className="submit-button"
                            disabled={!name.trim()}
                        >
                            Add
                        </button>
                        <button 
                            type="button" 
                            className="cancel-button"
                            onClick={() => {
                                setIsFormVisible(false);
                                setName('');
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

export default AddEmployee; 