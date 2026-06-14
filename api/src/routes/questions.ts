import { Hono } from 'hono'

const questions = new Hono<{ Bindings: Env }>()

questions.get('/:surveyId', async (c) => {
  const surveyId = c.req.param('surveyId')
  const version = c.req.query('v')

  let targetVersion = version
  if (!targetVersion) {
    const surveyRecord = await c.env.survey_builder_db
      .prepare('SELECT version FROM surveys WHERE id = ?')
      .bind(surveyId)
      .first()
    targetVersion = (surveyRecord?.version as string) || 'v1.0'
  }

  const result = await c.env.survey_builder_db
    .prepare(
      `
			SELECT *
			FROM questions
			WHERE survey_id = ? AND version = ?
			ORDER BY position
			`,
    )
    .bind(surveyId, targetVersion)
    .all()

  return c.json(result.results)
})

questions.post('/:surveyId', async (c) => {
  try {
    const surveyId = c.req.param('surveyId')
    const id = crypto.randomUUID()
    const { type, title, config_json } = await c.req.json().catch(() => ({
      type: 'text',
      title: 'New Question',
      config_json: '{}',
    }))

    // Get current survey version
    const surveyRecord = await c.env.survey_builder_db
      .prepare('SELECT version FROM surveys WHERE id = ?')
      .bind(surveyId)
      .first()
    const targetVersion = (surveyRecord?.version as string) || 'v1.0'

    // Determine the next position index
    const countQuery = await c.env.survey_builder_db
      .prepare('SELECT COUNT(*) as count FROM questions WHERE survey_id = ? AND version = ?')
      .bind(surveyId, targetVersion)
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
					config_json,
          version
				)
				VALUES (?, ?, ?, ?, ?, ?, ?)
				`,
      )
      .bind(
        id,
        surveyId,
        type || 'text',
        title || 'New Question',
        nextPosition,
        config_json || '{}',
        targetVersion,
      )
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
    const body = await c.req.json()
    const { title, type, config_json, position } = body

    await c.env.survey_builder_db
      .prepare(
        `
				UPDATE questions
				SET
					title = COALESCE(?, title),
					type = COALESCE(?, type),
					config_json = COALESCE(?, config_json),
					position = COALESCE(?, position)
				WHERE id = ?
				`,
      )
      .bind(
        title !== undefined ? title : null,
        type !== undefined ? type : null,
        config_json !== undefined ? config_json : null,
        position !== undefined ? position : null,
        id,
      )
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
