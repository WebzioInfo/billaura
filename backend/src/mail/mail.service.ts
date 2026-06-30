import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!user || !pass) {
      this.logger.warn('SMTP credentials are missing. Emails will be logged to console instead.');
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // True for port 465, false for other ports (like 587)
      auth: {
        user,
        pass,
      },
    });
  }

  private getHtmlTemplate(title: string, greeting: string, intro: string, code: string, validity: string, actionText: string) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            background-color: #f8fafc;
            color: #1e293b;
            margin: 0;
            padding: 0;
            -webkit-font-smoothing: antialiased;
          }
          .wrapper {
            width: 100%;
            background-color: #f8fafc;
            padding: 48px 24px;
            box-sizing: border-box;
          }
          .container {
            max-width: 570px;
            margin: 0 auto;
            background-color: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05), 0 4px 6px -4px rgba(0,0,0,0.05);
          }
          .header {
            background-color: #4f46e5;
            padding: 32px 24px;
            text-align: center;
          }
          .logo {
            font-size: 24px;
            font-weight: 800;
            color: #ffffff;
            letter-spacing: -0.025em;
            text-decoration: none;
          }
          .content {
            padding: 40px 32px;
          }
          h1 {
            font-size: 20px;
            font-weight: 700;
            color: #0f172a;
            margin-top: 0;
            margin-bottom: 16px;
          }
          p {
            font-size: 15px;
            line-height: 24px;
            color: #475569;
            margin-top: 0;
            margin-bottom: 24px;
          }
          .otp-container {
            background-color: #f1f5f9;
            border: 1px dashed #cbd5e1;
            border-radius: 12px;
            padding: 24px;
            text-align: center;
            margin-bottom: 24px;
          }
          .otp-code {
            font-family: "Courier New", Courier, monospace;
            font-size: 36px;
            font-weight: 800;
            letter-spacing: 8px;
            color: #4f46e5;
            margin: 0;
          }
          .otp-label {
            font-size: 12px;
            font-weight: 600;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-top: 8px;
          }
          .warning {
            font-size: 13px;
            color: #ef4444;
            background-color: #fef2f2;
            border: 1px solid #fee2e2;
            border-radius: 8px;
            padding: 12px;
            margin-bottom: 24px;
          }
          .footer {
            background-color: #f8fafc;
            border-top: 1px solid #e2e8f0;
            padding: 24px;
            text-align: center;
            font-size: 12px;
            color: #64748b;
          }
          .footer a {
            color: #4f46e5;
            text-decoration: none;
          }
          @media (max-width: 600px) {
            .content {
              padding: 24px 16px;
            }
          }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="container">
            <div class="header">
              <a href="#" class="logo">BILL AURA</a>
            </div>
            <div class="content">
              <h1>${greeting}</h1>
              <p>${intro}</p>
              
              <div class="otp-container">
                <div class="otp-code">${code}</div>
                <div class="otp-label">${actionText}</div>
              </div>
              
              <p style="font-size: 14px; color: #64748b;">This verification code is valid for <strong>${validity}</strong>. If you did not make this request, please ignore this email or secure your credentials.</p>
              
              <div class="warning">
                <strong>Security Alert:</strong> Never share this code with anyone. Bill Aura support representatives will never ask for your OTP.
              </div>
            </div>
            <div class="footer">
              &copy; 2026 Webzio Technology. All rights reserved.<br>
              Corporate Office: Webzio Info, Tech Park Tower A, SF, US.<br>
              Need assistance? <a href="mailto:support@billaura.com">Contact Support</a>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  async sendVerificationOtp(email: string, name: string, code: string): Promise<boolean> {
    const title = 'Verify your email - Bill Aura';
    const greeting = `Welcome, ${name}!`;
    const intro = 'Thank you for registering with Bill Aura. To activate your multi-tenant accounting workspace, please verify your email address by entering the 6-digit verification code below:';
    const validity = '10 minutes';
    const actionText = 'Email Verification Code';

    const html = this.getHtmlTemplate(title, greeting, intro, code, validity, actionText);

    try {
      if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        this.logger.log(`[CONSOLED EMAIL] Send verification email to ${email}. Code: ${code}`);
        return true;
      }

      await this.transporter.sendMail({
        from: `"Bill Aura Accounts" <${process.env.SMTP_USER}>`,
        to: email,
        subject: title,
        html,
      });

      this.logger.log(`Verification OTP email successfully sent to ${email}`);
      return true;
    } catch (err: any) {
      this.logger.error(`Failed to send verification OTP email to ${email}: ${err.message}`, err.stack);
      return false;
    }
  }

  async sendResetPasswordOtp(email: string, name: string, code: string): Promise<boolean> {
    const title = 'Reset your password - Bill Aura';
    const greeting = `Hello, ${name}`;
    const intro = 'We received a request to reset your password. Use the verification code below to authorize your password recovery. If you did not request a password reset, you can safely disregard this email.';
    const validity = '10 minutes';
    const actionText = 'Password Reset Code';

    const html = this.getHtmlTemplate(title, greeting, intro, code, validity, actionText);

    try {
      if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        this.logger.log(`[CONSOLED EMAIL] Send reset password email to ${email}. Code: ${code}`);
        return true;
      }

      await this.transporter.sendMail({
        from: `"Bill Aura Accounts" <${process.env.SMTP_USER}>`,
        to: email,
        subject: title,
        html,
      });

      this.logger.log(`Password recovery OTP email successfully sent to ${email}`);
      return true;
    } catch (err: any) {
      this.logger.error(`Failed to send password recovery OTP email to ${email}: ${err.message}`, err.stack);
      return false;
    }
  }
}
