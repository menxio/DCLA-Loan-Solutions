import { SmsTemplateService } from './sms-template.service';

describe('SmsTemplateService', () => {
  const service = new SmsTemplateService();

  it('builds the original approved loan message exactly', () => {
    const message = service.buildLoanCreatedSms({
      clientName: 'Juan Dela Cruz',
      principalAmount: 10_000,
    });

    expect(message).toBe(
      'Dear Juan Dela Cruz,\n\nWe are pleased to inform you that your loan application with DCLA has been approved in the amount of PHP 10,000.00. Please coordinate with our office for the release schedule and completion of the necessary documents. Thank you for choosing DCLA.\n\n- DCLA Management',
    );
    expect(message).toHaveLength(287);
    expect(message.length).toBeLessThanOrEqual(670);
  });

  it('builds the original approved payment message exactly', () => {
    const message = service.buildRepaymentPostedSms({
      clientName: 'Juan Dela Cruz',
      amount: 1_000,
      paymentDate: '2026-08-27',
    });

    expect(message).toBe(
      'Dear Juan Dela Cruz,\n\nThis is to formally acknowledge receipt of your loan repayment in the amount of PHP 1,000.00, received on 2026-08-27. Your payment has been successfully posted and recorded in the books of DCLA. Thank you for your prompt payment and continued trust.\n\n- DCLA Management',
    );
    expect(message).toHaveLength(290);
    expect(message.length).toBeLessThanOrEqual(670);
  });

  it('formats a payment timestamp using the Asia/Manila calendar date', () => {
    const message = service.buildRepaymentPostedSms({
      clientName: 'Juan Dela Cruz',
      amount: 1_000,
      paymentDate: new Date('2026-08-26T16:30:00.000Z'),
    });

    expect(message).toContain('received on 2026-08-27.');
  });

  it('preserves a date-only payment date without timezone shifting', () => {
    const message = service.buildRepaymentPostedSms({
      clientName: 'Juan Dela Cruz',
      amount: 1_000,
      paymentDate: '2026-08-27',
    });

    expect(message).toContain('received on 2026-08-27.');
  });

  it('preserves a realistically long client name below the provider limit', () => {
    const clientName = 'Maria Cristina De Los Santos-Reyes';
    const loanMessage = service.buildLoanCreatedSms({
      clientName,
      principalAmount: 10_000,
    });
    const paymentMessage = service.buildRepaymentPostedSms({
      clientName,
      amount: 1_000,
      paymentDate: '2026-08-27',
    });

    expect(loanMessage).toContain(`Dear ${clientName},`);
    expect(paymentMessage).toContain(`Dear ${clientName},`);
    expect(loanMessage).toHaveLength(307);
    expect(paymentMessage).toHaveLength(310);
    expect(loanMessage.length).toBeLessThanOrEqual(670);
    expect(paymentMessage.length).toBeLessThanOrEqual(670);
    expect(loanMessage).toContain('\n\n- DCLA Management');
    expect(paymentMessage).toContain('\n\n- DCLA Management');
    expect(`${loanMessage}${paymentMessage}`).not.toMatch(/[₱—]/);
  });
});
