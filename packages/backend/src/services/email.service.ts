import nodemailer from 'nodemailer';
import { env } from '../config/env';
import logger from '../utils/logger';

interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

interface TeamAssignmentEmailData {
  studentName: string;
  studentEmail: string;
  teamName: string;
  teamRole: string;
  gameName: string;
  teamPageUrl: string;
  accessToken: string;
}

/**
 * Email Service for sending notifications
 */
export class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private isConfigured: boolean = false;

  constructor() {
    this.initialize();
  }

  private initialize() {
    // Check if SMTP is configured
    if (!env.SMTP_USER || !env.SMTP_PASSWORD) {
      logger.warn('Email service not configured: SMTP_USER and SMTP_PASSWORD are required');
      this.isConfigured = false;
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE,
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASSWORD,
        },
      });

      this.isConfigured = true;
      logger.info('Email service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize email service:', error);
      this.isConfigured = false;
    }
  }

  /**
   * Check if email service is ready
   */
  isReady(): boolean {
    return this.isConfigured && this.transporter !== null;
  }

  /**
   * Send an email
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.isReady()) {
      logger.warn('Email service not configured, skipping email send');
      return false;
    }

    try {
      await this.transporter!.sendMail({
        from: `"${env.EMAIL_FROM_NAME}" <${env.EMAIL_FROM}>`,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });

      logger.info(`Email sent successfully to ${options.to}`);
      return true;
    } catch (error) {
      logger.error('Failed to send email:', error);
      return false;
    }
  }

  /**
   * Send team assignment notification email
   */
  async sendTeamAssignmentEmail(data: TeamAssignmentEmailData): Promise<boolean> {
    const subject = `HawkOps: You've been assigned to ${data.teamName}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #7c3aed; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
    .button { display: inline-block; background: #7c3aed; color: white !important; padding: 12px 24px;
              text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
    .info-box { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #7c3aed; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; padding: 20px; }
    .warning { background: #fef3c7; border-left-color: #f59e0b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>HawkOps ITSM Simulation</h1>
    </div>
    <div class="content">
      <h2>Welcome, ${data.studentName}!</h2>

      <p>You have been assigned to participate in the <strong>${data.gameName}</strong> simulation.</p>

      <div class="info-box">
        <strong>Your Assignment:</strong><br>
        Team: <strong>${data.teamName}</strong><br>
        Role: <strong>${data.teamRole}</strong>
      </div>

      <p>Click the button below to access your team's dashboard and start participating in the simulation:</p>

      <center>
        <a href="${data.teamPageUrl}?token=${data.accessToken}" class="button">
          Join Your Team
        </a>
      </center>

      <div class="info-box warning">
        <strong>Important:</strong>
        <ul>
          <li>This link is unique to you - do not share it with others</li>
          <li>You will only have access to your team's dashboard</li>
          <li>Your instructor can track your participation and contributions</li>
        </ul>
      </div>

      <p>If the button doesn't work, copy and paste this link into your browser:</p>
      <p style="word-break: break-all; font-size: 12px; color: #6b7280;">
        ${data.teamPageUrl}?token=${data.accessToken}
      </p>
    </div>
    <div class="footer">
      <p>This is an automated message from HawkOps ITSM Simulation.<br>
      Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
    `;

    const text = `
Welcome to HawkOps ITSM Simulation, ${data.studentName}!

You have been assigned to the ${data.gameName} simulation.

Your Assignment:
- Team: ${data.teamName}
- Role: ${data.teamRole}

Access your team's dashboard using this link:
${data.teamPageUrl}?token=${data.accessToken}

Important:
- This link is unique to you - do not share it with others
- You will only have access to your team's dashboard
- Your instructor can track your participation and contributions

This is an automated message from HawkOps ITSM Simulation.
    `;

    return this.sendEmail({
      to: data.studentEmail,
      subject,
      text,
      html,
    });
  }
}

// Singleton instance
export const emailService = new EmailService();
