# "Jenkins" AI Scribe - Internal AHS Version

TODO: Project description.

## Prerequisites

- Docker and Docker Compose (both are available as part of [Docker Desktop](https://www.docker.com/products/docker-desktop/))
- [Node.js](https://nodejs.org/en) 20+ (for local development)
- [Python 3.11](https://www.python.org/downloads/) (for local development)
- [FFmpeg](https://www.ffmpeg.org/download.html) (for local development)
- Snowflake account
- OpenAI API Key

**Note:** FFmpeg is used for certain audio processing features, such as normalizing file sizes before transcribing audio tracks. It is installed automatically as part of the Docker build, but must be set up and configured independently when running the app in a local development environment.  On certain platforms (such as Windows), the install process is not as simple as with other software.  Please reach out for assistance if needed.

## Setup

The following steps assume you are using [Visual Studio Code](https://code.visualstudio.com/) with the [Python extension](https://code.visualstudio.com/docs/languages/python) installed.

1. Clone the repository:

    Using VS Code, <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd> and select **Git: Clone**.

2. In the `backend` folder, copy the `env.example` file to `.env` and fill in the required environment variables.

3. In the `frontend` folder, copy the `env.local.example` file to `.env.local` and fill in the required environment variables.

### Configure Local Development Environment

**Note:** These steps are not required to run the app locally using Docker.

#### Python Setup

3. (Optional) Configure pycache directory for local development.

    This only needs to be done once in an environment and applies to all Python projects.
    
    By default, `__pycache__` folders will be created within every module directory in the project when a Python app is run, which can clutter the file navigation during development.  This will collect all the compiled code into a root `.dev-pycache` folder instead.

    To do this, set the PYTHONPYCACHEPREFIX environment variable on your account.  For example, on Windows you can use the following command on the console:

    ```console
    setx PYTHONPYCACHEPREFIX .dev-pycache
    ```

    Note that you must restart the VS Code process for it to pick up the new environment variable.  This means closing *all* VS Code windows before reopening.

4. Create a Python virtual environment:

    Using VS Code, <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd> and select **Python: Select Interpreter** and then **Create Virtual Environment...** and follow the directions, ensuring you select Python 3.11 if more than one version is installed in your environment.

5. Install Python packages:

    Press <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>\`</kbd> to open a new terminal. The prompt should now be prefixed with `(.venv)` indicating it is using the virtual environment created in Step 3.

    Install the required packages using the following command:

    ```console
    pip install -r requirements.txt
    ```

#### Node & NextUI Setup

6. Install the NextUI CLI:

    ```console
    npm install -g nextui-cli
    ```

7. Navigate to the `frontend/` folder and install the required Node packages:

    ```console
    cd frontend
    npm install
    ```

8. If opening the entire project as a monorepo in VSCode (rather than opening only the frontend or backend folders in separate workspaces), refer to the advice here for configuring ESLint settings in VSCode: https://www.codalas.com/en/2311/configuring-vscode-for-subfolder-projects-to-ensure-correct-eslint-operation.

## Local Development

With either of the following options, the app can be accessed at the following addresses:

- **App**: http://localhost:3000
- **API Docs** (depending on preference)
    - Swagger: http://localhost:8000/docs
    - ReDoc: http://localhost:8000/redoc 

### Option 1: Run Locally Using Docker

Open a terminal window and run the following command:

```console
docker compose up
```

To rebuild the images after making changes to the code:

```console
docker compose up --build
```

### Option 2: Run the App in a Local Development Environment

1. Open a terminal with <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>\`</kbd>.

2. Start the backend.

    ```console
    cd backend
    uvicorn app.main:app --reload
    ```

3. Open a second terminal with <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>5</kbd>.

4. Start the frontend.

    ```console
    cd frontend
    npm run dev
    ```

## Deployment

In a Snowflake SQL worksheet:

1. Create a SECRET to hold the OpenAI API Key:

    ```sql
    CREATE SECRET openai_api_key
        TYPE = GENERIC_STRING
        SECRET_STRING = '<your_api_key>';
    ```

2. Create an IMAGE REPOSITORY:

    ```sql
    CREATE IMAGE REPOSITORY IF NOT EXISTS jenkins_app;
    SHOW IMAGE REPOSITORIES;
    ```
    Record the name of the `repository_url` field.

In your VS Code terminal:

3. Run the app using Docker Compose to build the required images:

    ```console
    docker compose up --build
    ```

3. Tag the Docker images with the repository URL:

    ```console
    docker tag jenkins-ahs-backend:latest <repository_url>/backend:latest
    docker tag jenkins-ahs-frontend:latest <repository_url>/frontend:latest
    ```

4. Authenticate docker to Snowflake:

    ```console
    docker login <registry_hostname> -u <username>
    ```

    Enter your password when prompted.
    The `registry_hostname` is the `repository_url` up to "snowflake.computing.com"

5. Push the images to the Snowflake repository:

    ```console
    docker push <repository_url>/backend:latest
    docker push <repository_url>/frontend:latest
    ```

In your Snowflake SQL worksheet:

6. Ensure the COMPUTE POOL is running and execute the following to create the service:

    ```sql
    CREATE SERVICE jenkins_app
    IN COMPUTE POOL CPU_X64_XS
    EXTERNAL_ACCESS_INTEGRATIONS = (OPENAI_API_EXT_INT)
    FROM SPECIFICATION $$
      spec:
        containers:
        - name: backend
          image: <repository_url>/backend:latest
          readinessProbe:
            port: 8000
            path: /healthcheck
          secrets:
          - snowflakeSecret: <db_name>.<schema_name>.openai_api_key
            secretKeyRef: secret_string
            envVarName: OPENAI_API_KEY
        - name: frontend
          image: <repository_url>/frontend:latest
          readinessProbe:
            port: 3000
            path: /healthcheck
          env:
            APP_API_URL: http://localhost:8000/api
        endpoints:
        - name: api
          port: 8000
          public: true
        - name: app
          port: 3000
          public: true
    $$;
    ```

7. Wait for the service to boot up and navigate to the site:

    The status and logs of the service can be queried with the following commands:

    ```sql
    SELECT SYSTEM$GET_SERVICE_STATUS('jenkins_app');
    SELECT SYSTEM$GET_SERVICE_LOGS('jenkins_app', 0, 'backend');
    SELECT SYSTEM$GET_SERVICE_LOGS('jenkins_app', 0, 'frontend');
    ```

    The endpoints take some time to provision, their status and final addressed can be queried with the following command:

    ```sql
    SHOW ENDPOINTS IN SERVICE jenkins_app;
    ```

## Testing
### Dr. Weldon minimally viable test script

1. Recording 
   - 10sec recording
   - Pause, stop, reset functions
   - Active recording notification
2. Basic Transcription/Summarization
   - 1-2min recording
   - Latency in transcription 
   - Latency in note generation (from pushing "submit" <10s ideal, <30sec good, <1min tolerable)
3. Full Summarization
   - 5+ minute recording, confirm latency numbers at AHS facility
   - Check all note types for continuity and quality
   - Format of notes is useable in copy/paste with no editing
   - Copy button working
4. Live Testing
   - Try on shift (when approved)
5. Other
   - Authentication
   - Multiple concurrent users
