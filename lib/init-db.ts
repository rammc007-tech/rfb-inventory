import { prisma, reloadDatabase } from './prisma'
import bcrypt from 'bcryptjs'

export async function initializeDatabase() {
  try {
    console.log('🔍 Checking database initialization...')
    
    // Reload database to ensure fresh data
    reloadDatabase()
    
    // Check if any users exist
    const users = prisma.user.findMany({})
    const usersArray = Array.isArray(users) ? users : []
    
    console.log(`Found ${usersArray.length} users in database`)
    
    if (usersArray.length === 0) {
      console.log('📝 Creating default admin user...')
      
      // Hash the default password
      const hashedPassword = await bcrypt.hash('admin123', 10)
      
      // Create default admin user
      const adminUser = prisma.user.create({
        data: {
          username: 'admin',
          password: hashedPassword,
          role: 'admin',
          isActive: true,
        },
      })
      
      console.log('✅ Default admin user created successfully!')
      console.log('   Username: admin')
      console.log('   Password: admin123')
      
      // Reload database after creation
      reloadDatabase()
      
      return { success: true, message: 'Default admin user created' }
    }
    
    console.log('✅ Database already initialized')
    return { success: true, message: 'Database already has users' }
  } catch (error) {
    console.error('❌ Database initialization error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Auto-initialize on module load in production
if (process.env.NODE_ENV === 'production') {
  console.log('🚀 Production mode detected - checking database...')
  initializeDatabase().then((result) => {
    console.log('Database init result:', result)
  })
}

