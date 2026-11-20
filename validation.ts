import {matchedData, validationResult} from 'express-validator'
import {HttpError, notFound} from './errors'

type ValidationRequest = Parameters<typeof validationResult>[0]

export function validate(req: ValidationRequest): void {
  const result = validationResult(req)
  if (!result.isEmpty()) {
    const hasInvalidResourceId = result.array().some((error) =>
      'path' in error && ['topicId', 'postId'].includes(String(error.path)),
    )
    if (hasInvalidResourceId) throw notFound()

    const errors = result.array().map((error) => ({
      name: 'path' in error ? String(error.path) : 'body',
      reason: error.msg,
    }))
    throw new HttpError(400, errors)
  }
}

export function getData<T, R = unknown>(req: R): T {
  return matchedData(req as ValidationRequest) as T
}
