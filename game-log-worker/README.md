# Game Log setup: save entries to your Notion

The [Game Log](https://buddieh.com/game-log.html) works without any setup: write or dictate, then press **Copy as text**. Setup adds **Save to Notion**, which sends each entry straight into a Notion database of yours.

It takes about 15 minutes, once. Both Notion and Cloudflare are free for this.

```
Game Log page  ──passphrase──▶  your Cloudflare Worker  ──Notion token──▶  your Notion database
```

Why a Worker? Your Notion token is a key to your workspace, so it shouldn't sit in a web page. The Worker is a tiny program on Cloudflare that holds the token for you. The page only knows the Worker's address and a passphrase, and that passphrase can do one thing: add entries to one database.

You'll collect three things along the way. Keep them in a note until step 7:

| What | Looks like | From |
| --- | --- | --- |
| Notion token | `ntn_…` | step 1 |
| Database ID | 32 letters and digits | step 3 |
| Worker URL | `https://….workers.dev` | step 4 |

---

## Part A: Notion

### 1. Create a connection and copy its token
1. Go to **https://www.notion.so/profile/integrations** (Notion calls these "connections").
2. Click **New connection**.
   - **Connection name:** `Game Log`
   - **Authentication method:** **API token** (not OAuth)
   - Click **Create connection**. If asked, pick the workspace your database is in.
3. Under **Capabilities**, turn on **Read content** and **Insert content**. Nothing else is needed.
4. Find the **API token**, click **Show**, and copy it. It starts with `ntn_`.

### 2. Make a database for your games
Use an existing database, or create one: type `/database` on any Notion page and choose **Database – full page**.

Any database works. Each entry's game title goes into the title column, whatever that column is called. The rest of the entry goes in the page body.

### 3. Give the connection access and copy the database ID
1. Give **Game Log** access to the database, either way:
   - On the database page, click **•••** (top right) → **Connections** → **Game Log** → **Confirm**, **or**
   - On the connection's page from step 1, open the **Access** tab → **Edit access** → tick the database.
2. On the database page, click **•••** → **Copy link**. It looks like this:

   `https://app.notion.com/p/39b10e0ac11a807d80bed9029f2b7fac?v=39b10e0a…`

   (Older links start with `https://www.notion.so/yourname/…`.)
3. The **database ID** is the 32 characters between `/p/` (or the last `/`) and `?v=`. In the example that's `39b10e0ac11a807d80bed9029f2b7fac`. Copy all 32. If the ID is short by even one character, Notion rejects it.

---

## Part B: Cloudflare

### 4. Create the Worker
1. Sign up or log in at **https://dash.cloudflare.com**. The free plan is enough.
2. In the left menu, open **Compute (Workers)** → **Workers & Pages**. Older layouts call it just **Workers & Pages**.
3. Click **Create** → **Create Worker** (or **Start with Hello World!**).
   - The first time, Cloudflare asks you to pick a `workers.dev` subdomain. Any name is fine.
4. Name it, for example `game-log-relay`, and click **Deploy**.
5. Click **Edit code**. Delete everything in the editor.
6. Open [`worker.js`](https://github.com/Buddieh/Buddieh.github.io/blob/main/game-log-worker/worker.js), click the **Copy raw file** button (top right of the code), and paste it into the editor.
7. Click **Deploy**.
8. Copy the Worker's URL, shown near the top of the editor or on the Worker's page. It looks like `https://game-log-relay.yourname.workers.dev`.

### 5. Give the Worker your settings
1. Go back to the Worker's page → **Settings** → **Variables and Secrets** → **Add**.
2. Add these four. Type the names exactly, in capitals, and paste values **without quotes**:

| Type | Name | Value |
| --- | --- | --- |
| Secret | `NOTION_TOKEN` | the token from step 1 |
| Text | `NOTION_DB` | the 32-character database ID from step 3 |
| Secret | `PASSPHRASE` | make one up: four or more random words, e.g. `copper lantern rainy meadow` |
| Text | `ALLOWED_ORIGIN` | `https://buddieh.com` |

3. Click **Deploy** (or **Save and deploy**).
4. You can ignore a yellow box saying "Update your Wrangler configuration". It's only for people who deploy from the command line.

`ALLOWED_ORIGIN` is optional: the Worker defaults to `https://buddieh.com`. Change it only if you host the Game Log page somewhere else.

---

## Part C: The Game Log

### 6. Check the Worker is alive (optional)
Open your Worker URL in a browser tab. A page saying `{"message":"Origin not allowed."}` means it's running and only answers the Game Log. That's correct.

### 7. Connect
1. Open **https://buddieh.com/game-log.html** and click **⚙ Setup**.
2. **Relay URL:** your Worker URL from step 4.
3. **Passphrase:** the `PASSPHRASE` from step 5.
4. Click **Test connection**. You should see **"Connected! Notion can hear you."**
5. Click **Save settings**.
6. Write a test entry and press **Save to Notion →**. It should show up in your database.

Settings are kept in that browser only, so repeat step 7 on each phone or computer you use.

---

## When something goes wrong

| You see | It means | Fix |
| --- | --- | --- |
| Can't reach the relay | Wrong URL, or the Worker isn't deployed | Copy the URL again (step 4.8). Open it in a tab; you should get "Origin not allowed." |
| Wrong passphrase. | Doesn't match `PASSPHRASE` | Retype it, or set a new one in step 5 and deploy |
| Origin not allowed. | The page isn't on the address in `ALLOWED_ORIGIN` | Use https://buddieh.com/game-log.html, or fix `ALLOWED_ORIGIN` |
| The relay is missing NOTION_TOKEN, NOTION_DB or PASSPHRASE. | A variable is missing or misspelled | Check the names in step 5 exactly, then deploy |
| …should be a valid uuid… | `NOTION_DB` isn't a full 32-character ID | Copy the ID again (step 3); no quotes, nothing missing |
| Could not find database… | The connection has no access, or the ID is from another page | Redo step 3.1, then check the ID |
| API token is invalid | The token was mistyped or refreshed | Copy the current token (step 1.4) into `NOTION_TOKEN` and deploy |

If a save fails, your text stays on the page. Press **Copy as text** and paste it into Notion by hand.

## Changing things later
- **New passphrase:** edit `PASSPHRASE` in Cloudflare, deploy, then enter it in ⚙ Setup on each device.
- **Different database:** connect the new one to Game Log (step 3.1) and update `NOTION_DB`.
- **New token** (if it leaked, or you refreshed it in Notion): update `NOTION_TOKEN` and deploy. Nothing changes on the page.
