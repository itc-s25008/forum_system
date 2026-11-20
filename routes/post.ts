import {Router} from 'express'
import {body, param} from 'express-validator'
import {currentUserId, requireAuth} from '../auth'
import {forbidden, notFound} from '../errors'
import {prisma} from '../libs/prisma'
import {getData, validate} from '../validation'

export const postRouter = Router()

// このルータの API はすべてログインが必要
postRouter.use(requireAuth)

/** 投稿者本人のメッセージだけを返す。なければ404、他人のものなら403 */
async function findOwnPost(postId: string, userId: string) {
  const post = await prisma.post.findFirst({
    where: {id: postId, deletedAt: null, topic: {deletedAt: null}},
    select: {id: true, contributorId: true},
  })
  if (!post) throw notFound()
  if (post.contributorId !== userId) throw forbidden()
  return post
}

// メッセージ変更
postRouter.put('/:postId',
  param('postId').isUUID(),
  body('message').trim().notEmpty().withMessage('メッセージは必須項目です').isLength({max: 512}).withMessage('メッセージは512文字以内で入力してください'),
  async (req, res) => {
  validate(req)
  const {postId, message} = getData<{postId: string, message: string}>(req)
  await findOwnPost(postId, currentUserId(req))

  await prisma.post.update({
    where: {id: postId},
    data: {message, updatedAt: new Date()},
  })
  res.json({message: 'OK'})
})

// メッセージ削除(論理削除)
postRouter.delete('/:postId',
  param('postId').isUUID(),
  async (req, res) => {
  validate(req)
  const {postId} = getData<{postId: string}>(req)
  await findOwnPost(postId, currentUserId(req))

  await prisma.post.update({
    where: {id: postId},
    data: {deletedAt: new Date()},
  })
  res.json({message: 'deleted'})
})
