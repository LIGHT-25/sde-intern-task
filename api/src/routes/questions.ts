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
    .bind(id, surveyId, 'text', 'What is your name?', 1, '{}')
    .run()

  return c.json({
    success: true,
    id,
  })
})
questions.put('/:id', async (c) => {
  const id = c.req.param('id')

  await c.env.survey_builder_db
    .prepare(
      `
			UPDATE questions
			SET
				title = ?,
				type = ?,
				config_json = ?
			WHERE id = ?
			`,
    )
    .bind('Updated Question', 'multiple_choice', '{"options":["Yes","No"]}', id)
    .run()

  return c.json({
    success: true,
  })
})
questions.delete('/:id', async (c) => {
  const id = c.req.param('id')

  await c.env.survey_builder_db.prepare('DELETE FROM questions WHERE id = ?').bind(id).run()

  return c.json({ success: true })
})

export default questions
