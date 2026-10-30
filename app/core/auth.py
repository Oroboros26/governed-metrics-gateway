import hmac
import os
import secrets

from fastapi import HTTPException, Request

# Limitation: demo identity picker + signed cookie, no passwords. Swap for SSO/OIDC before any shared deployment.
SECRET = os.environ.get("SEMANTIX_SECRET", "").encode() or secrets.token_bytes(32)  # random => sessions reset on restart
COOKIE = "semantix_session"

ROLES = {
    "ecommerce_analyst": {"sf_role": "ROLE_ECOM_ANALYST", "domains": ["ecommerce"], "review": False},
    "finance_director": {"sf_role": "ROLE_FINANCE_DIRECTOR", "domains": ["ecommerce", "finance"], "review": False},
    "data_reviewer": {"sf_role": "ROLE_DATA_PLATFORM", "domains": ["ecommerce", "finance"], "review": True},
}
USERS = {
    "jean": {"name": "Jean", "title": "E-com Lead", "role": "ecommerce_analyst"},
    "amelie": {"name": "Amélie", "title": "Finance Director", "role": "finance_director"},
    "marc": {"name": "Marc", "title": "Data Platform Reviewer", "role": "data_reviewer"},
}


def _sig(uid: str) -> str:
    return hmac.new(SECRET, uid.encode(), "sha256").hexdigest()


def make_token(uid: str) -> str:
    return f"{uid}.{_sig(uid)}"


def current_user(request: Request) -> dict:
    uid, _, sig = request.cookies.get(COOKIE, "").partition(".")
    if uid not in USERS or not hmac.compare_digest(sig, _sig(uid)):
        raise HTTPException(401, "Please sign in.")
    r = ROLES[USERS[uid]["role"]]
    return {"id": uid, **USERS[uid], "sf_role": r["sf_role"], "domains": r["domains"], "can_review": r["review"]}
