# Auth email templates

Supabase sends the sign-in emails (password reset and the like). Their templates live in the
Supabase dashboard under Authentication, Emails, Templates. The files here are the source of
record: when one changes, paste it into the matching template in the dashboard.

| File | Dashboard template | Subject |
|---|---|---|
| `reset-password.html` | Reset password | Reset your password |

## Why the reset link points at our site

The default template links straight to Supabase, and the link is used up the moment anything
opens it. Mail scanners (Microsoft 365 Safe Links, for example) open every link before the person
does, so the person then sees "This reset link has expired".

`reset-password.html` links to `/reset-password?token_hash=...` on the app instead. Opening that
page does nothing to the link. The app spends it only when the person saves a new password
(`src/pages/ResetPasswordPage.jsx`, `src/lib/resetLink.js`).

The link uses `{{ .SiteURL }}`, so the Site URL under Authentication, URL Configuration must be
the live address of the app.

Deploy the app before pasting the template. The page still accepts links from the old template,
so emails already sent keep working.
