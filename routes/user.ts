import {Router} from 'express'
import {body} from 'express-validator'
import {currentUserId, DUMMY_HASH, hashPassword, requireAuth, verifyPassword} from '../auth'
import {badRequest, loginFailed} from '../errors'
import {prisma} from '../libs/prisma'
import {getData, validate} from '../validation'

export const userRouter = Router()

// 登録
userRouter.post('/register',
  body('email').trim().isEmail().withMessage('メールアドレス形式で入力してください').isLength({max: 256}),
  body('password').isLength({min: 8}).withMessage('パスワードが短すぎます').isLength({max: 128}).withMessage('パスワードが長すぎます'),
  body('name').optional().trim().isLength({max: 128}).withMessage('名前は128文字以内で入力してください'),
  async (req, res) => {
  validate(req)
  const {email, password, name} = getData<{email: string, password: string, name?: string}>(req)

  const exists = await prisma.user.findUnique({
    where: {email},
    select: {id: true},
  })
  if (exists) throw badRequest('email', 'このメールアドレスは既に登録されています')

  await prisma.user.create({
    data: {
      email,
      password: await hashPassword(password),
      name: name || null,
    },
  })
  res.json({message: 'OK'})
})

// ログイン: 成功するとセッションにユーザ情報が入る
userRouter.post('/login',
  body('email').trim().isEmail(),
  body('password').notEmpty(),
  async (req, res) => {
  validate(req)
  const {email, password} = getData<{email: string, password: string}>(req)

  const user = await prisma.user.findFirst({where: {email, deletedAt: null}})
  const ok = await verifyPassword(user?.password ?? DUMMY_HASH, password)
  if (!user || !ok) throw loginFailed()

  req.session.login = user
  res.json({message: 'OK'})
})

// 名前・パスワード変更(どちらか一方だけでも可)
userRouter.put('/change',
  requireAuth,
  body('name').optional().trim().isLength({max: 128}),
  body('password').optional().isLength({min: 8, max: 128}),
  async (req, res) => {
  validate(req)
  const {name, password} = getData<{name?: string, password?: string}>(req)

  if (name === undefined && password === undefined) {
    throw badRequest('body', 'name か password のいずれかを指定してください')
  }
  const data: {name?: string | null; password?: string} = {}
  if (name !== undefined) data.name = name || null
  if (password !== undefined) data.password = await hashPassword(password)

  await prisma.user.update({where: {id: currentUserId(req)}, data})
  res.json({message: 'Changed!'})
})
