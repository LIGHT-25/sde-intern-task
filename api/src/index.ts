import { Hono } from 'hono'
import { cors } from 'hono/cors'
import questions from './routes/questions'
import responses from './routes/responses'
import surveys from './routes/surveys'

const app = new Hono<{ Bindings: Env }>()

app.use(
  '/api/*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  }),
)

app.use('/api/*', async (c, next) => {
  try {
    await c.env.survey_builder_db
      .prepare("INSERT OR IGNORE INTO users (id, email) VALUES ('test-user', 'test@example.com')")
      .run()
  } catch (err) {
    console.error('Failed to ensure default user exists:', err)
  }

  // Parse the Authorization header to dynamically register the user in the database
  const authHeader = c.req.header('Authorization')
  if (authHeader) {
    const ownerId = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader
    if (ownerId && ownerId !== 'test-user') {
      try {
        await c.env.survey_builder_db
          .prepare('INSERT OR IGNORE INTO users (id, email) VALUES (?, ?)')
          .bind(ownerId, ownerId)
          .run()
      } catch (err) {
        console.error('Failed to dynamically insert user:', err)
      }
    }
  }

  await next()
})

app.get('/api/health', (c) => c.json({ status: 'ok' }))

app.get('/api/db-test', async (c) => {
  const tables = await c.env.survey_builder_db
    .prepare("SELECT name FROM sqlite_master WHERE type='table'")
    .all()

  return c.json(tables.results)
})
app.route('/api/surveys', surveys)
app.route('/api/questions', questions)
app.route('/api/responses', responses)
export default app
