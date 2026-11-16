import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createTransport, type Transporter } from "nodemailer";

/**
 * Sends email through the SMTP account in .env (SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, MAIL_FROM).
 * Without SMTP_HOST, development logs the message instead, so password resets can be tried locally;
 * production refuses, so a reset link is never silently dropped.
 */
@Injectable()
export class MailService {
    private readonly logger = new Logger(MailService.name);
    private readonly transporter: Transporter | null;

    constructor(private readonly config: ConfigService) {
        // Only the server name is wanted; "https://mail.example.com/" is a common slip, so tidy it.
        const host = config.get<string>('SMTP_HOST')?.trim().replace(/^[a-z]+:\/\//i, '').replace(/[/:].*$/, '');
        this.transporter = host
            ? createTransport({
                host,
                port: Number(config.get('SMTP_PORT') ?? 587),
                secure: config.get('SMTP_SECURE') === 'true',
                auth: config.get('SMTP_USER') ? { user: config.get<string>('SMTP_USER'), pass: config.get<string>('SMTP_PASS') } : undefined,
            })
            : null;
    }

    async send(to: string, subject: string, text: string, html: string): Promise<void> {
        if (!this.transporter) {
            if (process.env.NODE_ENV === 'production') {
                throw new ServiceUnavailableException("Email isn't set up yet. Please contact Amuze.");
            }
            this.logger.warn(`SMTP_HOST is not set, so this email was not sent. To: ${to} · ${subject}\n${text}`);
            return;
        }
        try {
            await this.transporter.sendMail({
                from: this.config.get<string>('MAIL_FROM') ?? this.config.get<string>('SMTP_USER'),
                to,
                subject,
                text,
                html,
            });
        } catch (error) {
            // The mail server's own error goes to the log, not to the customer.
            this.logger.error(`Email to ${to} failed: ${error instanceof Error ? error.message : error}`);
            throw new ServiceUnavailableException("We couldn't send the email right now. Please try again in a few minutes.");
        }
    }
}
