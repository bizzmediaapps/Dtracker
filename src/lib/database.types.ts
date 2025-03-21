export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      employees: {
        Row: {
          id: string
          name: string
          status: 'in-office' | 'on-job' | 'wfh' | 'off'
          lastUpdated: string
          activity: string
        }
        Insert: {
          id?: string
          name: string
          status: 'in-office' | 'on-job' | 'wfh' | 'off'
          lastUpdated?: string
          activity?: string
        }
        Update: {
          id?: string
          name?: string
          status?: 'in-office' | 'on-job' | 'wfh' | 'off'
          lastUpdated?: string
          activity?: string
        }
      },
      activities: {
        Row: {
          id: string
          employee_id: string
          description: string
          status: 'active' | 'completed' | 'deferred'
          created_at: string
          updated_at: string
          completed_at: string | null
          is_task_of_day?: boolean
        }
        Insert: {
          id?: string
          employee_id: string
          description: string
          status?: 'active' | 'completed' | 'deferred'
          created_at?: string
          updated_at?: string
          completed_at?: string | null
          is_task_of_day?: boolean
        }
        Update: {
          id?: string
          employee_id?: string
          description?: string
          status?: 'active' | 'completed' | 'deferred'
          created_at?: string
          updated_at?: string
          completed_at?: string | null
          is_task_of_day?: boolean
        }
      },
      calendar_events: {
        Row: {
          id: string
          title: string
          date: string
          event_type: 'holiday' | 'event' | 'reminder'
          employee_id?: string
          is_holiday: boolean
          is_trinidad_holiday: boolean
          year?: number
          color?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          date: string
          event_type: 'holiday' | 'event' | 'reminder'
          employee_id?: string
          is_holiday?: boolean
          is_trinidad_holiday?: boolean
          year?: number
          color?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          date?: string
          event_type?: 'holiday' | 'event' | 'reminder'
          employee_id?: string
          is_holiday?: boolean
          is_trinidad_holiday?: boolean
          year?: number
          color?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
} 