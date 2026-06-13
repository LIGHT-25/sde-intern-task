import { Hono } from 'hono'

const questions = new Hono<{ Bindings: Env }>()

questions.get('/:surveyId', async (c) => {
	const surveyId = c.req.param('surveyId')

	const result = await c.env.survey_builder_db
		.prepare(
			`
			SELECT *
			FROM questions
			WHERE survey_id = ?
			ORDER BY position
			`,
		)
		.bind(surveyId)
		.all()

	return c.json(result.results)
})
questions.post('/:surveyId', async (c) => {
	const surveyId = c.req.param('surveyId')

	const id = crypto.randomUUID()

	await c.env.survey_builder_db
		.prepare(
			`
			INSERT INTO questions (
				id,
				survey_id,
				type,
				title,
				position,
				config_json
			)
			VALUES (?, ?, ?, ?, ?, ?)
			`,
		)
		.bind(
			id,
			surveyId,
			'text',
			'What is your name?',
			1,
			'{}',
		)
		.run()

	return c.json({
		success: true,
		id,
	})
})

export default questions