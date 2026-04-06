# TailAdmin Next.js - Free Next.js Tailwind Admin Dashboard Template

TailAdmin is a free and open-source admin dashboard template built on **Next.js and Tailwind CSS** providing developers with everything they need to create a feature-rich and data-driven: back-end, dashboard, or admin panel solution for any sort of web project.

With TailAdmin Next.js, you get access to all the necessary dashboard UI components, elements, and pages required to build a high-quality and complete dashboard or admin panel. Whether you're building a dashboard or admin panel for a complex web application or a simple website.

TailAdmin utilizes the powerful features of **Next.js 16** and common features of Next.js such as server-side rendering (SSR), static site generation (SSG), and seamless API route integration. Combined with the advancements of **React 19** and the robustness of **TypeScript**, TailAdmin is the perfect solution to help get your project up and running quickly.

## Overview

TailAdmin provides essential UI components and layouts for building feature-rich, data-driven admin dashboards and control panels. It's built on:

* Next.js 16.x
* React 19
* TypeScript
* Tailwind CSS V4

## Components

TailAdmin is a pre-designed starting point for building a web-based dashboard using Next.js and Tailwind CSS. The template includes:

* Sophisticated and accessible sidebar
* Data visualization components
* Profile management and custom 404 page
* Tables and Charts(Line and Bar)
* Authentication forms and input elements
* Alerts, Dropdowns, Modals, Buttons and more
* Can't forget Dark Mode 🕶️

All components are built with React and styled using Tailwind CSS for easy customization.

## Documentation Path for Agents

For AI agents and contributors, use this documentation route:

1. [Template Technical Index](docs/tailadmin-template-docs/index.md)
2. [Functional Specification](docs/specification.md)
3. [Architecture Rules](docs/architecture/routing.md)
4. [Business Rules](docs/architecture/business-rules.md)

Notes:

- The template technical source for components, patterns, integration, and structure is [docs/tailadmin-template-docs/index.md](docs/tailadmin-template-docs/index.md).
- The functional source of truth remains [docs/specification.md](docs/specification.md).

## Stack Foundation (Prepared)

The project is prepared with baseline infrastructure for:

- Prisma ORM + MariaDB
- NextAuth (`/api/auth/[...nextauth]`)
- Vitest unit/contract tests
- Playwright E2E smoke tests

Useful scripts:

- `npm run db:generate`
- `npm run db:migrate:dev`
- `npm run db:migrate:deploy`
- `npm run test:unit`
- `npm run test:e2e`
