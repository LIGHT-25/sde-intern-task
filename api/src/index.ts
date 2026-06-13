import { Hono } from 'hono'
import { cors } from 'hono/cors'
import questions from './routes/questions'
import responses from './routes/responses'
import surveys from './routes/surveys'

const app = new Hono<{ Bindings: Env }>()

app.use('/api/*', cors())

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
