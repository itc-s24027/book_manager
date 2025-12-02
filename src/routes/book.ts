import {Router} from 'express'
import passport from '../libs/auth.js'
import {check, validationResult} from "express-validator";
import prisma from '../libs/db.js'

const router = Router()
const ITEMS_PER_PAGE = 5 // ページの件数5件

// ログインチェック
router.use(async (req, res, next) => {
  //ログイン中かどうかをチェックするミドルウェア
  if (!req.isAuthenticated()) {
    res.status(401).send('ログインしてください')
    return
  }
  // ログイン済みなら次の処理へ
  next()
})


// 書籍一覧 --------------------------------------------------
router.get('/list/:page',
  async (req, res) => {
  try {

    // パラメータ取得 デフォルト1
    const page = parseInt(req.params.page || '1')

    // 全件数取得
    const totalCount = await prisma.book.count({
      where: {
        isDeleted: false, // 削除フラグがfalseのレコードのみ取得
      }
    });

    const books = await prisma.book.findMany({
      skip: (page - 1) * ITEMS_PER_PAGE, // 取得開始位置の指定
      take: ITEMS_PER_PAGE,              // 取る件数
      where: {isDeleted: false},         // 削除されたレコードは除外
      orderBy: [
        {publicationMonth: 'desc'},        // 降順
        {publicationYear: 'desc'}          // 降順
      ],
      include: {
        author: true                     // authorリレーションを含めて取得
      }
    });

    // 総ページ数を計算
    const lastPage = Math.ceil(totalCount / ITEMS_PER_PAGE);

    res.status(200).json({
      current: page,             // 現在のページ番号
      lastPage: lastPage,        // 最終のページ番号
      books: books.map(book => ({
        isbn: Number(book.isbn),
        title: book.title,       // 書籍名
        author: {
          name: book.author.name // 著者名
        },
        // 出版年月
        publication_year_month: `${book.publicationYear}-${String(book.publicationMonth).padStart(2, '0')}`,
      }))
    });
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }});


// 書籍詳細 --------------------------------------------------
router.get('/detail/:isbn',
  async (req, res) => {
    try {

      // パスの値を取り出す
      // URLからくるものはString型になるのでBigIntに変換
      const isbn = BigInt(req.params.isbn);

      // isbnが一致するデータを取得
      const book = await prisma.book.findUnique({
        where: {isbn: isbn},
        include: {
          author: true,
          publisher: true,
        }
      });

      // 書籍が見つからない場合404
      if (!book) {
        return res.status(404).json({ message: "書籍が見つかりません"})
      }

      res.status(200).json({
        isbn: Number(book.isbn),
        title: book.title,
        author: {name: book.author.name},
        publisher: {name: book.publisher.name,},
        publication_year_month: `${book.publicationYear}-${String(book.publicationMonth)}`
      });

    } catch (err) {
      console.error(err);
      res.sendStatus(500);
    }
  })


// 書籍貸出 --------------------------------------------------
router.post('/rental',
  check('book_id').notEmpty().isNumeric(),
  async (req, res) => {
  try {
    // 入力チェック
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        reason: "パラメータ不足",
        errors: errors.array()
      })
    }

    // 書籍があるか確認
    const isbn = BigInt(req.body.book_id);
    const book = await prisma.book.findUnique({
      where: {
        isbn: isbn,
      },
    });

    if (!book) {
      return res.status(404).json({message: "書籍が存在しません"})
    }

    // 貸出中か確認
    const rentalbook = await prisma.rentalLog.findFirst({
      where: {
        bookIsbn: isbn,     // book_idに一致する
        returnedDate: null, // 返却日がnull
      },
    });

    if (rentalbook) {
      return res.status(409).json({message: "既に貸出中です"})
    }

    const userid = req.user!.id; // ！はreq.userがundefinedじゃないと保証しないと赤くなる
    const now = new Date();
    const due = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const rental = await prisma.rentalLog.create({
      data: {
        bookIsbn: isbn,
        userId: userid,
        checkoutDate: now,
        dueDate: due,
      },
    });

      return res.status(200).json({
      id: rental.id,
      checkoutDate: rental.checkoutDate,
      dueDate: rental.dueDate,
    })

  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
  })



// 書籍返却 --------------------------------------------------
router.put('/return',
  check('id').notEmpty(),
  async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        reason: "パラメータ不足",
        errors: errors.array()
      })
    }

    const { id } = req.body;
    const userid = req.user!.id; // ログイン中のユーザーid

    const rentalBook = await prisma.rentalLog.findUnique({
      where: {
        id: id,
      }
    });

    // 貸出記録があるかチェック
    if (!rentalBook) {
      return res.status(404).json({message: "存在しない貸出記録です"})
    }

    // 貸出記録がユーザーの情報か確認
    if (rentalBook.userId !== userid) {
      return res.status(403).json({message: "他のユーザーの貸出書籍です"})
    }

    // 返却済みか確認
    // 返却済みなのにupdateが実行さてたので追加
    if (rentalBook.returnedDate !== null) {
      return res.status(409).json({message: "すでに返却済みです"})
    }

    const now = new Date();

    // 返却日を更新
    const update = await prisma.rentalLog.update({
      where: { id },
      data: {
        returnedDate: now,
      }
    })

    return res.status(200).json({
      id: update.id,
      returnedDate: update.returnedDate,
    })

  } catch (err) {
    console.error(err);
    return res.sendStatus(500)
  }
});

export default router