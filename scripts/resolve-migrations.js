// Script to resolve failed Prisma migrations
// This handles the case where a migration failed and needs to be marked as rolled back

const { execSync } = require('child_process');

try {
  console.log('🔍 Checking for failed migrations...');
  
  // List of migrations that might have failed
  const migrations = [
    '20251208205317_init',
    '20251209010216_add_deleted_at_fields',
    '20251210001712_make_email_optional'
  ];
  
  // Try to resolve any failed migrations by marking them as rolled back
  for (const migration of migrations) {
    try {
      execSync(`npx prisma migrate resolve --rolled-back ${migration}`, {
        stdio: 'pipe',
        env: process.env
      });
      console.log(`✅ Marked ${migration} as rolled back`);
    } catch (error) {
      // If migration doesn't exist in failed state, continue
      // This is expected if migration is not in failed state
    }
  }
  
  // Now deploy migrations
  console.log('📦 Deploying migrations...');
  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: process.env
  });
  
  console.log('✅ Migrations deployed successfully');
} catch (error) {
  console.error('❌ Error during migration deployment');
  console.error('This might be a fresh database. If so, please reset the database in Vercel dashboard.');
  throw error;
}

