"""COET ET Lab credential verifier for APMS.

Credentials and the ET Lab session remain in this request's memory only. The
service returns verified signup identity and available student contact fields;
it never logs request bodies or cookies.
"""

from collections import defaultdict, deque
from hmac import compare_digest
import os
import re
import threading
import time
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup
from flask import Flask, jsonify, request
from werkzeug.middleware.proxy_fix import ProxyFix


BASE_URL = "https://coet.etlab.in"
LOGIN_URL = f"{BASE_URL}/user/login"
PROFILE_URL = f"{BASE_URL}/student/profile"
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36"
)
MAX_ATTEMPTS_PER_MINUTE = 12
RATE_WINDOW_SECONDS = 60

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 8 * 1024
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)

_attempts = defaultdict(deque)
_attempts_lock = threading.Lock()


@app.after_request
def prevent_caching(response):
    response.headers["Cache-Control"] = "no-store, max-age=0"
    response.headers["Pragma"] = "no-cache"
    return response


def normalize_registration_number(value):
    return re.sub(r"\s+", "", value or "").upper()


def allow_attempt(client_ip):
    now = time.monotonic()
    with _attempts_lock:
        # Bound memory if this public endpoint receives traffic from many IPs.
        if len(_attempts) > 2048:
            stale_before = now - RATE_WINDOW_SECONDS
            for ip in list(_attempts):
                while _attempts[ip] and _attempts[ip][0] <= stale_before:
                    _attempts[ip].popleft()
                if not _attempts[ip]:
                    _attempts.pop(ip, None)
            if len(_attempts) > 2048:
                _attempts.clear()

        attempts = _attempts[client_ip]
        while attempts and attempts[0] <= now - RATE_WINDOW_SECONDS:
            attempts.popleft()
        if len(attempts) >= MAX_ATTEMPTS_PER_MINUTE:
            return False
        attempts.append(now)
        return True


def page_title(soup):
    title = soup.title.get_text(" ", strip=True) if soup.title else ""
    return title.casefold()


def is_login_page(soup, response_url):
    return "/user/login" in urlparse(response_url).path or "login" in page_title(soup)


def normalize_profile_label(value):
    return re.sub(r"[^a-z0-9]+", " ", value.casefold()).strip()


def profile_cell_value(cell):
    # ET Lab may render values as text, form controls, or links. Collect only
    # the value cell so similarly named parent fields are never mixed in.
    values = [cell.get_text(" ", strip=True)]
    for field in cell.find_all(["input", "textarea", "select"]):
        value = field.get("value") or ""
        if not value and field.name == "select":
            selected = field.find("option", selected=True)
            value = selected.get_text(" ", strip=True) if selected else ""
        if value:
            values.append(value)
    for link in cell.find_all("a", href=True):
        href = link["href"].strip()
        if href.casefold().startswith(("mailto:", "tel:")):
            values.append(href.split(":", 1)[1])
    return " ".join(dict.fromkeys(" ".join(value.split()) for value in values if value))


def profile_value(soup, labels):
    wanted = {normalize_profile_label(label) for label in labels}
    if soup is None:
        return ""
    for row in soup.find_all("tr"):
        cells = row.find_all(["th", "td"], recursive=False)
        if len(cells) < 2:
            continue
        label = normalize_profile_label(cells[0].get_text(" ", strip=True).rstrip(":"))
        if label in wanted:
            return profile_cell_value(cells[1])
    return ""


def profile_table_with_labels(soup, labels):
    wanted = {normalize_profile_label(label) for label in labels}
    for table in soup.find_all("table"):
        for row in table.find_all("tr"):
            cells = row.find_all(["th", "td"], recursive=False)
            if len(cells) < 2:
                continue
            label = normalize_profile_label(cells[0].get_text(" ", strip=True).rstrip(":"))
            if label in wanted:
                return table
    return None


EMAIL_PATTERN = re.compile(
    r"[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?"
    r"(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+",
    re.IGNORECASE,
)


def profile_email_near_label(soup, anchor_label, labels):
    # Some COET layouts wrap many profile sections in one outer table. In that
    # case the first "Email" row may belong to a parent. Use the email row
    # closest to the student's own mobile row instead.
    anchor = normalize_profile_label(anchor_label)
    wanted = {normalize_profile_label(label) for label in labels}
    rows = []
    for row in soup.find_all("tr"):
        cells = row.find_all(["th", "td"], recursive=False)
        if len(cells) < 2:
            continue
        label = normalize_profile_label(cells[0].get_text(" ", strip=True).rstrip(":"))
        rows.append((label, profile_cell_value(cells[1])))
    anchor_indexes = [index for index, (label, _value) in enumerate(rows) if label == anchor]
    if not anchor_indexes:
        return ""
    anchor_index = anchor_indexes[0]
    candidates = [
        (abs(index - anchor_index), value)
        for index, (label, value) in enumerate(rows)
        if label in wanted and value
    ]
    if not candidates:
        return ""
    value = min(candidates, key=lambda candidate: candidate[0])[1]
    match = EMAIL_PATTERN.search(value)
    return match.group(0) if match else ""


