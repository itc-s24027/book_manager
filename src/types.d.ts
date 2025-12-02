// Express と連携して、認証やセッション情報を管理してくれるパッケージとして、
// Passport.js を利用します。

import 'express-session'
import 'passport'

declare module 'express-session' {
  interface SessionData {
    back: string
    messages: string[]
  }
}

declare module 'passport' {
  interface AuthenticateOptions {
    badRequestMessage?: string | undefined
  }
}

declare global {
  namespace Express {
    interface User {
      id: string
      name: string
    }
  }
}