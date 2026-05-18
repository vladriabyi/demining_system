import client from "./client"
import type { DashboardStats, DeminingRequest, Priority, RequestStatus } from "../types"

export interface RequestCreate {
  title: string
  description?: string
  priority: Priority
  location_name: string
  latitude: number
  longitude: number
  phone?: string
}

export interface RequestUpdate {
  title?: string
  description?: string
  status?: RequestStatus
  priority?: Priority
  assigned_to_id?: number | null
  brigade_id?: number | null
  comment?: string
}

export const getRequests      = () => client.get<DeminingRequest[]>("/requests/").then(r => r.data)
export const getDashboardStats= () => client.get<DashboardStats>("/requests/stats").then(r => r.data)
export const getRequest       = (id: number) => client.get<DeminingRequest>(`/requests/${id}`).then(r => r.data)
export const createRequest    = (data: RequestCreate) => client.post<DeminingRequest>("/requests/", data).then(r => r.data)
export const updateRequest    = (id: number, data: RequestUpdate) => client.patch<DeminingRequest>(`/requests/${id}`, data).then(r => r.data)
export const deleteRequest    = (id: number) => client.delete(`/requests/${id}`)

export const uploadPhoto = async (id: number, file: File): Promise<DeminingRequest> => {
  const form = new FormData()
  form.append("file", file)
  return client.post<DeminingRequest>(`/requests/${id}/photo`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  }).then(r => r.data)
}

export interface ReportCreate {
  explosive_type_found:  string
  quantity:              number
  area_cleared_m2?:      number
  time_spent_hours?:     number
  neutralization_method: string
  notes?:                string
}

export const submitReport = (id: number, data: ReportCreate) =>
  client.post<CompletionReport>(`/requests/${id}/report`, data).then(r => r.data)

export const getReport = (id: number) =>
  client.get<CompletionReport>(`/requests/${id}/report`).then(r => r.data)
