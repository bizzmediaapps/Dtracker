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

// Define recurrence types
export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly' | 'custom';

// Interface for recurrence details
export interface RecurrencePattern {
  type: RecurrenceType;
  interval: number; // Every X days/weeks/months
  daysOfWeek?: number[]; // 0-6 for Sunday-Saturday
  dayOfMonth?: number; // 1-31
  nextDueDate?: Date; // Next date when the task is due
  isRecurring?: boolean; // Flag to indicate if the task is recurring (for schema compatibility)
}

export interface Activity {
  id: string;
  employee_id: string;
  description: string;
  status: ActivityStatus;
  is_task_of_day: boolean;
  created_at: Date;
  updated_at: Date;
  completed_at: Date | null;
  // Recurring task properties
  is_recurring: boolean;
  recurrence_pattern?: RecurrencePattern;
  due_date?: Date; // The current due date for the task
  last_completed_date?: Date; // When the recurring task was last completed
}

export interface NewActivity {
  employee_id: string;
  description: string;
  status?: ActivityStatus;
  // Recurring task properties
  is_recurring?: boolean;
  recurrence_pattern?: RecurrencePattern;
  due_date?: string; // ISO string for the database
} 