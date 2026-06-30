# Connecting Google Calendar — Setup Guide

This makes the "Connect Google Calendar" button on the expert panel actually work:
an expert links their Google account, their busy times can block availability, and
new bookings get written to their calendar.

You do this setup **once**. After that, every expert can connect with one tap.

There are four parts:

1. Create Google credentials
2. Put those credentials into Supabase
3. Deploy the backend functions
4. Run the database step

Everything the app needs is already in your project (apply54 added it). This guide is
only the things that have to happen outside the app.

Your Supabase project ref is **`xpjtyjjbgvemwwpnxtad`**, so your functions base URL is:

```
https://xpjtyjjbgvemwwpnxtad.supabase.co/functions/v1
```

and your OAuth callback URL (you'll need this in Google) is:

```
https://xpjtyjjbgvemwwpnxtad.supabase.co/functions/v1/calendar-oauth-callback
```

---

## Part 1 — Create Google credentials

1. Go to **https://console.cloud.google.com** and sign in with the Google account you
   want to own this (your business Google account is ideal).
2. Top-left, click the project dropdown → **New Project**. Name it something like
   `The Intend`. Create it, then make sure it's selected.
3. In the search bar, search **"Google Calendar API"**, open it, and click **Enable**.
4. In the left menu, go to **APIs & Services → OAuth consent screen**.
   - User type: **External**. Click Create.
   - App name: `The Intend`. User support email: your email. Developer contact: your email.
   - Save and continue through the Scopes screen (you don't have to add scopes here).
   - On **Test users**, click **Add users** and add your own Gmail and any expert emails
     you'll test with. (Until the app is "verified" by Google — see the note at the end —
     only these test users can connect.)
   - Save.
5. Left menu → **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
   - Application type: **Web application**.
   - Name: `The Intend backend`.
   - Under **Authorized redirect URIs**, click **Add URI** and paste exactly:
     ```
     https://xpjtyjjbgvemwwpnxtad.supabase.co/functions/v1/calendar-oauth-callback
     ```
   - Click **Create**.
6. A box pops up with **Client ID** and **Client secret**. Copy both somewhere safe.
   You'll paste them into Supabase in Part 2.

---

## Part 2 — Put the credentials into Supabase

This stores your Google secret on the server so it never lives in the app.

You need the **Supabase CLI**. If you don't have it:

- Mac (with Homebrew):
  ```
  brew install supabase/tap/supabase
  ```
- Or see https://supabase.com/docs/guides/cli for other options.

Then, in your project folder (`Theintend`), link the CLI to your project once:

```
supabase login
supabase link --project-ref xpjtyjjbgvemwwpnxtad
```

(`supabase login` opens a browser to authorize; `link` may ask for your database password,
which is in your Supabase dashboard under Project Settings → Database.)

Now set the secrets (replace the two values with what you copied from Google):

```
supabase secrets set GOOGLE_CLIENT_ID="PASTE_CLIENT_ID_HERE"
supabase secrets set GOOGLE_CLIENT_SECRET="PASTE_CLIENT_SECRET_HERE"
supabase secrets set GOOGLE_REDIRECT_URI="https://xpjtyjjbgvemwwpnxtad.supabase.co/functions/v1/calendar-oauth-callback"
```

(`SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are provided to your
functions automatically — you don't set those.)

---

## Part 3 — Deploy the backend functions

From the `Theintend` folder, deploy the five functions. The callback one must be public
(Google calls it directly, with no login), so it gets `--no-verify-jwt`:

```
supabase functions deploy calendar-connect-start
supabase functions deploy calendar-oauth-callback --no-verify-jwt
supabase functions deploy calendar-busy
supabase functions deploy calendar-create-event
supabase functions deploy calendar-disconnect
```

Each one should print a success line. If `deploy` complains it can't find the function,
make sure you're running it from the `Theintend` folder (the one that has a `supabase`
folder inside it).

---

## Part 4 — Run the database step

In the Supabase dashboard → **SQL Editor → New query**, paste the contents of
`supabase/calendar_schema.sql` (it's in your project) and click **Run**. This creates the
table that stores each expert's calendar connection and a safe status check the app uses.

(You can also open that file in your editor and copy it from there — it's the same thing.)

---

## You're done — test it

1. In the app, restart cleanly: `npx expo start -c --port 8081`, reopen Expo Go, scan the QR.
2. Sign in as an expert (or your admin) whose email you added as a **Test user** in Part 1,
   and whose email is linked to an expert profile.
3. Open the expert panel. Under **Calendar**, tap **Connect**.
4. A Google sign-in opens. Choose the account, approve the calendar permission.
5. It returns to the app and the row now says **Connected · your@email**.

After that, the busy-time blocking and writing bookings to the calendar use the same
connection automatically.

---

## Two things worth knowing

**Test users vs. verification.** While your Google OAuth screen is in "testing", only the
emails you added as Test users can connect, and they'll see an "unverified app" warning they
can click past. That's fine for you and a few experts. To let *any* expert connect without
that warning, you submit the app for **Google verification** (OAuth consent screen →
Publishing status → Publish / Prepare for verification). Because this touches calendar data,
verification can take from a few days to a few weeks and Google may ask for a privacy policy
URL and a short demo video. Plan for that before a wide launch; it doesn't block you testing now.

**Apple Calendar.** Apple doesn't offer the same kind of API for third-party calendar sync,
so "connect your Apple calendar" isn't directly possible the way Google is. The common
workaround is that people subscribe to a calendar feed (the app produces an `.ics` link).
If you want that later, it's a separate, smaller piece I can build.

---

## If something doesn't work

- **Button does nothing / error in the app**: the functions probably aren't deployed yet, or
  the secrets aren't set. Re-check Parts 2 and 3.
- **Google says "redirect_uri_mismatch"**: the redirect URI in Google (Part 1, step 5) must
  match `GOOGLE_REDIRECT_URI` exactly, including `https://` and no trailing slash.
- **"Access blocked / app not verified"**: you're not on the Test users list, or you need to
  click "Advanced → go to The Intend (unsafe)" while still in testing. Add the email as a
  test user.
- **Connected but busy times don't block**: that's expected until we wire the availability
  screen to read busy times — tell me and I'll connect that next.
