import client from "./client"
import type { Brigade, BrigadeStatus } from "../types"

export interface BrigadeCreate {
  name:           string
  number:         string
  status:         BrigadeStatus
  specialization?: string
  member_ids:     number[]
}
export type BrigadeUpdate = Partial<BrigadeCreate>

export const getBrigades    = ()                              => client.get<Brigade[]>("/brigades/").then(r => r.data)
export const getBrigade     = (id: number)                   => client.get<Brigade>(`/brigades/${id}`).then(r => r.data)
export const createBrigade  = (data: BrigadeCreate)          => client.post<Brigade>("/brigades/", data).then(r => r.data)
export const updateBrigade  = (id: number, data: BrigadeUpdate) => client.patch<Brigade>(`/brigades/${id}`, data).then(r => r.data)
export const deleteBrigade  = (id: number)                   => client.delete(`/brigades/${id}`)
