# Student Management System for Schools Desktop

**The Windows desktop edition for running Crownix Student Management System locally.**

Student Management System for Schools Desktop packages the existing Next.js student management application inside an Electron desktop application. It is designed for schools that want to run the system on one computer or make it available to several computers over their local network.

> **This desktop application is a wrapper around the web version. It is not a separate student management system or a second implementation of its features.**

The web repository remains the source of truth for the student-management interface, business logic, server-side operations, authentication implementation, Prisma schema, and database migrations. This repository provides the Electron shell, local server management, persistent storage configuration, and Windows distribution.

## Relationship to the web version

The two repositories have different responsibilities:

| Repository | Responsibility |
|---|---|
| **Student Management System for Schools** | The actual Next.js application: pages, student-management features, server-side logic, authentication, Prisma data model, and migrations. It is the edition intended for cloud deployment and domain-based browser access. |
| **Student Management System for Schools Desktop** | The Electron wrapper: desktop windows, bundled Node.js runtime, local Next.js process management, local configuration, database and backup management, recovery, and Windows packaging. |

The desktop build includes a production standalone build of the web application. It starts that application as a local Node.js server and displays it in an Electron window in Client mode. It does not recreate the Next.js pages in a separate React application or replace Next.js Server Actions with Electron IPC.

Changes to student-management functionality should be made in the **web application repository**. The desktop repository is updated when its Electron shell, local-management features, packaging, or bundled version of the web application needs to change.

## When to use the desktop edition

Use this edition when the school wants the system to operate on its own equipment rather than deploy the pure Next.js application as a cloud-hosted website.

The desktop edition supports two local operating modes. Both modes run the Next.js application on the computer where the desktop software is installed.

### Client mode — single-computer use

- Starts the packaged Next.js application locally on the same computer.
- Opens the Student Management System inside an Electron application window.
- Uses the database configured for that computer.
- Provides access to the Server Manager through the application menu.

### Server mode — shared local-network use

- Starts the packaged Next.js application on a central school computer.
- Makes the application available on the computer's local network.
- Opens the Electron Server Manager as the primary desktop window.
- Allows other computers on the same LAN to access the system through an ordinary web browser.
- Keeps the SQLite database on the central server computer. Other computers communicate with the application over HTTP.
- Provides a menu option to open the system locally on the server computer when needed.

The distinction is important: **Client mode means a local single-computer installation, while Server mode means a local server installation that can serve multiple browser users over the LAN.** This desktop application is not a lightweight remote client for connecting to a separately installed server.

## Desktop and server-management features

### Local application hosting

- Runs the production Next.js standalone server using a bundled Node.js runtime.
- Does not require the customer to install Node.js, pnpm, or the development toolchain separately.
- Starts the server with the configured mode, port, and database connection settings.
- Waits for the application health endpoint before opening the system window in Client mode.

### Server management

- Start, stop, and restart the local Next.js server.
- Display server status and application availability.
- Display the local URL in Client mode and usable LAN addresses in Server mode.
- Stream Next.js and management-process output into the Server Manager logs.
- Prevent multiple instances of the desktop application from being opened.
- Handle unexpected server-process exits with controlled recovery attempts.
- Shut down the Next.js process in a controlled manner when the desktop application exits.
- Keep the Server Manager available in both modes.

### Configuration and storage

- Persist application settings outside the installation directory.
- Configure the operating mode and server port.
- Select the database location independently from the backup location.
- Keep the database and backups outside the application installation directory so application updates do not replace them.
- Allow the user to locate an existing SQLite database or choose a location for a new one.

### Database management and recovery

- Check database availability before starting the Next.js server.
- Validate selected SQLite database files.
- Offer recovery options when the configured database is missing and a backup is available.
- Run packaged Prisma migrations against the configured database before starting the application.
- Preserve the existing database when a migration or startup operation fails.

### Backups

- Create manual database backups.
- Create an automatic backup on server startup when no regular backup exists for the current day.
- Keep a configurable number of recent backups (five by default).
- Record and display the last successful regular backup time.
- Use database-aware snapshot handling rather than copying a live SQLite database file directly.

### Updates

- Let the user manually check GitHub Releases for a newer stable version.
- Display the available version and release notes.
- Open the release page so the user can review and download the installer.
- Do not download updates automatically or interrupt normal system use with an automatic update process.
- Use the new installer to replace application files while keeping configuration, database, and backup data in their separate persistent locations.
- Apply pending Prisma migrations when the updated application next starts.

## Local operation and networking

