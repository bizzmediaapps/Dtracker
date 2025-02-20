import React, { useState } from 'react';
import { Employee, WorkStatus } from '../types';

interface AddEmployeeProps {
    onAddEmployee: (employee: Omit<Employee, 'id'>) => void;
}

const AddEmployee: React.FC<AddEmployeeProps> = ({ onAddEmployee }) => {
    const [isFormVisible, setIsFormVisible] = useState(false);
    const [name, setName] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim()) {
            onAddEmployee({
                name: name.trim(),
                status: 'in-office',
                lastUpdated: new Date()
            });
            setName('');
            setIsFormVisible(false);
        }
    };

    return (
        <div className="add-employee">
            {!isFormVisible ? (
                <button 
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