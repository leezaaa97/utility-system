# Utility Management System - Setup Guide

A web-based Utility Management System with a frontend interface and a separate PHP backend connected to Microsoft SQL Server.

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **XAMPP** (or any local PHP environment)
- **Microsoft SQL Server** (Express or Standard Edition)
- **SQL Server Management Studio (SSMS)**
- **VS Code** with the **PHP Server** extension (by brapifa)

---

## 🗄️ Step 1: Database Setup

### Import the Database

1. Open **SQL Server Management Studio (SSMS)**
2. Create a new database named `utility_db`
3. Import the database using one of the following methods:

   **Option A: Using .sql file**
   - Navigate to `utility-system/utility_db Files/FinalWithSeedData.sql`
   - Open and execute the script in SSMS

   **Option B: Using .file**
   - Use the SQL Server Import/Export wizard to import `FinalDatabaseWithSeeds.file`

4. Verify that all tables (e.g., `customer`, `meter`, `users`) are populated with seed data

---

## ⚙️ Step 2: Configure Backend Connection

Update the database connection string to match your SQL Server environment.

1. Navigate to `utility-system/api/config/db_connect.php`
2. Modify the connection parameters:

```php
$serverName = "YOUR_SERVER_NAME"; // e.g., localhost\SQLEXPRESS
$connectionInfo = array(
    "Database" => "utility_db",
    "UID" => "your_user",
    "PWD" => "your_password"
);
```

---

## 🔌 Step 3: Install SQL Server Drivers for PHP

PHP requires specific drivers to communicate with Microsoft SQL Server.

### 3.1 Install Microsoft ODBC Driver

Ensure you have the [Microsoft ODBC Driver for SQL Server](https://docs.microsoft.com/en-us/sql/connect/odbc/download-odbc-driver-for-sql-server) installed on your Windows machine.

### 3.2 Determine PHP Specifications

Open your terminal and run these commands:

```bash
php -v                              # Check PHP version (e.g., 8.2)
php -i | findstr "Thread"           # Check Thread Safety (enabled/disabled)
php -i | findstr "Architecture"     # Check architecture (x64 or x86)
```

### 3.3 Download & Install Drivers

1. Based on your PHP specifications, download the compatible `php_pdo_sqlsrv` and `php_sqlsrv` DLL files from the [Microsoft PHP Drivers for SQL Server](https://docs.microsoft.com/en-us/sql/connect/php/download-drivers-php-sql-server) page

2. Copy the `.dll` files into your PHP extension folder:
   ```
   C:\xampp\php\ext
   ```

3. Open your `php.ini` file located at:
   ```
   C:\xampp\php\php.ini
   ```

4. Find the **Dynamic Extensions** section and add the following lines (adjust filenames to match your downloaded versions):

```ini
extension=php_sqlsrv_82_ts_x64.dll
extension=php_pdo_sqlsrv_82_ts_x64.dll
```

5. Save `php.ini` and restart your **XAMPP Apache** service

---

## 💻 Step 4: VS Code & PHP Server Configuration

### 4.1 Install PHP Server Extension

1. Open VS Code
2. Install the extension: **PHP Server** (by brapifa)

### 4.2 Configure PHP Path

1. Press `Ctrl + Shift + P`
2. Search for **"Preferences: Open User Settings (JSON)"**
3. Add the following configuration (adjust path if needed):

```json
{
    "phpserver.phpPath": "C:\\xampp\\php\\php.exe"
}
```

---

## 📁 Step 5: Project Structure & Execution

### Folder Structure

```
utility-system/
├── api/                    # PHP backend logic and database configurations
├── public/                 # Frontend HTML, CSS, and JS files
└── utility_db Files/       # Database scripts and snapshots
```

### Running the Project

1. Open the `utility-system` folder in VS Code
2. Right-click on `index.html` (the login page) in the `public` folder
3. Select **PHP Server: Serve project**
4. The application will open in your default browser

---

## 🛠️ Troubleshooting

### Unauthorized Error
- **Solution**: Ensure you login through the `index.html` page to establish a session

### Connection Failed
- **Check**: SQL Server Browser service is running
- **Verify**: TCP/IP is enabled in SQL Server Configuration Manager
- **Confirm**: Database credentials in `db_connect.php` are correct

### Driver Not Found
- **Verify**: The DLL filenames in `php.ini` match exactly what you downloaded
- **Check**: The DLL files are present in `C:\xampp\php\ext`
- **Restart**: Apache service after making changes to `php.ini`

---

## 📝 Default Login Credentials

Check your seed data in the `users` table for default login credentials.

---

