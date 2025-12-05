import {Router} from 'express'
import {check, validationResult} from "express-validator";
import prisma from '../libs/db.js'
import auth from "../libs/auth.js";

const router = Router()

// ログインチェック
router.use(async (req, res, next) => {
  //ログイン中かどうかをチェックするミドルウェア
  if (!req.isAuthenticated()) {
    res.status(401).send('ログインしてください')
    return
  }
  const isAdmin = Boolean(req.user?.isAdmin)
  // ユーザー情報に管理者フラグがある想定
  if (!isAdmin) {
    return res.status(403).json({ message: '管理者権限が必要です' });
  }
  // ログイン済みなら次の処理へ
  next()
})


// 著者名登録 --------------------------------------------------
router.post('/author',
  check('name').notEmpty().withMessage("パラメータ不足"),
  async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        reason: "パラメータ不足",
        errors: errors.array()
      })}

    const { name } = req.body

    // 同じ名前の著者がすでに存在しているか確認
    const author = await prisma.author.findFirst({
      where: { name: name }
    });

    if (author) {
      return res.status(400).json({message: "既に登録されている著者名です"})
    }

    // 著者を登録
    const newauthor = await prisma.author.create({
      data: {name},
    });

    return res.status(200).json({
      id: newauthor.id,
      name: newauthor.name
    });

  } catch (error) {
    return res.sendStatus(500)
  }
})

// 著者名更新 --------------------------------------------------
router.put('/author',
  check('id').notEmpty(),
  check('name').notEmpty(),
  async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        reason: "パラメータ不足",
        errors: errors.array()
      })}

    const { id, name } = req.body

    const author = await prisma.author.findUnique({
      where: { id }
    })

    // 著者が存在するか
    if (!author || author.isDeleted) {
      return res.status(400).json({message: "著者が存在しません"})
    }


    // 同じ名前での更新防止
    if (author.name === name) {
      return res.status(400).json({ message: "同じ名前で登録されています" })
    }


    const sameName = await prisma.author.findFirst({
      where: {
        name: name,
        NOT: { id }
      }
    })

    // 他の名前重複チェック
    if (sameName) {
      return res.status(400).json({ message: "同じ名前の著者がすでに存在します" })
    }


    // 更新処理
    const updated = await prisma.author.update({
      where: { id },
      data: { name }
    })

    return res.status(200).json({
      id: updated.id,
      name: updated.name
    })

  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }})

// 著者名削除 --------------------------------------------------
router.delete('/author',
  check('id').notEmpty(),
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          reason: "パラメータ不足",
          errors: errors.array()
        })}

      const { id } = req.body
      const author = await prisma.author.findUnique({
        where: { id }
      })
      // 著者が存在するか
      if (!author) {
        return res.status(400).json({message: "著者が存在しません"})
      }

      // すでに削除済みか trueなら400
      if (author.isDeleted) {
        return res.status(400).json({ message: "すでに削除されています" })
      }


      // この著者の本が存在するか
      // 存在する場合は著者を削除できない
      const usedBook = await prisma.book.findFirst({
        where: {
          authorId: id,
          isDeleted: false
        }
      })

      if (usedBook) {
        return res.status(400).json({
          message: "この著者は書籍に使用されているため削除できません"
        })
      }

      // 削除処理
      await prisma.author.update({
        where: {id},
        data: {isDeleted: true},
      })

      return res.status(200).json({
        message: "削除しました"
      })

    } catch (err) {
      console.error(err);
      res.sendStatus(500);
    }
  })


// 出版社名登録 --------------------------------------------------
router.post('/publisher',
  check('name').notEmpty(),
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          reason: "パラメータ不足",
          errors: errors.array()
        })}

      const { name } = req.body
      const publisherName = await prisma.publisher.findFirst({
        where: { name }
      })

      // 同名の出版社が存在するかチェック
      if (publisherName) {
        return res.status(400).json({ message: "すでに同じ出版社名が存在します" })
      }

      // 登録処理
      const publisher = await prisma.publisher.create({
        data: {
          name
        }
      })

      return res.status(200).json({
        id: publisher.id,
        name: publisher.name
      })

    } catch (err) {
      console.error(err);
      res.sendStatus(500);
    }
  })


// 出版社名更新 --------------------------------------------------
router.put('/publisher',
  check('id').notEmpty(),
  check('name').notEmpty(),
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          reason: "パラメータ不足",
          errors: errors.array()
        })}

      const { id, name } = req.body
      const pub = await prisma.publisher.findUnique({
        where: { id }
      })

      // 出版社が存在するかチェック
      if (!pub || pub.isDeleted) {
        return res.status(400).json({ message: "出版社が存在しません" })
      }

      // 同じ名前での更新防止
      if (pub.name === name) {
        return res.status(400).json({ message: "同じ名前で登録されています" })
      }


      const sameName = await prisma.publisher.findFirst({
        where: {
          name: name,
          NOT: { id }
        }
      })

      // 他の名前重複チェック
      if (sameName) {
        return res.status(400).json({ message: "同じ名前の出版社がすでに存在します" })
      }


      // 更新処理
      const updated = await prisma.publisher.update({
        where: { id },
        data: { name }
      })


      return res.status(200).json({
        id: updated.id,
        name: updated.name
      })

    } catch (err) {
      console.error(err);
      res.sendStatus(500);
    }
  })


