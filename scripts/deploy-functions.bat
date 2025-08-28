@echo off
REM Windows batch script for Supabase setup
echo Smart CRM Supabase Setup Script for Windows
echo ==========================================

REM Check if npm is available
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Error: npm not found. Please install Node.js first.
    pause
    exit /b 1
)

REM Install Supabase CLI if not present
echo Checking Supabase CLI...
npx supabase --version >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Installing Supabase CLI...
    npm install -g supabase
)

echo.
set /p PROJECT_REF="Enter your Supabase project reference ID: "

if "%PROJECT_REF%"=="" (
    echo Error: Project reference is required
    pause
    exit /b 1
)

echo.
echo Choose your AI provider:
echo 1. OpenAI only
echo 2. Gemini only
echo 3. Both OpenAI and Gemini (recommended)
set /p PROVIDER_CHOICE="Enter choice (1, 2, or 3): "

if "%PROVIDER_CHOICE%"=="1" (
    set /p OPENAI_KEY="Enter your OpenAI API key (starts with sk-): "
    if "!OPENAI_KEY!"=="" (
        echo Error: OpenAI API key is required
        pause
        exit /b 1
    )
    echo Setting OpenAI API key...
    npx supabase secrets set OPENAI_API_KEY=%OPENAI_KEY% --project-ref %PROJECT_REF%
) else if "%PROVIDER_CHOICE%"=="2" (
    set /p GEMINI_KEY="Enter your Gemini API key: "
    if "!GEMINI_KEY!"=="" (
        echo Error: Gemini API key is required
        pause
        exit /b 1
    )
    echo Setting Gemini API key...
    npx supabase secrets set GEMINI_API_KEY=%GEMINI_KEY% --project-ref %PROJECT_REF%
) else if "%PROVIDER_CHOICE%"=="3" (
    set /p OPENAI_KEY="Enter your OpenAI API key (starts with sk-): "
    set /p GEMINI_KEY="Enter your Gemini API key: "
    if "!OPENAI_KEY!"=="" (
        echo Error: OpenAI API key is required
        pause
        exit /b 1
    )
    if "!GEMINI_KEY!"=="" (
        echo Error: Gemini API key is required
        pause
        exit /b 1
    )
    echo Setting both API keys...
    npx supabase secrets set OPENAI_API_KEY=%OPENAI_KEY% --project-ref %PROJECT_REF%
    npx supabase secrets set GEMINI_API_KEY=%GEMINI_KEY% --project-ref %PROJECT_REF%
) else (
    echo Error: Invalid choice
    pause
    exit /b 1
)

echo.
echo Linking to Supabase project...
npx supabase link --project-ref %PROJECT_REF%

echo.
echo Deploying Edge Functions...

REM Deploy each function
for %%f in (ai-enrichment smart-score smart-categorize smart-qualify smart-enrichment smart-bulk email-composer email-analyzer personalized-messages email-templates) do (
    echo Deploying %%f...
    npx supabase functions deploy %%f --project-ref %PROJECT_REF%
    if %ERRORLEVEL% EQU 0 (
        echo ✅ %%f deployed successfully
    ) else (
        echo ❌ Failed to deploy %%f
    )
)

echo.
echo Setup Complete!
echo ================
echo ✅ API keys configured
echo ✅ Edge Functions deployed
echo.
echo Next steps:
echo 1. Wait 2-3 minutes for functions to fully start
echo 2. Go back to your Bolt.new application
echo 3. Try using AI features - they should now work!
echo.
pause