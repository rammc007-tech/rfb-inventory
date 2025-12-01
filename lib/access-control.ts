// Access Control utility functions

export type UserRole = 'user' | 'supervisor' | 'admin'

export interface AccessControlPermissions {
  [key: string]: {
    user: boolean
    supervisor: boolean
    admin: boolean
  }
}

/**
 * Check if a user has permission to perform an action based on access control settings
 * @param userRole - The role of the current user
 * @param permissionKey - The permission key (e.g., 'raw_materials_delete')
 * @param accessControl - The access control permissions object
 * @returns true if user has permission, false otherwise
 */
export function hasAccessPermission(
  userRole: UserRole,
  permissionKey: string,
  accessControl: AccessControlPermissions
): boolean {
  // Admin always has access
  if (userRole === 'admin') {
    return true
  }

  // Get permission for the specific key
  const permission = accessControl[permissionKey]
  
  if (!permission) {
    // If permission not found, default to false for safety
    return false
  }

  // Check if the user's role has permission
  return permission[userRole] === true
}

/**
 * Get user role from localStorage
 */
export function getUserRole(): UserRole | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const userStr = localStorage.getItem('rfb_user')
    if (!userStr) return null
    
    const user = JSON.parse(userStr)
    if (user && user.role && ['user', 'supervisor', 'admin'].includes(user.role)) {
      return user.role as UserRole
    }
    
    return null
  } catch (error) {
    console.error('Error getting user role:', error)
    return null
  }
}

