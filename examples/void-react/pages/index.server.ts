import { defineHandler } from 'void'
import { z } from 'zod'

import { sendWelcomeEmail } from '../src/welcome-email'

export const action = defineHandler.withValidator({
  body: z.object({ name: z.string().trim().min(1, 'Enter a name.').max(80) }),
})(async (c, { body }) => {
  if (!import.meta.env.DEV) return c.text('This example only sends in development.', 403)

  const receipt = await sendWelcomeEmail(body.name)
  if (!receipt.successful) return c.text('Void did not capture the email.', 502)
})
