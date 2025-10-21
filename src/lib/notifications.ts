import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface InboundNotificationParams {
  leadName: string;
  leadEmail?: string;
  leadPhone?: string;
  messageType: 'email' | 'sms';
  messageBody: string;
  messageSubject?: string;
  leadId: string;
}

export async function sendInboundMessageNotification({
  leadName,
  leadEmail,
  leadPhone,
  messageType,
  messageBody,
  messageSubject,
  leadId,
}: InboundNotificationParams) {
  try {
    const fromEmail = process.env.FROM_EMAIL || 'jorge@bostonbuildersai.com';
    const notificationEmail = process.env.FROM_EMAIL || 'jorge@bostonbuildersai.com';

    const leadUrl = `https://www.bostonbuildersai.com/dashboard/leads/${leadId}`;

    const contactInfo = messageType === 'email'
      ? leadEmail
      : leadPhone;

    const subject = `🔔 New ${messageType.toUpperCase()} from ${leadName}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .container {
              background: #ffffff;
              border-radius: 8px;
              padding: 30px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 20px;
              border-radius: 8px 8px 0 0;
              margin: -30px -30px 20px -30px;
            }
            .badge {
              display: inline-block;
              padding: 4px 12px;
              border-radius: 12px;
              font-size: 12px;
              font-weight: bold;
              text-transform: uppercase;
              background: ${messageType === 'email' ? '#3B82F6' : '#10B981'};
              color: white;
            }
            .message-box {
              background: #f8fafc;
              border-left: 4px solid ${messageType === 'email' ? '#3B82F6' : '#10B981'};
              padding: 15px;
              margin: 20px 0;
              border-radius: 4px;
            }
            .button {
              display: inline-block;
              padding: 12px 24px;
              background: #667eea;
              color: white !important;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 600;
              margin-top: 20px;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e2e8f0;
              font-size: 12px;
              color: #64748b;
              text-align: center;
            }
            .info-row {
              margin: 10px 0;
              padding: 8px 0;
            }
            .label {
              font-weight: 600;
              color: #64748b;
              font-size: 12px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .value {
              color: #1e293b;
              margin-top: 4px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 24px;">New Message Received</h1>
            </div>

            <div style="margin: 20px 0;">
              <span class="badge">${messageType}</span>
            </div>

            <div class="info-row">
              <div class="label">From</div>
              <div class="value" style="font-size: 18px; font-weight: 600;">${leadName}</div>
            </div>

            <div class="info-row">
              <div class="label">Contact</div>
              <div class="value">${contactInfo}</div>
            </div>

            ${messageSubject ? `
              <div class="info-row">
                <div class="label">Subject</div>
                <div class="value">${messageSubject}</div>
              </div>
            ` : ''}

            <div class="message-box">
              <div class="label" style="margin-bottom: 8px;">Message</div>
              <div style="white-space: pre-wrap; color: #1e293b;">${messageBody}</div>
            </div>

            <a href="${leadUrl}" class="button">View Lead & Reply</a>

            <div class="footer">
              <p>Boston Builders AI • Lead Management System</p>
              <p>This is an automated notification for inbound messages.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: notificationEmail,
      subject,
      html,
    });

    if (error) {
      console.error('Failed to send notification email:', error);
      return { success: false, error: error.message };
    }

    console.log('Notification email sent:', data?.id);
    return { success: true, data };
  } catch (error) {
    console.error('Notification email error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}
