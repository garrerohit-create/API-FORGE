# API FORGE — College Demonstration Guide (5–10 Minutes)

This step-by-step workflow is designed for conducting an impressive, smooth 5-to-10 minute project evaluation presentation.

---

## Pre-Demo Setup (1 Minute)

1. Open a terminal in the project root:
   ```bash
   npm run build
   npm start
   ```
2. Open your web browser and navigate to:
   ```
   http://127.0.0.1:5000
   ```
3. Show that the backend status pill in the top-right corner indicates **ONLINE** in green.

---

## Demo Step 1: Engineering Dashboard & Visual Telemetry (1.5 Minutes)

1. Point out the **Dashboard** overview cards: Total Requests, Success Rate, Average Response Time, and Test Pass Rate.
2. Explain to the evaluator:
   > *"All metrics displayed here are derived directly from actual SQLite execution logs and monotonic millisecond timers—there are zero hardcoded or simulated statistics."*
3. Show the **Activity Timeline** and **Status Breakdown** charts powered by Recharts.
4. Demonstrate theme switching by clicking the **Sun/Moon** icon in the top navigation bar to showcase the carefully designed Dark and Light engineering themes.

---

## Demo Step 2: The API Client & Request Execution (2.5 Minutes)

1. Click on **API Client** in the left sidebar.
2. Notice the preconfigured tab with `GET http://127.0.0.1:5000/demo/v1/students`.
3. Click the purple **Send** button:
   - Point out the response: Status `200 OK`, response duration in milliseconds, and payload size in bytes.
   - Switch between **Pretty JSON**, **Raw**, and **Headers** tabs.
4. Show variable interpolation:
   - Change the URL to `{{base_url}}/demo/{{api_version}}/students/1`.
   - Click **Send**.
   - Show that the variable `{{base_url}}` was resolved to `http://127.0.0.1:5000` via the active environment.
5. Click the **Code Snippets** button (terminal icon) in the toolbar:
   - Switch between cURL, JavaScript Fetch, Node.js Axios, and Python Requests snippets to show code generation with masked secrets.

---

## Demo Step 3: Dynamic Mock Server with Non-Blocking Delay (2 Minutes)

1. Click on **Mock Server** in the left sidebar.
2. Point out the configured mock endpoints under `/mock/demo/...`.
3. Click the **Play** button on `/users`:
   - It opens in the API Client. Click **Send** to show the mock JSON response.
4. Back in Mock Server, click **Edit** on `/users`:
   - Change the response body to:
     ```json
     { "success": true, "message": "Live Demo Update!" }
     ```
   - Click **Save Changes**.
5. Re-run the request in API Client:
   - Show that the updated response is returned immediately without restarting the Node.js server!
6. Click the toggle switch next to the endpoint to disable it:
   - Send the request again to show it now returns `404 Not Found`. Re-enable it.

---

## Demo Step 4: Declarative Automated Testing & Assertions (1.5 Minutes)

1. Click on **Test Suites** in the left sidebar.
2. Select the **Core Platform Verification Suite**.
3. Click **Run Test Suite**:
   - Show the execution progress.
   - Point out the detailed assertion results: Status Code 200 (Passed), Response Time below 1000ms (Passed), Data is Array (Passed).
4. Explain to the evaluator:
   > *"Our assertion engine is purely declarative. It parses JSON paths and evaluates type-aware assertions without using unsafe eval() or Function() constructors."*

---

## Demo Step 5: Demonstration Student CRUD API & Persistence (1.5 Minutes)

1. Click on **Demo CRUD API** in the sidebar.
2. Point out the table showing persistent SQLite records for students.
3. Click **Add Student**:
   - Enter Name: `John Connor`, Email: `john.connor@university.edu`, Dept: `Computer Science`, Year: `2`.
   - Click **Enroll Student**. Show the record appear with a new primary key ID.
4. Try adding another student with the same email:
   - Show that the server returns a `409 Conflict` error because unique email constraints are enforced in SQLite.
5. Show the live search bar filtering students by name or department in real time.

---

## Conclusion & Viva Hand-off

Conclude by summarizing:
> *"API FORGE demonstrates complete full-stack Node.js development: real HTTP networking, native SQLite persistence in WAL mode, declarative testing, non-blocking asynchronous I/O, and robust SSRF security."*
