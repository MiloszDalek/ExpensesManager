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

_ACTIVATION_TRANSLATIONS = {
  "en": {
    "subject": "Activate your account",
    "heading": "Activate your account",
    "intro": "Thanks for signing up. Click the button below to activate your account. This link is valid for <strong>24 hours</strong>.",
    "button": "Activate account",
    "copy_url": "Or copy this URL:",
    "footer": "If you did not create this account, ignore this email.",
    "text_body": (
      "Thanks for signing up.\n\n"
      "Open the following link to activate your account (valid 24 hours):\n{activation_link}\n\n"
      "If you did not create this account, ignore this email."
    ),
  },
  "pl": {
    "subject": "Aktywacja konta",
    "heading": "Aktywacja konta",
    "intro": "Dziękujemy za rejestrację. Kliknij przycisk poniżej, aby aktywować konto. Link jest ważny przez <strong>24 godziny</strong>.",
    "button": "Aktywuj konto",
    "copy_url": "Lub skopiuj ten adres:",
    "footer": "Jeśli nie zakładałeś konta, zignoruj tę wiadomość.",
    "text_body": (
      "Dziękujemy za rejestrację.\n\n"
      "Otwórz poniższy link, aby aktywować konto (ważny 24 godziny):\n{activation_link}\n\n"
      "Jeśli nie zakładałeś konta, zignoruj tę wiadomość."
    ),
  },
}

_ACCOUNT_EXISTS_TRANSLATIONS = {
  "en": {
    "subject": "Account already exists",
    "heading": "Account already exists",
    "intro": "An account with this email already exists. If you forgot your password, use the reset link below.",
    "button": "Reset password",
    "copy_url": "Or copy this URL:",
    "footer": "If you did not request this, you can ignore this email.",
    "text_body": (
      "An account with this email already exists.\n\n"
      "If you forgot your password, open the following link:\n{forgot_password_link}\n\n"
      "If you did not request this, you can ignore this email."
    ),
  },
  "pl": {
    "subject": "Konto już istnieje",
    "heading": "Konto już istnieje",
    "intro": "Konto z tym adresem email już istnieje. Jeśli nie pamiętasz hasła, skorzystaj z linku resetu poniżej.",
    "button": "Zresetuj hasło",
    "copy_url": "Lub skopiuj ten adres:",
    "footer": "Jeśli nie prosiłeś o tę wiadomość, możesz ją zignorować.",
    "text_body": (
      "Konto z tym adresem email już istnieje.\n\n"
      "Jeśli nie pamiętasz hasła, otwórz poniższy link:\n{forgot_password_link}\n\n"
      "Jeśli nie prosiłeś o tę wiadomość, możesz ją zignorować."
    ),
  },
}


def _get_translation(language: str | None) -> dict:
    if language and language.lower().startswith("pl"):
        return _TRANSLATIONS["pl"]
    return _TRANSLATIONS[_DEFAULT_LANG]


def _get_activation_translation(language: str | None) -> dict:
  if language and language.lower().startswith("pl"):
    return _ACTIVATION_TRANSLATIONS["pl"]
  return _ACTIVATION_TRANSLATIONS[_DEFAULT_LANG]


def _get_account_exists_translation(language: str | None) -> dict:
  if language and language.lower().startswith("pl"):
    return _ACCOUNT_EXISTS_TRANSLATIONS["pl"]
  return _ACCOUNT_EXISTS_TRANSLATIONS[_DEFAULT_LANG]


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


def send_account_activation_email(
    recipient: str,
    activation_link: str,
    language: str | None = None,
) -> None:
    settings = get_settings()

    resend.api_key = settings.RESEND_API_KEY

    t = _get_activation_translation(language)

    subject = t["subject"]
    text_body = t["text_body"].format(activation_link=activation_link)

    html_body = f"""\
<!DOCTYPE html>
<html>
  <body style="font-family: Arial, sans-serif; line-height: 1.5; color: #222;">
    <h2>{t["heading"]}</h2>

    <p>
      {t["intro"]}
    </p>

    <p>
      <a href="{activation_link}"
         style="display:inline-block;padding:10px 18px;background:#2563eb;
                color:#fff;text-decoration:none;border-radius:6px;">
        {t["button"]}
      </a>
    </p>

    <p>
      {t["copy_url"]}<br>
      <a href="{activation_link}">{activation_link}</a>
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


def send_account_exists_email(
    recipient: str,
    forgot_password_link: str,
    language: str | None = None,
) -> None:
    settings = get_settings()

    resend.api_key = settings.RESEND_API_KEY

    t = _get_account_exists_translation(language)

    subject = t["subject"]
    text_body = t["text_body"].format(forgot_password_link=forgot_password_link)

    html_body = f"""\
<!DOCTYPE html>
<html>
  <body style="font-family: Arial, sans-serif; line-height: 1.5; color: #222;">
    <h2>{t["heading"]}</h2>

    <p>
      {t["intro"]}
    </p>

    <p>
      <a href="{forgot_password_link}"
         style="display:inline-block;padding:10px 18px;background:#2563eb;
                color:#fff;text-decoration:none;border-radius:6px;">
        {t["button"]}
      </a>
    </p>

    <p>
      {t["copy_url"]}<br>
      <a href="{forgot_password_link}">{forgot_password_link}</a>
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