import { Form, useForm } from '@void/react'

import './style.css'

function PreviewForm() {
  const form = useForm('/', { name: '' }, { throwOnError: false })

  return (
    <>
      <Form form={form}>
        <div className="field">
          <label htmlFor="name">Name on the email</label>
          <input
            id="name"
            name="name"
            autoComplete="given-name"
            required
            maxLength={80}
            value={form.data.name}
            onChange={(event) => form.setData('name', event.target.value)}
          />
        </div>
        <button type="submit" disabled={form.pending}>
          {form.pending ? 'Capturing…' : 'Capture welcome email'}
        </button>
      </Form>
      <p role="status">
        {form.wasSuccessful && 'Email captured. Open the Void inbox URL from your terminal.'}
      </p>
    </>
  )
}

export default function Home() {
  return (
    <main>
      <h1>Local email preview</h1>
      <p>
        Render a welcome email with hono-email from a Void Framework React page. The message stays
        in the local inbox; no email is delivered.
      </p>
      {import.meta.env.DEV ? <PreviewForm /> : <p>Start the development server to capture mail.</p>}
    </main>
  )
}
