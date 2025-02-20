export type WorkStatus = 'in-office' | 'on-job' | 'wfh' | 'off';

export interface Employee {
    id: string;  // This will be a UUID from Supabase
    name: string;
    status: WorkStatus;
    lastUpdated: Date;
}

// Type for creating a new employee
export interface NewEmployee {
    name: string;
    status: WorkStatus;
    lastUpdated: Date;
}

export interface StatusUpdate {
    employeeId: string;
    status: WorkStatus;
    timestamp: Date;
} 