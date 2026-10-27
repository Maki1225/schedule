import { sql } from './src/config/db'

async function main() {
  const result = await sql`SELECT 1 AS connected`
  console.log('Neon接続成功:', result)
}

main().catch((error) => {
  console.error('Neon接続失敗:', error.message)
  process.exit(1)
})