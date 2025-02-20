export type WorkStatus = 'in-office' | 'on-job' | 'wfh' | 'off';

export interface Employee {
    id: string;
    name: string;
    status: WorkStatus;
    lastUpdated: Date;
}

export interface StatusUpdate {
    employeeId: string;
    status: WorkStatus;
    timestamp: Date;
} 