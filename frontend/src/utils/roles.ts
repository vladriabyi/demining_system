import type { UserRole } from "../types"

export const isOperator = (role?: UserRole) => role === "operator"

export const isCoordinatorOrAdmin = (role?: UserRole) =>
  role === "coordinator" || role === "admin"

/** Координатор/адмін — повний огляд системи; оператор — лише призначені заявки */
export const seesAllRequests = (role?: UserRole) => isCoordinatorOrAdmin(role)

export const canCreateRequest = (role?: UserRole) =>
  role === "civilian" || isCoordinatorOrAdmin(role)

export const canDeleteRequest = (role?: UserRole) => isCoordinatorOrAdmin(role)
