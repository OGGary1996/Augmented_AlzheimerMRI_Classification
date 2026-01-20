# Project Environment Setup Guide

This project uses Python's native `venv` module for dependency management. Please follow the steps below to set up your local development environment.

## 1. Prerequisites

Ensure you have Python installed on your system (Version **3.10** or higher is recommended).

## 2. Installation Steps

### Step 1: Create the Virtual Environment

Open your terminal (Terminal / CMD) in the project root directory and run the following command to create a virtual environment folder named `.venv`:

```bash
# macOS / Linux / Windows
python3 -m venv .venv
```

### Step 2: Activate the Virtual Environment
You must activate the environment before installing dependencies.
- **macOS / Linux:**
  ```bash
  source .venv/bin/activate
  ```
- **Windows (CMD):**
  ```cmd
  .venv\Scripts\activate.bat
  ```
- **Windows (PowerShell):**
  ```powershell
  .venv\Scripts\Activate.ps1
  ```
  
### Step 3: Install Dependencies
With the virtual environment activated, install the required dependencies using `pip`:

```bash
pip install -r requirements.txt
```
## 3. Maintenance requirements.txt
If you install a new library (e.g., pip install requests), you must update the dependency list so teammates can sync:
```bash
pip freeze > requirements.txt
```

## 4. Deactivating the Virtual Environment

When you are done working in the virtual environment, you can deactivate it by simply running:

```bash
deactivate
```
## 5. IDE setup (PyCharm example)
To ensure PyCharm recognizes the libraries and provides code completion:
1. Go to Settings (Windows/Linux) or Preferences (macOS) -> Project -> Python Interpreter.
2. Click Add Interpreter -> Local Interpreter.
3. Select Virtualenv Environment -> Check Existing.
4. Set the path to the python executable inside the .venv folder in this project:
- macOS/Linux: .../Project/.venv/bin/python
- Windows: ...\Project\.venv\Scripts\python.exe

## 6. Troubleshooting (Windows)
If you receive an error saying "running scripts is disabled on this system" when trying to activate:
1. Open PowerShell as Administrator.
2. Run the command:
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```
3. Try activating the environment again.