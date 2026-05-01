export default {
  driver: 'pg' as const,
  url: process.env.DATABASE_URL,
  migrationsFolder: 'database/migrations',
  seedersFolder: 'database/seeders',
};
