import {Router} from 'express'
import passport from '../libs/auth.js'
import {check, validationResult} from "express-validator";
import prisma from '../libs/db.js'
import argon2 from 'argon2';

const router = Router()

// ユーザー新規登録 --------------------------------------------------
router.post('/register',
  // email フィールドが 空でないか (notEmpty()) をチェックし、
  // さらに 有効なメールアドレス形式か (isEmail()) を検証
  check('email').notEmpty().isEmail(),
  // name フィールドが 空でないことをチェック
  check('name').notEmpty(),
  // password フィールドが 空でないこと をチェック
  check('password').notEmpty(),

  // req にリクエスト、res にレスポンスが入る
  async (req, res) => {
    // 入力チェック
    // email,name,passwordが入力されているか
    try {
      // 入力に問題がなければ空の結果が入る
      // 問題があればエラー情報が入る
      const errors = validationResult(req)

      // isEmpty 空の時にtrueを返す
      // errorsが空じゃない時400を返す
      if (!errors.isEmpty()) {
        return res.status(400).json({
          reason: "パラメータ不足",
          errors: errors.array()
        })
      }

      const {email, name, password} = req.body

      // email重複チェック
      const existed = await prisma.user.findUnique({where: {email}})
      if (existed) {
        return res.status(400).json({reason: "メールアドレス重複"})
      }

      // passwordハッシュ化
      const hashedPassword = await argon2.hash(password, {
        type: argon2.argon2id, // 推奨方式
        timeCost: 2,           // 計算コスト
        memoryCost: 19456,     // メモリコスト
        parallelism: 1         // 並列数
      });

      // DB登録
      await prisma.user.create({
        data: {email, name, password: hashedPassword},
      });
      return res.sendStatus(200);
    } catch (err) {
      // tryの中で例外が発生したら500
      console.error(err);
      return res.sendStatus(500);
    }
});

// ユーザーログイン --------------------------------------------------
router.post('/login',

  // email フィールドが 空でないか (notEmpty()) をチェックし、
  // さらに 有効なメールアドレス形式か (isEmail()) を検証
  check('email').notEmpty().isEmail(),
  // password フィールドが 空でないこと をチェック
  check('password').notEmpty(),

  passport.authenticate('local'),
  async (req, res) => {
  try {

    const errors = validationResult(req)

    // isEmpty 空の時にtrueを返す
    // errorsが空じゃない時400を返す
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: "パラメータ不足",
        errors: errors.array()
      })
    }

    res.status(200).json({message: 'ok'})

  } catch (err) {
    console.error(err);
  return res.sendStatus(500);
  }
})

// 借り出し記録 --------------------------------------------------
router.get('/history', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ reason: 'ログインしてください' });
    }

    const userid = req.user.id;

    // ユーザーの借り出し記録をすべて取得
    const logs = await prisma.rentalLog.findMany({
      where: { userId: userid },
      include: {
        book: {
          select: {
            isbn: true,
            title: true,
          }
        }
      },
      orderBy: {
        checkoutDate: 'desc' // 貸出日の新しい順
      }
    });

    if (!logs.length) {
      return res.status(404).json({message: "借り出し記録がありません"})
    }

    // 記録を取り出して表示
    const history = logs.map((log) => ({
      id: log.id,
      book: {
        isbn: Number(log.book.isbn),
        name: log.book.title,
      },
      checkout_date: log.checkoutDate,
      due_date: log.dueDate,
      returned_date: log.returnedDate,
    }));

    return res.status(200).json({ history });

  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

// ユーザー名変更 --------------------------------------------------
router.put('/change',
  check('name').notEmpty(),
  async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        reason: "パラメータ不足",
        errors: errors.array()
      })
    }

    const {name} = req.body

    //ログインしているかどうかチェック
    if (!req.user) {
      return res.status(401).json({ reason: 'ログインしてください' });
    }

    // 変更しようとしている名前が同じなら拒否
    if (req.user.name === name) {
      return res.status(400).json({ reason: '現在の名前と同じです。変更不要です。' });
    }

    // 更新処理
    await prisma.user.update({
      where: { id: req.user.id },
      data: { name },
    });

    res.status(200).json({ message: '更新しました' });
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});


// テスト --------------------------------------------------
router.get('/test', (req, res) => {
  res.send('テストちゃんと返ってきた？');
})


export default router