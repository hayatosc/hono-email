# SQS → Lambda → SES

This example renders a welcome email for each SQS record and sends it through `hono-email/aws-ses` with AWS SDK v3.
The client is created outside the Lambda handler and reused across warm invocations.

## Build and check

From the repository root:

```sh
bun install
bun run build
bun run --filter hono-email-aws-ses-sqs-example typecheck
bun run --filter hono-email-aws-ses-sqs-example test
bun run --filter hono-email-aws-ses-sqs-example build
bun run --filter hono-email-aws-ses-sqs-example test:runtime
```

The bundle is `examples/aws-ses-sqs/dist/handler.mjs` and includes the SDK.
The build also copies `htmlrewriter` and its WebAssembly asset into `dist/node_modules`.
Package the entire contents of `dist/` at the root of your Lambda deployment archive and set the handler to `handler.handler` on Node.js 22 or newer.

## AWS configuration

- Set `EMAIL_FROM` to an SES-verified email address. The SDK resolves the region and temporary credentials from Lambda; no access keys are required in the code.
- Give the execution role `ses:SendEmail` permission scoped to your verified identity, CloudWatch Logs permissions, and permission to consume the SQS queue. Encrypted queues may also require KMS permissions.
- Connect the queue with `FunctionResponseTypes: [ReportBatchItemFailures]`. Without this setting, returning failed record IDs does not request retries for those records.
- Configure a redrive policy and dead-letter queue so invalid jobs do not retry indefinitely.
- Start with a batch size of 5 and a Lambda timeout of at least 60 seconds to cover the example's sequential requests with a 10-second request timeout. Set the queue visibility timeout to at least six times the Lambda timeout plus the batching window. Limit event-source concurrency to stay within your SES sending quota.
- SES sandbox restrictions apply in the selected region; request production access or use verified recipients while testing.

Enqueue JSON data, for example:

```json
{ "to": "recipient@example.com", "name": "Alice" }
```

The handler validates the payload and selects the template locally.
It does not accept arbitrary HTML, sender overrides, or attachment URLs from queue data.

## Failure behavior

For a standard queue, the worker returns only failed SQS record IDs and continues processing other records.
For FIFO queues, it stops at the first failure and returns that record and all unprocessed records.
It handles both `successful: false` receipts and exceptions, including malformed JSON and rendering errors.
Logs identify failed jobs by SQS message ID without logging recipients or email contents.

`maxAttempts: 1` disables additional SDK attempts in this example; SQS handles redelivery.
The adapter itself does not retry. Adjust client timeouts and retries to your processing budget if needed.

SQS is at least once, and SES `SendEmail` has no idempotency token.
Partial batch responses do not prevent duplicates after an ambiguous network timeout or a crash after sending.
For workloads that require deduplication, persist an application job ID and delivery state, and define a reconciliation policy for uncertain sends. The example does not provide exactly-once delivery.

References: [SQS partial batch responses](https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-errorhandling.html), [queue configuration](https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-configure.html), [SES SendEmail](https://docs.aws.amazon.com/ses/latest/APIReference-V2/API_SendEmail.html).
