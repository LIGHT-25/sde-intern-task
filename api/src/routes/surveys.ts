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
				logo_url,
				version
			)
			VALUES (?, ?, ?, ?, ?, ?, ?)
			`,
      )
      .bind(id, ownerId, title || 'My First Survey', 'A brand new survey.', '#4f46e5', '', 'v1.0')
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

  try {
    const survey = await c.env.survey_builder_db
      .prepare('SELECT id FROM surveys WHERE id = ? AND owner_id = ?')
      .bind(id, ownerId)
      .first()

    if (!survey) {
      return c.json({ error: 'Survey not found' }, 404)
    }

    const statements = [
      c.env.survey_builder_db
        .prepare(
          'DELETE FROM answers WHERE response_id IN (SELECT id FROM responses WHERE survey_id = ?)',
        )
        .bind(id),
      c.env.survey_builder_db
        .prepare(
          'DELETE FROM answers WHERE question_id IN (SELECT id FROM questions WHERE survey_id = ?)',
        )
        .bind(id),
      c.env.survey_builder_db.prepare('DELETE FROM responses WHERE survey_id = ?').bind(id),
      c.env.survey_builder_db.prepare('DELETE FROM questions WHERE survey_id = ?').bind(id),
      c.env.survey_builder_db
        .prepare('DELETE FROM surveys WHERE id = ? AND owner_id = ?')
        .bind(id, ownerId),
    ]

    await c.env.survey_builder_db.batch(statements)

    return c.json({
      success: true,
    })
  } catch (error) {
    console.error(error)
    return c.json({ error: String(error) }, 500)
  }
})

surveys.put('/:id', async (c) => {
  const id = c.req.param('id')
  const authHeader = c.req.header('Authorization')
  let ownerId = 'test-user'
  if (authHeader) {
    ownerId = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader
  }

  try {
    const { title, description, primary_color, logo_url, version } = await c.req.json()

    await c.env.survey_builder_db
      .prepare(
        `
			UPDATE surveys
			SET
				title = ?,
				description = ?,
				primary_color = ?,
				logo_url = ?,
				version = COALESCE(?, version)
			WHERE id = ? AND owner_id = ?
			`,
      )
      .bind(
        title || 'Untitled Survey',
        description || '',
        primary_color || '#4f46e5',
        logo_url || '',
        version || null,
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

function bumpSurveyVersion(version: string) {
  const match = version.match(/^v(\d+)\.(\d+)$/)
  if (!match) {
    return `${version}.1`
  }
  const [, majorGroup, minorGroup] = match
  const major = parseInt(majorGroup ?? '0', 10)
  const minor = parseInt(minorGroup ?? '0', 10)
  return `v${major}.${minor + 1}`
}

surveys.post('/:id/bump-version', async (c) => {
  const id = c.req.param('id')
  const authHeader = c.req.header('Authorization')
  let ownerId = 'test-user'
  if (authHeader) {
    ownerId = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader
  }

  try {
    const survey = await c.env.survey_builder_db
      .prepare('SELECT * FROM surveys WHERE id = ? AND owner_id = ?')
      .bind(id, ownerId)
      .first()

    if (!survey) {
      return c.json({ error: 'Survey not found' }, 404)
    }

    const currentVersion = (survey.version as string) || 'v1.0'
    const nextVersion = bumpSurveyVersion(currentVersion)

    // Update survey version
    await c.env.survey_builder_db
      .prepare('UPDATE surveys SET version = ? WHERE id = ? AND owner_id = ?')
      .bind(nextVersion, id, ownerId)
      .run()

    // Copy questions from currentVersion to nextVersion
    const questionsResult = await c.env.survey_builder_db
      .prepare('SELECT * FROM questions WHERE survey_id = ? AND version = ?')
      .bind(id, currentVersion)
      .all()

    const statements = []
    for (const q of questionsResult.results) {
      const newId = crypto.randomUUID()
      statements.push(
        c.env.survey_builder_db
          .prepare(
            `
            INSERT INTO questions (id, survey_id, type, title, position, config_json, version)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            `,
          )
          .bind(newId, id, q.type, q.title, q.position, q.config_json, nextVersion),
      )
    }

    if (statements.length > 0) {
      await c.env.survey_builder_db.batch(statements)
    }

    return c.json({
      success: true,
      version: nextVersion,
    })
  } catch (error) {
    console.error(error)
    return c.json({ error: String(error) }, 500)
  }
})

export default surveys