The desktop edition is designed for local use. It does not require a cloud service or a permanent internet connection for ordinary student-management operations after installation.

In Client mode, the system is available on the same computer through its Electron window. In Server mode, other computers on the school's LAN access the server through a browser using the server computer's network address and configured port. The default port is **3223**, and the Windows firewall and local network must permit the required connection.

Internet access is needed for optional activities such as checking GitHub Releases or downloading a new installer. It is not required for normal local database operations when the application and its dependencies are installed.

## Authentication and local configuration

The underlying Next.js application contains the authentication implementation used by the web edition. The desktop distribution runs that same application with configuration appropriate for local operation. Some security settings used for domain-based HTTPS deployments may be adjusted or disabled for local HTTP access; this local configuration should not be treated as the production security configuration for a public cloud deployment.

The desktop edition is intended for the school's local environment. Protect the server computer, Windows accounts, database directory, backup directory, and LAN access appropriately. Computers connecting in Server mode use their browsers to access the application; they do not need the Electron desktop application installed.

## Installation and data locations

The Windows installer installs the desktop application and its bundled resources. Persistent data is stored separately from the application installation:

- **Application files:** the selected Windows installation directory.
- **Application configuration:** the stable Electron user-data directory under the Windows user profile.
- **Database:** the configured database location, which can be selected by the user.
- **Backups:** the separately configured backup directory.

The application must not store its live database, backups, or configuration inside the installation directory. This separation allows a new application version to replace the installed program files without intentionally replacing school data.

The actual database and backup paths are managed by the application configuration and shown in the Server Manager.

## Technology

| Area | Technology |
|---|---|
| Desktop shell | Electron |
| Desktop development/build | electron-vite |
| Windows installer and packaging | electron-builder with NSIS |
| Local application server | Bundled Node.js runtime running Next.js standalone output |
| Web application | Next.js (maintained in the companion web repository) |
| Database | SQLite |
| Database access and migrations | Prisma ORM and packaged Prisma CLI |

## Development

This repository contains the Electron shell, not the source code for the Next.js student-management interface. The web application is maintained in its own repository and is packaged into this desktop application as a production standalone build.

Typical desktop-shell setup:

1. Install a Node.js version supported by the Electron/Vite toolchain and install pnpm.
2. Clone this repository.
3. Install dependencies with `pnpm install`.
4. Prepare the `resources` directory with the matching production Next.js standalone build, portable Node.js runtime (v24 LTS), and Prisma migration bundle.
5. Start the Electron development environment with `pnpm dev`.

The expected external resource layout is:

```text
resources/
├── runtime/
│   └── node.exe
├── server/
│   ├── server.js
│   ├── .next/
│   ├── public/
│   └── node_modules/
└── prisma/
    ├── schema.prisma
    ├── prisma.config.ts
    ├── migrations/
    └── node_modules/
```

The resource directories are bundled separately from the Electron application archive. Keep the Node.js runtime, Next.js standalone output, Prisma CLI dependencies, schema, and migration files compatible with the web application's release.

## Building for Windows

The project uses electron-vite to build the Electron main, preload, and renderer code, and electron-builder with the NSIS target to create the Windows installer.

- `pnpm run build` builds and type-checks the Electron application.
- `pnpm run build:win:dir` creates an unpacked Windows application for testing.
- `pnpm run build:win` creates the Windows NSIS installer.

Before packaging a release, verify that all required files are present under `resources/runtime`, `resources/server`, and `resources/prisma`, and test the unpacked application. A successful Electron build alone does not verify that the external Next.js and Prisma resources are complete.

## Updating and database compatibility

Desktop application updates replace application files, not the school's persistent data. Keep the application identity and persistent data locations stable between releases.

When a new desktop release contains Prisma migrations, the updated application applies pending migrations during startup before launching Next.js.

Users check for updates from the Server Manager and choose whether to visit the GitHub release page and install a newer version. Updates are not downloaded or installed automatically.

## Project scope

The desktop application adds a locally managed desktop and LAN deployment option to the web version. It does not add a second implementation of student records, marks, rankings, or Excel exports.

The initial project proposal was prepared by **Crownix** for **Lumbini College, Colombo 5**, dated **4 October 2026**, and focused on A/L student records, selected subjects, examination marks, results, rankings, and Excel exports. The broader web application feature set is intended for school use across Grades 6–13.

The initial proposal excludes replacing official paper records, attendance, timetables, student/parent portals, mobile applications, and multiple role-based permission levels.

# Crownix - Where Elegance Meets Logic