import {Router} from 'express'
import {body, param, query} from 'express-validator'
import {currentUserId, requireAuth} from '../auth'
import {forbidden, notFound} from '../errors'
import {prisma} from '../libs/prisma'
import {getData, validate} from '../validation'

export const topicRouter = Router()

const PAGE_SIZE = 5

// このルータの API はすべてログインが必要
topicRouter.use(requireAuth)

/** 作成者本人のトピックだけを返す。なければ404、他人のものなら403 */
async function findOwnTopic(topicId: string, userId: string) {
  const topic = await prisma.topic.findFirst({
    where: {id: topicId, deletedAt: null},
    select: {id: true, authorId: true},
  })
  if (!topic) throw notFound()
  if (topic.authorId !== userId) throw forbidden()
  return topic
}

// 一覧: 更新日時の新しい順(スレッドフロート)、1ページ5件
topicRouter.get('/',
  query('page').default(1).isInt({min: 1}).toInt(),
  async (req, res) => {
  validate(req)
  const {page} = getData<{page: number}>(req)

  const topics = await prisma.topic.findMany({
    where: {deletedAt: null},
    orderBy: [{updatedAt: 'desc'}, {id: 'desc'}],
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
      author: {select: {name: true, email: true}},
    },
  })

  res.json({
    topics: topics.map((t) => ({
      id: t.id,
      title: t.title,
      author: t.author.name || t.author.email,
      created_at: t.createdAt,
      updated_at: t.updatedAt,
    })),
  })
})

// 新規作成(最初のメッセージも一緒に作る)。/:topicId より先に定義すること
topicRouter.post('/create',
  body('title').trim().notEmpty().withMessage('タイトルは必須項目です').isLength({max: 256}).withMessage('タイトルは256文字以内で入力してください'),
  body('message').trim().notEmpty().withMessage('メッセージは必須項目です').isLength({max: 512}).withMessage('メッセージは512文字以内で入力してください'),
  async (req, res) => {
  validate(req)
  const {title, message} = getData<{title: string, message: string}>(req)
  const userId = currentUserId(req)

  const topic = await prisma.topic.create({
    data: {
      authorId: userId,
      title,
      posts: {create: {contributorId: userId, message}},
    },
    select: {id: true, title: true},
  })
  res.status(201).json(topic)
})

// メッセージ一覧(古い順)。page を指定したときだけ1ページ5件で区切る
topicRouter.get('/:topicId',
  param('topicId').isUUID(),
  query('page').optional().isInt({min: 1}).toInt(),
  async (req, res) => {
  validate(req)
  const {topicId, page} = getData<{topicId: string, page?: number}>(req)

  const topic = await prisma.topic.findFirst({
    where: {id: topicId, deletedAt: null},
    select: {id: true, title: true, updatedAt: true},
  })
  if (!topic) throw notFound()

  const posts = await prisma.post.findMany({
    where: {topicId, deletedAt: null},
    orderBy: [{createdAt: 'asc'}, {id: 'asc'}],
    ...(page !== undefined ? {skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE} : {}),
    select: {
      id: true,
      message: true,
      createdAt: true,
      updatedAt: true,
      contributor: {select: {id: true, name: true, email: true}},
    },
  })

  res.json({
    id: topic.id,
    title: topic.title,
    last_update: topic.updatedAt,
    posts: posts.map((p) => ({
      id: p.id,
      contributor: {id: p.contributor.id, name: p.contributor.name || p.contributor.email},
      message: p.message,
      created_at: p.createdAt,
      updated_at: p.updatedAt,
    })),
  })
})

// メッセージ投稿: トピックの updatedAt も更新して、一覧の先頭に浮上させる
topicRouter.post('/:topicId',
  param('topicId').isUUID(),
  body('message').trim().notEmpty().withMessage('メッセージは必須項目です').isLength({max: 512}).withMessage('メッセージは512文字以内で入力してください'),
  async (req, res) => {
  validate(req)
  const {topicId, message} = getData<{topicId: string, message: string}>(req)
  const userId = currentUserId(req)

  await prisma.$transaction(async (tx) => {
    const bumped = await tx.topic.updateMany({
      where: {id: topicId, deletedAt: null},
      data: {updatedAt: new Date()},
    })
    if (bumped.count === 0) throw notFound()
    await tx.post.create({
      data: {topicId, contributorId: userId, message},
    })
  })
  res.json({message: 'OK'})
})

// タイトル変更(updatedAt も更新される)
topicRouter.put('/:topicId',
  param('topicId').isUUID(),
  body('title').trim().notEmpty().withMessage('タイトルは必須項目です').isLength({max: 256}).withMessage('タイトルは256文字以内で入力してください'),
  async (req, res) => {
  validate(req)
  const {topicId, title} = getData<{topicId: string, title: string}>(req)
  await findOwnTopic(topicId, currentUserId(req))

  await prisma.topic.update({
    where: {id: topicId},
    data: {title, updatedAt: new Date()},
  })
  res.json({message: 'OK'})
})

// 削除(論理削除。配下のメッセージも一緒に削除扱いにする)
topicRouter.delete('/:topicId',
  param('topicId').isUUID(),
  async (req, res) => {
  validate(req)
  const {topicId} = getData<{topicId: string}>(req)
  await findOwnTopic(topicId, currentUserId(req))

  const now = new Date()
  await prisma.$transaction([
    prisma.topic.update({where: {id: topicId}, data: {deletedAt: now}}),
    prisma.post.updateMany({
      where: {topicId, deletedAt: null},
      data: {deletedAt: now},
    }),
  ])
  res.json({message: 'deleted'})
})
