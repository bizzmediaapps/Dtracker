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
        }
        Insert: {
          id?: string
          employee_id: string
          description: string
          status?: 'active' | 'completed' | 'deferred'
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          employee_id?: string
          description?: string
          status?: 'active' | 'completed' | 'deferred'
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
      }
    }
  }
} 