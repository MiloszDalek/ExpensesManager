import logging
import resend


from app.core.config import get_settings

logger = logging.getLogger(__name__)

_DEFAULT_LANG = "en"

_TRANSLATIONS = {
    "en": {
        "subject": "Reset your password",
        "heading": "Reset your password",
        "intro": "You requested a password reset. Click the button below. This link is valid for <strong>30 minutes</strong>.",
        "button": "Reset password",
        "copy_url": "Or copy this URL:",
        "footer": "If you did not request this, ignore this email.",
        "text_body": (
            "You requested a password reset.\n\n"
            "Open the following link (valid 30 minutes):\n{reset_link}\n\n"
            "If you did not request this, ignore this email."
        ),
    },
    "pl": {
        "subject": "Resetowanie hasła",
        "heading": "Resetowanie hasła",
        "intro": "Otrzymaliśmy prośbę o reset hasła. Kliknij poniższy przycisk. Link jest ważny przez <strong>30 minut</strong>.",
        "button": "Zresetuj hasło",
        "copy_url": "Lub skopiuj ten adres:",
        "footer": "Jeśli nie prosiłeś o reset hasła, zignoruj tę wiadomość.",
        "text_body": (
            "Otrzymaliśmy prośbę o reset hasła.\n\n"
            "Otwórz poniższy link (ważny 30 minut):\n{reset_link}\n\n"
            "Jeśli nie prosiłeś o reset hasła, zignoruj tę wiadomość."
        ),
    },
}


def _get_translation(language: str | None) -> dict:
    if language and language.lower().startswith("pl"):
        return _TRANSLATIONS["pl"]
    return _TRANSLATIONS[_DEFAULT_LANG]


def send_password_reset_email(recipient: str, reset_link: str, language: str | None = None) -> None:
    settings = get_settings()

    resend.api_key = settings.RESEND_API_KEY

    t = _get_translation(language)

    subject = t["subject"]
    text_body = t["text_body"].format(reset_link=reset_link)

    html_body = f"""\
<!DOCTYPE html>
<html>
  <body style="font-family: Arial, sans-serif; line-height: 1.5; color: #222;">
    <h2>{t["heading"]}</h2>

    <p>
      {t["intro"]}
    </p>

    <p>
      <a href="{reset_link}"
         style="display:inline-block;padding:10px 18px;background:#2563eb;
                color:#fff;text-decoration:none;border-radius:6px;">
        {t["button"]}
      </a>
    </p>

    <p>
      {t["copy_url"]}<br>
      <a href="{reset_link}">{reset_link}</a>
    </p>

    <hr>
    <p style="font-size:12px;color:#666;">
      {t["footer"]}
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