
# Canvas Course QA Tool

This web application allows users to upload an IMSCC 1.1 (Canvas course export) archive and automatically performs a series of quality checks on the course content. It is designed to help instructional designers, accessibility specialists, and educators review Canvas courses for common issues before import or publication.


## What does this app do?

- **Upload IMSCC Files:** Users can upload a Canvas course export file (`.imscc` or `.zip`).
- **Course Structure Analysis:** The app inventories modules, pages, assignments, quizzes, discussions, and other resources in the course.
- **Resource Extraction:** It identifies and lists links, file attachments, and embedded videos within course content.
- **Accessibility Checking:** The app runs automated accessibility checks (using axe-core) on course pages and resources, reporting violations, passes, and items to review.
- **Results Dashboard:** Results are displayed in organized tabs, including course structure, resources, links, attachments, videos, and accessibility findings.
- **Exportable CSV Reports:** Users can export the results of quality checks and accessibility findings as CSV files for further analysis or record-keeping.
- **Quick Review:** Users can quickly see which resources may need attention for accessibility or content issues before importing into Canvas.

---

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
