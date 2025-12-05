import passport from 'passport'
import {Strategy as LocalStrategy} from 'passport-local'
import argon2 from 'argon2';
import prisma from './db.js'

passport.use(new LocalStrategy({
  usernameField: 'email',
  passwordField: 'password',
}, async (username, password, done) => {
  try {
    // emailからユーザーを探す
    const user = await prisma.user.findUnique({where: {email: username}});

    // ユーザーがないと認証失敗
    if (!user) {
      return done(null, false, { message: 'メールアドレスまたはパスワードが違います'});
    }

    // パスワードのハッシュ検証 ハッシュ値が異なると認証失敗
    if (!await argon2.verify(user.password, password)) {
      return done(null, false, { message: 'メールアドレスまたはパスワードが違います'})
    }

    // emailとpasswordの組み合わせが正しい　ログイン成功
    return done(null, {id: user.id,name: user.name,isAdmin: user.isAdmin})
  } catch (e) {
    // データベース問い合わせでエラーが発生
    return done(e)
  }
}))

// セッションストレージにユーザー情報を保存する際の処理
passport.serializeUser<Express.User>((user, done) => {
  process.nextTick(() => {
    done(null, user)
  })
})

// セッションストレージから serializeUser 関数によって保存されたユーザー情報を取ってくる際の処理
passport.deserializeUser<Express.User>((user, done) => {
  process.nextTick(() => {
    done(null, user)
  })
})

export default passport