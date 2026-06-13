import { Hono } from 'hono'

const responses = new Hono<{ Bindings: Env }>()

responses.get('/:surveyId', async (c) => {
  const surveyId = c.req.param('surveyId')

  const result = await c.env.survey_builder_db
    .prepare(
      `
			SELECT *
			FROM responses
			WHERE survey_id = ?
			ORDER BY submitted_at DESC
			`,
    )
    .bind(surveyId)
    .all()

  return c.json(result.results)
})
responses.post('/:surveyId', async (c) => {
  const surveyId = c.req.param('surveyId')

  const responseId = crypto.randomUUID()

  await c.env.survey_builder_db
    .prepare(
      `
			INSERT INTO responses (
				id,
				survey_id
			)
			VALUES (?, ?)
			`,
    )
    .bind(responseId, surveyId)
    .run()

  return c.json({
    success: true,
    responseId,
  })
})
responses.post('/:responseId/answers', async (c) => {
  const responseId = c.req.param('responseId')

  const answerId = crypto.randomUUID()

  await c.env.survey_builder_db
    .prepare(
      `
			INSERT INTO answers (
				id,
				response_id,
				question_id,
				value
			)
			VALUES (?, ?, ?, ?)
			`,
    )
    .bind(answerId, responseId, 'a6fa14a7-c11e-4806-be4d-bc804888f4eb', 'John Doe')
    .run()

  return c.json({
    success: true,
    answerId,
  })
})
responses.get('/:responseId/answers', async (c) => {
	const responseId = c.req.param('responseId')

	const result = await c.env.survey_builder_db
		.prepare(
			`
			SELECT *
			FROM answers
			WHERE response_id = ?
			`,
		)
		.bind(responseId)
		.all()

	return c.json(result.results)
})
export default responses
