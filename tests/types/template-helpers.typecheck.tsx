import { defineEmail, renderTemplate, type EmailTemplate, type InferEmailProps } from "../../src";

type ReceiptEmailProps = {
  orderId: string;
  total: number;
};

const ReceiptEmail: EmailTemplate<ReceiptEmailProps> = ({ orderId, total }) => (
  <html>
    <body>
      <p>Order: {orderId}</p>
      <p>Total: {total}</p>
    </body>
  </html>
);

const receiptEmail = defineEmail(ReceiptEmail);

type InferredReceiptProps = InferEmailProps<typeof ReceiptEmail>;

const receiptProps: InferredReceiptProps = {
  orderId: "order_123",
  total: 3200,
};

void receiptEmail.render(receiptProps);
void receiptEmail.render(receiptProps, { output: "text" });
void renderTemplate(ReceiptEmail, receiptProps, { output: "text" });

// @ts-expect-error total must be a number
void receiptEmail.render({ orderId: "order_123", total: "3200" });

// @ts-expect-error orderId is required
void renderTemplate(ReceiptEmail, { total: 3200 });
