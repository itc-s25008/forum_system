import 'dotenv/config'

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL が設定されていません')
  process.exit(1)
}

export const config = {
  DATABASE_URL: process.env.DATABASE_URL,
  VALKEY_URL: process.env.VALKEY_URL || 'redis://localhost:6379',
  PORT: Number(process.env.PORT || 3000),
}
