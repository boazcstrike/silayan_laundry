# Project: Silayan Laundry Quick Image Generation

## Project Overview

This is a [Next.js](https://nextjs.org/) application built with [TypeScript](https://www.typescriptlang.org/) that serves as a "Laundry Item Counter". The main purpose of this application is to provide a user-friendly interface for counting various laundry items. The application allows users to increment and decrement the count of predefined laundry items, add custom items, and then generate a text file and an image with the counts.

The project is bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app) and uses [Tailwind CSS](https://tailwindcss.com/) for styling, with a design system built upon [Radix UI](https://www.radix-ui.com/) and `class-variance-authority`.

## Building and Running

To get started with the development environment, you need to have [Node.js](https://nodejs.org/) and [pnpm](https://pnpm.io/) installed.

1.  **Install dependencies:**
    ```bash
    pnpm install
    ```

2.  **Run the development server:**
    ```bash
    pnpm dev
    ```
    This will start the development server on [http://localhost:3000](http://localhost:3000).

3.  **Build for production:**
    ```bash
    pnpm build
    ```

4.  **Run in production mode:**
    ```bash
    pnpm start
    ```

5.  **Lint the code:**
    ```bash
    pnpm lint
    ```

## Development Conventions

*   **Styling:** The project uses [Tailwind CSS](https://tailwindcss.com/) for styling. Reusable components are created with `class-variance-authority` to define different variants and sizes. The `cn` utility function in `lib/utils.ts` is used to merge Tailwind CSS classes.
*   **Components:** Components are organized in the `components` directory. The `components/ui` directory is used for general-purpose UI components.
*   **Data:** The list of laundry items is stored in `app/assets/data/list.tsx`.
*   **Fonts:** The project uses the `Geist` font family from Vercel.
*   **Code Quality:** The project is configured with ESLint for code quality and consistency.

## TODO

*   The `README.md` mentions that a `public/signature.png` file is required. This file is not present in the project. It should be added.
*   The `generateTextFile` function in `app/page.tsx` has a commented-out section for downloading the file to the user's device. This could be implemented as a feature.
*   The `generateImage` function in `app/page.tsx` uses a hardcoded font (`32px Arial`). This could be customized or made more consistent with the rest of the application's styling.
