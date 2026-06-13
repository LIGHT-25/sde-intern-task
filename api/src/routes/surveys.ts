import { Hono } from 'hono'

const surveys = new Hono<{ Bindings: Env }>()

surveys.get('/', async (c) => {
  const result = await c.env.survey_builder_db.prepare('SELECT * FROM surveys').all()

  return c.json(result.results)
})

surveys.get('/:id', async (c) => {
  const id = c.req.param('id')

  const survey = await c.env.survey_builder_db
    .prepare('SELECT * FROM surveys WHERE id = ?')
    .bind(id)
    .first()

  if (!survey) {
    return c.json(
      {
        error: 'Survey not found',
      },
      404,
    )
  }

  return c.json(survey)
})

surveys.post('/', async (c) => {
  try {
    const id = crypto.randomUUID()

    await c.env.survey_builder_db
      .prepare(
        `
				INSERT INTO surveys (
					id,
					owner_id,
					title
				)
				VALUES (?, ?, ?)
				`,
      )
      .bind(id, 'test-user', 'My First Survey')
      .run()

    return c.json({
      success: true,
      id,
    })
  } catch (error) {
    console.error(error)

    return c.json(
      {
        error: String(error),
      },
      500,
    )
  }
})
surveys.delete('/:id', async (c) => {
  const id = c.req.param('id')

  await c.env.survey_builder_db.prepare('DELETE FROM surveys WHERE id = ?').bind(id).run()

  return c.json({
    success: true,
  })
})
surveys.put('/:id', async (c) => {
  const id = c.req.param('id')

  await c.env.survey_builder_db
    .prepare(
      `
			UPDATE surveys
			SET
				title = ?,
				description = ?,
				primary_color = ?,
				logo_url = ?
			WHERE id = ?
			`,
    )
    .bind('Updated Survey', 'My updated description', '#ff0000', 'https://example.com/logo.png', id)
    .run()

  return c.json({
    success: true,
  })
})

export default surveys
