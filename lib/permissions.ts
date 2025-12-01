// Permission checking utility

export type UserLevel = 'user' | 'supervisor' | 'admin'

const levelHierarchy: Record<UserLevel, number> = {
  user: 1,
  supervisor: 2,
  admin: 3,
}

/**
 * Check if a user has permission to perform an action
 * @param userLevel - The level of the current user
 * @param requiredLevel - The minimum level required for the action
 * @returns true if user has permission, false otherwise
 */
export function hasPermission(userLevel: UserLevel, requiredLevel: UserLevel): boolean {
  return levelHierarchy[userLevel] >= levelHierarchy[requiredLevel]
}

/**
 * Get user level from token or session
 * This should be called from API routes to get the current user's level
 */
export async function getUserLevel(request: Request): Promise<UserLevel | null> {
  try {
    // Get token from Authorization header or cookie
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '') || null
    
    // For now, we'll get it from a custom header or cookie
    // In a real app, you'd decode the JWT token
    const userLevelHeader = request.headers.get('x-user-level') as UserLevel | null
    
    if (userLevelHeader && ['user', 'supervisor', 'admin'].includes(userLevelHeader)) {
      return userLevelHeader
    }
    
    // Fallback: check cookie or session
    // This is a simplified version - in production, use proper JWT decoding
    return 'user' // Default to user if not found
  } catch (error) {
    console.error('Error getting user level:', error)
    return null
  }
}

