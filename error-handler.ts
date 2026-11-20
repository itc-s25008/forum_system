import type {NextFunction, Request, Response} from 'express'
import {HttpError, type ApiError} from './errors'
import {Prisma} from './generated/prisma/client.ts'

function send(res: Response, status: number, errors: ApiError[]) {
  res.status(status).json({errors})
}

export function notFoundHandler(_req: Request, res: Response) {
  send(res, 404, [{name: 'path', reason: 'エンドポイントが存在しません'}])
}

// Express 5 では async ハンドラの例外もここに届く
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    send(res, err.status, err.errors)
    return
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // ユニーク制約があるのは email だけ(同時登録で重複チェックをすり抜けた場合)
    if (err.code === 'P2002') {
      send(res, 400, [{name: 'email', reason: 'このメールアドレスは既に登録されています'}])
      return
    }
    if (err.code === 'P2025') {
      send(res, 404, [{name: 'id', reason: '対象のデータが存在しません'}])
      return
    }
  }

  if (typeof err === 'object' && err !== null && 'type' in err) {
    if (err.type === 'entity.parse.failed') {
      send(res, 400, [{name: 'body', reason: 'JSONの形式が正しくありません'}])
      return
    }
    if (err.type === 'entity.too.large') {
      send(res, 413, [{name: 'body', reason: 'リクエストが大きすぎます'}])
      return
    }
  }

  console.error(err)
  send(res, 500, [{name: 'server', reason: 'サーバ内部でエラーが発生しました'}])
}
