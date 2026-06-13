import { Hono } from 'hono'
import surveys from './routes/surveys'

const app = new Hono<{ Bindings: Env }>()

app.get('/api/health', (c) => c.json({ status: 'ok' }))

app.get('/api/db-test', async (c) => {
	const tables = await c.env.survey_builder_db
		.prepare(
			"SELECT name FROM sqlite_master WHERE type='table'",
		)
		.all()

	return c.json(tables.results)
})
app.route('/api/surveys', surveys)
export default app