import {Router} from 'express'
import {check, validationResult} from "express-validator";
import prisma from '../libs/db.js'

const router = Router()

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


// 著者名検索 --------------------------------------------------
router.get('/author',
  check('keyword').notEmpty(),
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          reason: "パラメータ不足",
          errors: errors.array()
        })}

      const { keyword } = req.body;

      const authors = await prisma.author.findMany({
        where: {
          name: {
            contains: keyword,
          },
          isDeleted: false,
        },
        select: {
          id: true,
          name: true,
        },
      });

      return res.status(200).json({
        authors,
      });

  } catch (err) {
      console.error(err);
      res.sendStatus(500);}
  })


// 出版社名検索 --------------------------------------------------
router.get('/publisher',
  check('keyword').notEmpty(),
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          reason: "パラメータ不足",
          errors: errors.array()
        })}

      const { keyword } = req.body;

      const publishers = await prisma.publisher.findMany({
        where: {
          name: {
            contains: keyword,
          },
          isDeleted: false,
        },
        select: {
          id: true,
          name: true,
        },
      });

      return res.status(200).json({
        publishers,
      });

    } catch (err) {
      console.error(err);
      res.sendStatus(500);}
  })

export default router