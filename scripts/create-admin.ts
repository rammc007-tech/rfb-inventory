import { prisma } from '../lib/prisma'
import bcrypt from 'bcryptjs'

async function main() {
  // Create default admin user
  const hashedPassword = await bcrypt.hash('admin123', 10)
  
  // Check if admin exists
  const existing = await prisma.user.findUnique({
    where: { username: 'admin' },
  })
  
  if (existing) {
    // Update existing
    const admin = await prisma.user.update({
      where: { username: 'admin' },
      data: {
        password: hashedPassword,
        role: 'admin',
        isActive: true,
      },
    })
    console.log('Admin user updated:', admin.username)
  } else {
    // Create new
    const admin = await prisma.user.create({
      data: {
        username: 'admin',
        password: hashedPassword,
        role: 'admin',
        isActive: true,
      },
    })
    console.log('Admin user created:', admin.username)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })

