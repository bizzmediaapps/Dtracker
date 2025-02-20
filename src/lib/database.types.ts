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
        }
        Insert: {
          id?: string
          name: string
          status: 'in-office' | 'on-job' | 'wfh' | 'off'
          lastUpdated?: string
        }
        Update: {
          id?: string
          name?: string
          status?: 'in-office' | 'on-job' | 'wfh' | 'off'
          lastUpdated?: string
        }
      }
    }
  }
} 