import cookieParser from 'cookie-parser'
import express from 'express'
import session from 'express-session'
import {RedisStore} from 'connect-redis'
import {createClient} from 'redis'
import {config} from './config'
import {errorHandler, notFoundHandler} from './error-handler'
import {prisma} from './libs/prisma'
import {postRouter} from './routes/post'
import {topicRouter} from './routes/topic'
import {userRouter} from './routes/user'

export const app = express()

app.disable('x-powered-by')
app.use(express.json({limit: '10kb'}))
app.use(cookieParser())

const redisClient = createClient({url: config.VALKEY_URL})
redisClient.on('error', (error) => {
  console.error('ValKey 接続エラー:', error)
})
await redisClient.connect()

app.use(session({
  secret: 'secret',
  resave: false,
  saveUninitialized: false,
  store: new RedisStore({
    client: redisClient,
    prefix: 'forum-session:',
  }),
  cookie: {
    httpOnly: true,
    maxAge: 60 * 60 * 1000,
  },
}))

// 仕様書のサーバURLは http://localhost:3000/api
const api = express.Router()
api.get('/health', (_req, res) => {
  res.json({message: 'OK'})
})
api.use('/user', userRouter)
api.use('/topic', topicRouter)
api.use('/post', postRouter)
app.use('/api', api)

app.use(notFoundHandler)
app.use(errorHandler)

const server = app.listen(config.PORT, () => {
  console.log(`listening on http://localhost:${config.PORT}`)
})

async function shutdown() {
  server.close()
  await redisClient.quit()
  await prisma.$disconnect()
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
