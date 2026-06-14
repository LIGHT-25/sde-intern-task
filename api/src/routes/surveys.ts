import { Hono } from 'hono'

const surveys = new Hono<{ Bindings: Env }>()

surveys.get('/', async (c) => {
  const authHeader = c.req.header('Authorization')
  let ownerId = 'test-user'
  if (authHeader) {
    ownerId = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader
  }

  const result = await c.env.survey_builder_db
    .prepare('SELECT * FROM surveys WHERE owner_id = ?')
    .bind(ownerId)
    .all()
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
    const { title } = await c.req.json().catch(() => ({ title: 'My First Survey' }))

    const authHeader = c.req.header('Authorization')
    let ownerId = 'test-user'
    if (authHeader) {
      ownerId = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader
    }

    await c.env.survey_builder_db
      .prepare(
        `
				INSERT INTO surveys (
					id,
					owner_id,
					title,
					description,
					primary_color,
					logo_url
				)
				VALUES (?, ?, ?, ?, ?, ?)
				`,
      )
      .bind(id, ownerId, title || 'My First Survey', 'A brand new survey.', '#4f46e5', '')
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
  const authHeader = c.req.header('Authorization')
  let ownerId = 'test-user'
  if (authHeader) {
    ownerId = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader
  }

  await c.env.survey_builder_db
    .prepare('DELETE FROM surveys WHERE id = ? AND owner_id = ?')
    .bind(id, ownerId)
    .run()

  return c.json({
    success: true,
  })
})

surveys.put('/:id', async (c) => {
  const id = c.req.param('id')
  const authHeader = c.req.header('Authorization')
  let ownerId = 'test-user'
  if (authHeader) {
    ownerId = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader
  }

  try {
    const { title, description, primary_color, logo_url } = await c.req.json()

    await c.env.survey_builder_db
      .prepare(
        `
				UPDATE surveys
				SET
					title = ?,
					description = ?,
					primary_color = ?,
					logo_url = ?
				WHERE id = ? AND owner_id = ?
				`,
      )
      .bind(
        title || 'Untitled Survey',
        description || '',
        primary_color || '#4f46e5',
        logo_url || '',
        id,
        ownerId,
      )
      .run()

    return c.json({
      success: true,
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

export default surveys
