import argon2 from 'argon2'
import type {NextFunction, Request, Response} from 'express'
import {unauthorized} from './errors'

export function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, {type: argon2.argon2id})
}

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain)
  } catch {
    return false
  }
}

/** 存在しないメールでもハッシュ検証を行い、応答時間の差でユーザの有無を悟られないようにする */
export const DUMMY_HASH = await hashPassword('dummy-password-for-timing')

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!req.session.login) throw unauthorized()
  next()
}

type SessionRequest = Pick<Request, 'session'>

export function currentUserId(req: SessionRequest): string {
  const user = req.session.login
  if (!user) throw unauthorized()
  return user.id
}