// 出版社名削除 --------------------------------------------------
router.delete('/publisher',
  check('id').notEmpty(),
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          reason: "パラメータ不足",
          errors: errors.array()
        })}

      const { id } = req.body
      const pub = await prisma.publisher.findUnique({
        where: { id }
      })

      // 出版社が存在するか
      if (!pub) {
        return res.status(400).json({message: "出版社が存在しません"})
      }

      // すでに削除済みか trueなら400
      if (pub.isDeleted) {
        return res.status(400).json({ message: "すでに削除されています" })
      }


      // この出版社の本が存在するか
      // 存在する場合は出版社を削除できない
      const usedBook = await prisma.book.findFirst({
        where: {
          publisherId: id,
          isDeleted: false
        }
      })

      if (usedBook) {
        return res.status(400).json({
          message: "この出版社は書籍に使用されているため削除できません"
        })
      }

      // 削除処理
      await prisma.publisher.update({
        where: {id},
        data: {isDeleted: true},
      })

      return res.status(200).json({
        message: "削除しました"
      })

    } catch (err) {
      console.error(err);
      res.sendStatus(500);
    }
  })


// 書籍登録--------------------------------------------------
router.post(
  '/book',
  check('isbn').notEmpty(),
  check('title').notEmpty(),
  check('author_id').notEmpty(),
  check('publisher_id').notEmpty(),
  check('publication_year').notEmpty().isInt(),
  check('publication_month').notEmpty().isInt({ min: 1, max: 12 }),
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          reason: "パラメータ不足",
          errors: errors.array()
        })}

      const {
        isbn,
        title,
        author_id,
        publisher_id,
        publication_year,
        publication_month
      } = req.body


      const existed = await prisma.book.findUnique({
        where: { isbn: BigInt(isbn) }
      })

      // ISBN 重複チェック（登録のみ）
      if (existed) {
        return res.status(400).json({ message: "ISBNがすでに存在します" })
      }

      // 著者チェック
      const author = await prisma.author.findUnique({
        where: { id: author_id }
      })

      if (!author || author.isDeleted) {
        return res.status(400).json({ message: "著者が存在しません" })
      }

      // 出版社チェック
      const publisher = await prisma.publisher.findUnique({
        where: { id: publisher_id }
      })

      if (!publisher || publisher.isDeleted) {
        return res.status(400).json({ message: "出版社が存在しません" })
      }

      // 登録処理
      await prisma.book.create({
        data: {
          isbn: BigInt(isbn),
          title,
          authorId: author_id,
          publisherId: publisher_id,
          publicationYear: publication_year,
          publicationMonth: publication_month
        }
      })

      return res.status(200).json({
        message: "登録しました"
      })

    } catch (err) {
      console.error(err)
      res.sendStatus(500)
    }
  }
)


// 書籍更新 --------------------------------------------------
router.put(
  '/book',
  check('isbn').notEmpty(),
  check('title').notEmpty(),
  check('author_id').notEmpty(),
  check('publisher_id').notEmpty(),
  check('publication_year').notEmpty().isInt(),
  check('publication_month').notEmpty().isInt({ min: 1, max: 12 }),
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          reason: "パラメータ不足",
          errors: errors.array()
        })}

      const {
        isbn,
        title,
        author_id,
        publisher_id,
        publication_year,
        publication_month
      } = req.body

      // ISBN 存在チェック
      const book = await prisma.book.findUnique({
        where: { isbn: BigInt(isbn) }
      })

      if (!book || book.isDeleted) {
        return res.status(400).json({ message: "ISBNが存在しません" })
      }

      // 著者チェック
      const author = await prisma.author.findUnique({
        where: { id: author_id }
      })

      if (!author || author.isDeleted) {
        return res.status(400).json({ message: "著者が存在しません" })
      }

      // 出版社チェック
      const publisher = await prisma.publisher.findUnique({
        where: { id: publisher_id }
      })

      if (!publisher || publisher.isDeleted) {
        return res.status(400).json({ message: "出版社が存在しません" })
      }

      // 更新処理
      await prisma.book.update({
        where: { isbn: BigInt(isbn) },
        data: {
          title,
          authorId: author_id,
          publisherId: publisher_id,
          publicationYear: publication_year,
          publicationMonth: publication_month
        }
      })

      return res.status(200).json({
        message: "更新しました"
      })

    } catch (err) {
      console.error(err)
      res.sendStatus(500)
    }
  }
)

// 書籍削除 --------------------------------------------------
router.delete('/book',
  check('isbn').notEmpty(),
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          reason: "パラメータ不足",
          errors: errors.array()
        })}

      const { isbn } = req.body
      const book = await prisma.book.findUnique({
        where: { isbn }
      })

      // 書籍が存在するか
      if (!book) {
        return res.status(400).json({message: "書籍が存在しません"})
      }

      // すでに削除済みか trueなら400
      if (book.isDeleted) {
        return res.status(400).json({ message: "すでに削除されています" })
      }


      // 削除処理
      await prisma.book.update({
        where: { isbn },
        data: { isDeleted: true },
      })

      return res.status(200).json({
        message: "削除しました"
      })

    } catch (err) {
      console.error(err);
      res.sendStatus(500);
    }
  })

export default router;