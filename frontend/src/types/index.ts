export type UserRole      = "civilian" | "operator" | "coordinator" | "admin"
export type RequestStatus = "pending" | "under_review" | "approved" | "in_progress" | "completed" | "rejected"
export type Priority      = "low" | "medium" | "high" | "critical"
export type BrigadeStatus = "available" | "busy" | "unavailable"

// Відповідає ExplosiveType enum на бекенді
export type ExplosiveType =
  | "antipersonnel_mine"
  | "antitank_mine"
  | "cluster_munition"
  | "ied"
  | "unexploded_ordnance"
  | "unknown"

export interface User {
  id:          number
  email:       string
  full_name:   string
  role:        UserRole
  is_active:   boolean
  is_verified: boolean
}

export interface CompletionReport {
  id:                    number
  request_id:            number
  explosive_type_found:  string
  quantity:              number
  area_cleared_m2:       number | null
  time_spent_hours:      number | null
  neutralization_method: string
  notes:                 string | null
  submitted_by:          number
  submitted_at:          string
  submitter:             User | null
}

export interface StatusHistoryEntry {
  id:         number
  old_status: string
  new_status: string
  changed_by: number
  comment:    string | null
  changed_at: string
}

export interface DeminingRequest {
  id:                 number
  title:              string
  description:        string | null
  status:             RequestStatus
  priority:           Priority
  explosive_type:     ExplosiveType
  location_name:      string
  latitude:           number
  longitude:          number
  photo_path:         string | null
  phone:              string | null
  requester_id:       number
  assigned_to_id:     number | null
  brigade_id:         number | null
  created_at:         string
  updated_at:         string
  requester:          User | null
  assignee:           User | null
  status_history:     StatusHistoryEntry[] | null
  completion_report:  CompletionReport | null
}

export interface Brigade {
  id:              number
  name:            string
  number:          string
  status:          BrigadeStatus
  specialization:  string | null
  members:         User[]
}

export interface DashboardStats {
  total_requests:       number
  pending_requests:     number
  in_progress_requests: number
  completed_requests:   number
  critical_requests:    number
  total_brigades:       number
}
