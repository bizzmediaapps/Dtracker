export type WorkStatus = 'in-office' | 'on-job' | 'wfh' | 'off';

export interface Employee {
    id: string;  // This will be a UUID from Supabase
    name: string;
    status: WorkStatus;
    lastUpdated: Date;
    activity: string;
}

// Type for creating a new employee
export interface NewEmployee {
    name: string;
    status: WorkStatus;
    lastUpdated: Date;
    activity: string;
}

export interface StatusUpdate {
    employeeId: string;
    status: WorkStatus;
    timestamp: Date;
}

export type ActivityStatus = 'active' | 'completed' | 'deferred';

export interface Activity {
  id: string;
  employee_id: string;
  description: string;
  status: ActivityStatus;
  is_task_of_day: boolean;
  created_at: Date;
  updated_at: Date;
  completed_at: Date | null;
}

export interface NewActivity {
  employee_id: string;
  description: string;
  status?: ActivityStatus;
} 