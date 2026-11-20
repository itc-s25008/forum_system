/** 仕様書のエラー形式: { errors: [{ name, reason }] } */
export type ApiError = {name: string; reason: string}

export class HttpError extends Error {
  constructor(
    public status: number,
    public errors: ApiError[],
  ) {
    super(errors[0]?.reason ?? 'error')
  }
}

export const badRequest = (name: string, reason: string) =>
  new HttpError(400, [{name, reason}])
export const unauthorized = () =>
  new HttpError(401, [{name: 'auth', reason: 'ログインしてください'}])
export const loginFailed = () =>
  new HttpError(401, [{name: 'auth', reason: 'ログインに失敗しました'}])
export const forbidden = () =>
  new HttpError(403, [{name: 'perm', reason: '変更できませんでした'}])
export const notFound = () =>
  new HttpError(404, [{name: 'id', reason: '対象のデータが存在しません'}])