def login_and_read_identity(username, password):
    # A fresh, request-local session prevents one student's ET Lab cookies from
    # ever being reused for another student.
    with requests.Session() as session:
        session.headers.update({
            "User-Agent": USER_AGENT,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        })
        try:
            login_page = session.get(LOGIN_URL, timeout=(5, 15))
            if login_page.status_code != 200 or urlparse(login_page.url).hostname != "coet.etlab.in":
                return "unavailable", None

            login_soup = BeautifulSoup(login_page.text, "html.parser")
            login_form = next((
                form for form in login_soup.find_all("form")
                if form.find(attrs={"name": "LoginForm[username]"})
                and form.find(attrs={"name": "LoginForm[password]"})
            ), None)
            if not login_form:
                return "unavailable", None

            form_action = urljoin(login_page.url, login_form.get("action") or "/user/login")
            parsed_action = urlparse(form_action)
            if parsed_action.scheme != "https" or parsed_action.hostname != "coet.etlab.in":
                return "unavailable", None

            payload = {
                field.get("name"): field.get("value", "")
                for field in login_form.find_all("input", {"type": "hidden"})
                if field.get("name")
            }
            payload["LoginForm[username]"] = username
            payload["LoginForm[password]"] = password
            payload.setdefault("yt0", "")

            response = session.post(
                form_action,
                data=payload,
                headers={"Referer": login_page.url},
                timeout=(5, 15),
                allow_redirects=True,
            )
            if urlparse(response.url).hostname != "coet.etlab.in":
                return "unavailable", None
            response_soup = BeautifulSoup(response.text, "html.parser")
            if response.status_code == 401 or is_login_page(response_soup, response.url):
                return "invalid_credentials", None
            if response.status_code >= 400:
                return "unavailable", None

            profile = session.get(PROFILE_URL, timeout=(5, 15), allow_redirects=True)
            if urlparse(profile.url).hostname != "coet.etlab.in":
                return "unavailable", None
            profile_soup = BeautifulSoup(profile.text, "html.parser")
            if profile.status_code == 401 or is_login_page(profile_soup, profile.url):
                return "invalid_credentials", None
            if profile.status_code >= 400:
                return "unavailable", None

            name = profile_value(profile_soup, {"Name"})
            registration_number = profile_value(profile_soup, {
                "University Reg No",
                "University Registration No",
                "University Registration Number",
            })
            if not name or len(name) > 150 or not registration_number:
                return "profile_unavailable", None

            # Only read the student's own contact table; the profile also has
            # separate parent/family contacts that must not be mixed in.
            student_contact_table = profile_table_with_labels(profile_soup, {"Student Mobile No"})
            student_email = profile_email_near_label(student_contact_table, "Student Mobile No", {
                "Email", "E-mail", "Email Id", "Student Email", "Student Email Id", "College Email Id",
            })
            if not student_email:
                college_email_table = profile_table_with_labels(profile_soup, {"College Email Id"})
                student_email = profile_value(college_email_table, {"College Email Id"})
                match = EMAIL_PATTERN.search(student_email)
                student_email = match.group(0) if match else ""
            student_mobile = profile_value(student_contact_table, {"Student Mobile No"})
            department = profile_value(profile_soup, {"Department"})

            return "verified", {
                "name": name,
                "registration_number": normalize_registration_number(registration_number),
                "email": student_email[:254],
                "phone": student_mobile[:32],
                "department": department[:150],
            }
        except requests.RequestException:
            return "unavailable", None


@app.get("/api/status")
def status():
    return jsonify({"status": "ok", "institution": "COET"})


@app.post("/api/verify")
def verify():
    expected_key = os.environ.get("ETLAB_VERIFIER_SHARED_SECRET", "")
    provided_key = request.headers.get("X-APMS-Verification-Key", "")
    if len(expected_key) < 32:
        return jsonify({"error": "verifier_not_configured"}), 503
    if not provided_key or not compare_digest(provided_key, expected_key):
        return jsonify({"error": "unauthorized"}), 401

    body = request.get_json(silent=True)
    if not isinstance(body, dict):
        return jsonify({"error": "invalid_request"}), 400
    username = body.get("username")
    password = body.get("password")
    registration_number = body.get("registrationNo")
    if (
        not isinstance(username, str) or not username.strip() or len(username) > 100
        or not isinstance(password, str) or not password or len(password) > 256
        or (
            registration_number is not None
            and (
                not isinstance(registration_number, str)
                or not registration_number.strip()
                or len(registration_number) > 64
            )
        )
    ):
        return jsonify({"error": "invalid_request"}), 400

    client_ip = request.remote_addr or "unknown"
    if not allow_attempt(client_ip):
        return jsonify({"error": "rate_limited"}), 429

    result, identity = login_and_read_identity(username.strip(), password)
    if result == "invalid_credentials":
        return jsonify({"error": "invalid_credentials"}), 401
    if result == "profile_unavailable":
        return jsonify({"error": "profile_unavailable"}), 502
    if result != "verified" or not identity:
        return jsonify({"error": "upstream_unavailable"}), 502
    if registration_number and identity["registration_number"] != normalize_registration_number(registration_number):
        return jsonify({"error": "registration_mismatch"}), 403

    return jsonify({
        "verified": True,
        "name": identity["name"],
        "registrationNo": identity["registration_number"],
        "email": identity.get("email", ""),
        "phone": identity.get("phone", ""),
        "department": identity.get("department", ""),
    })


@app.errorhandler(413)
def request_too_large(_error):
    return jsonify({"error": "invalid_request"}), 413


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", "10000")))
