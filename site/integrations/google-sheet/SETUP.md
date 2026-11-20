# Quote requests to a Google Sheet

Netlify Forms receives every quote and contact submission (with photos). A Netlify **outgoing webhook** then posts each verified submission to a small Google Apps Script, which adds a row to a Google Sheet. There is no email inbox involved.

Time needed: about 15 minutes. You need the Google account that should own the sheet, and access to the site in Netlify.

## 1. Create the sheet
1. Go to <https://sheets.google.com> and create a blank spreadsheet. Name it `RNC quote requests`.
2. Rename the first tab to `Quotes` (the script also creates it if missing). The header row is added automatically on the first submission.

## 2. Add the script
1. In the sheet, open **Extensions > Apps Script**.
2. Delete the sample code, paste the full contents of `Code.gs`, and click **Save**.
3. Open **Project Settings** (gear icon) > **Script properties** > **Add script property**:
   - Property: `WEBHOOK_SECRET`
   - Value: a long random string (for example from a password manager, 32+ letters and numbers, no spaces or symbols). Keep it somewhere safe; this is the `SECRET` below.

## 3. Deploy it as a web app
1. Click **Deploy > New deployment**, choose type **Web app**.
2. Description: `Quote webhook`. **Execute as:** Me. **Who has access:** Anyone.
   ("Anyone" is needed because Netlify cannot sign in to Google. The secret key protects it.)
3. Click **Deploy**, approve the permissions prompt (Google warns that the app is unverified because you wrote it: choose Advanced > Go to project).
4. Copy the **Web app URL** (ends in `/exec`). This is `[SHEET WEBHOOK URL]`.
5. Optional check: open that URL in a browser. You should see `{"ok":true,...}`.

## 4. Connect Netlify
1. In Netlify: **Site configuration > Forms**. Make sure **form detection** is enabled, then redeploy once so the `quote` and `contact` forms appear.
2. Go to **Forms > Form notifications > Add notification > Outgoing webhook**.
3. Event: **New form submission**. Form: `quote`.
4. URL to notify: `[SHEET WEBHOOK URL]?key=SECRET` (replace `SECRET` with the value from step 2.3).
5. Save. Repeat for the `contact` form with the same URL.

## 5. Test
1. Submit the quote form on the live site with real-looking text and an email you own (test text like "asdf" is often marked as spam).
2. A new row should appear within a minute. Photo columns contain Netlify file links.
3. Nothing arrived? Check **Netlify > Forms > (form) > Spam submissions** first (spam is never forwarded), then **Apps Script > Executions** for errors.

## Notes
- If you change `Code.gs`, use **Deploy > Manage deployments > Edit > New version**, so the URL stays the same.
- Apps Script cannot read request headers, so the secret travels in the URL. Do not share the full webhook URL; if it leaks, change `WEBHOOK_SECRET` and update the Netlify notification.
- Photo links point to Netlify's file storage and require access to the Netlify site. Netlify limits each request to 8 MB and uploads time out after 30 seconds, which is why the form caps photos at 3 files, 5 MB each and 7.5 MB total.
- Submissions also stay in Netlify (Forms tab) and can be exported as CSV. Export and delete old ones regularly; they contain personal information.
