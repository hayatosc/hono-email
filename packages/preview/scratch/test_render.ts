import { render } from '../../core/src/index.ts'
import OrderConfirmation from '../test-emails/order-confirmation.tsx'

async function main() {
  try {
    const { warnings } = await render(OrderConfirmation({}))
    console.log('Warnings:')
    console.log(warnings)
  } catch (err) {
    console.error(err)
  }
}

void main()
