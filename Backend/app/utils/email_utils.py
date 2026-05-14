import logging
import resend


from app.core.config import get_settings

logger = logging.getLogger(__name__)


def send_password_reset_email(recipient: str, reset_link: str) -> None:
    settings = get_settings()

    resend.api_key = settings.RESEND_API_KEY

    subject = "Reset your password"

    text_body = (
        "You requested a password reset.\n\n"
        f"Open the following link (valid 30 minutes):\n{reset_link}\n\n"
        "If you did not request this, ignore this email."
    )

    html_body = f"""
<!DOCTYPE html>
<html>
  <body style="font-family: Arial, sans-serif; line-height: 1.5; color: #222;">
    <h2>Reset your password</h2>

    <p>
      You requested a password reset. Click the button below.
      This link is valid for <strong>30 minutes</strong>.
    </p>

    <p>
      <a href="{reset_link}"
         style="display:inline-block;padding:10px 18px;background:#2563eb;
                color:#fff;text-decoration:none;border-radius:6px;">
        Reset password
      </a>
    </p>

    <p>
      Or copy this URL:<br>
      <a href="{reset_link}">{reset_link}</a>
    </p>

    <hr>
    <p style="font-size:12px;color:#666;">
      If you did not request this, ignore this email.
    </p>
  </body>
</html>
"""

    try:
        resend.Emails.send({
            "from": settings.EMAIL_FROM,
            "to": recipient,
            "subject": subject,
            "text": text_body,
            "html": html_body,
        })

    except Exception:
        logger.exception("Failed to send email to %s", recipient)
        raise