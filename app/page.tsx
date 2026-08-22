import { ResumeBuilder } from "./resume-builder";

export const metadata = {
  title: "Resume Studio — Chenghao Jiang",
  description: "Edit, preview, and export a polished academic resume.",
};

export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const rawTemplate = Array.isArray(params.template) ? params.template[0] : params.template;
  const rawPage = Array.isArray(params.page) ? params.page[0] : params.page;
  const template = rawTemplate === "Modern" || rawTemplate === "Compact" ? rawTemplate : "Scholar";
  const pageSize = rawPage === "a4" ? "a4" : "letter";
  return <ResumeBuilder initialTemplate={template} initialPageSize={pageSize} />;
}
