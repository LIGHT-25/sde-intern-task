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

responses.get('/:surveyId/all-answers', async (c) => {
  const surveyId = c.req.param('surveyId')

  const result = await c.env.survey_builder_db
    .prepare(
      `
			SELECT a.*
			FROM answers a
			JOIN responses r ON a.response_id = r.id
			WHERE r.survey_id = ?
			`,
    )
    .bind(surveyId)
    .all()

  return c.json(result.results)
})

responses.post('/:surveyId', async (c) => {
  const surveyId = c.req.param('surveyId')
  const responseId = crypto.randomUUID()

  // Check if version was passed in request body; otherwise fetch from survey
  let surveyVersion: string | undefined
  try {
    const requestBody = (await c.req.json()) as Record<string, unknown> | null
    if (requestBody && typeof requestBody.version === 'string') {
      surveyVersion = requestBody.version
    }
  } catch {
    // No body or invalid JSON, proceed with defaults
  }

  // If no version was provided in request, fetch from survey's current version
  if (!surveyVersion) {
    const surveyRecord = await c.env.survey_builder_db
      .prepare('SELECT version FROM surveys WHERE id = ?')
      .bind(surveyId)
      .first()

    surveyVersion = (surveyRecord?.version as string) || 'v1.0'
  }

  await c.env.survey_builder_db
    .prepare(
      `
			INSERT INTO responses (
				id,
				survey_id,
				survey_version
			)
			VALUES (?, ?, ?)
			`,
    )
    .bind(responseId, surveyId, surveyVersion)
    .run()

  return c.json({
    success: true,
    responseId,
  })
})

responses.post('/:responseId/answers', async (c) => {
  try {
    const responseId = c.req.param('responseId')
    const { question_id, value } = await c.req.json()
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
      .bind(answerId, responseId, question_id, value || '')
      .run()

    return c.json({
      success: true,
      answerId,
    })
  } catch (error) {
    console.error(error)
    return c.json({ error: String(error) }, 500)
  }
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
