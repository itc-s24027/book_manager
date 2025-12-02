// それぞれのファイルでその都度 Prisma Client を生成する処理を実装することは非効率
// 個別のファイル db.ts として作成して、必要な箇所で import して使用することを想定

import {PrismaMariaDb} from "@prisma/adapter-mariadb";
import {PrismaClient} from 'db'

const url = String(process.env.DATABASE_URL) //データベースへ接続する情報を、環境変数の DATABASE_URL から取得しています。
const params = url.match(
  /^mysql:\/\/(?<user>.+?):(?<password>.+?)@(?<host>.+?):(?<port>\d+)\/(?<database>.+?)$/
)?.groups || {}

const adapter = new PrismaMariaDb({
  user: params.user,
  password: params.password,
  host: params.host,
  port: Number(params.port),
  database: params.database,
  connectionLimit: 5
})

const prisma = new PrismaClient({adapter})

export default prisma