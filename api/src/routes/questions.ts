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
  try {
    const surveyId = c.req.param('surveyId')
    const id = crypto.randomUUID()
    const { type, title } = await c.req.json().catch(() => ({
      type: 'text',
      title: 'New Question',
    }))

    // Determine the next position index
    const countQuery = await c.env.survey_builder_db
      .prepare('SELECT COUNT(*) as count FROM questions WHERE survey_id = ?')
      .bind(surveyId)
      .first<{ count: number }>()
    const nextPosition = (countQuery?.count || 0) + 1

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
      .bind(id, surveyId, type || 'text', title || 'New Question', nextPosition, '{}')
      .run()

    return c.json({
      success: true,
      id,
    })
  } catch (error) {
    console.error(error)
    return c.json({ error: String(error) }, 500)
  }
})

questions.put('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const { title, type, config_json, position } = await c.req.json()

    await c.env.survey_builder_db
      .prepare(
        `
				UPDATE questions
				SET
					title = ?,
					type = ?,
					config_json = ?,
					position = COALESCE(?, position)
				WHERE id = ?
				`,
      )
      .bind(title, type, config_json, position || null, id)
      .run()

    return c.json({
      success: true,
    })
  } catch (error) {
    console.error(error)
    return c.json({ error: String(error) }, 500)
  }
})

questions.delete('/:id', async (c) => {
  const id = c.req.param('id')
  await c.env.survey_builder_db.prepare('DELETE FROM questions WHERE id = ?').bind(id).run()
  return c.json({ success: true })
})

export default questions
